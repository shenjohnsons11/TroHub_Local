const Contract = require('../models/Contract');
const Room = require('../models/Room');
const Account = require('../models/Account');
const Invoice = require('../models/Invoice');
const Service = require('../models/Service');
const {
    buildDepositPayment,
    signContractAndEnsureDeposit,
} = require('../services/contractSigningService');
const {
    ContractTermsError,
    normalizeContractMeterTerms,
    resolveUtilityPriceDefaults,
    resolveInitialContractMeterTerms,
} = require('../services/contractTerms');
const {
    CheckoutError,
    checkoutContract: completeContractCheckout,
    getCheckoutPreview: loadCheckoutPreview,
} = require('../services/contractCheckoutService');
const { CalculationError } = require('../services/invoiceCalculator');

const { sendNotification } = require('../services/notificationService');
const { notifyLandlord } = require('../services/landlordNotificationService');
const { sendContractToNguoiThue } = require('../services/contractNotificationService');
const { canViewContract, canDownloadDocx } = require('../services/contractDocumentPolicy');
const {
    generateContractPdf,
    generateContractDocx,
    renderContractHtml,
    PDF_DOCUMENT_VERSION,
} = require('../services/contractGeneratorService');
const {
    CONTRACT_STATUS,
    classifyContractCreation,
    validateHandoverInput,
} = require('../services/contractLifecycle');
const fs = require('fs');
const path = require('path');

const contractsStorageDir = path.join(__dirname, '../../storage/contracts');

function contractFilePath(contractId, extension) {
    return path.join(contractsStorageDir, `hop-dong-${contractId}.${extension}`);
}

async function loadAuthorizedContract(req, res) {
    const contract = await Contract.findById(req.params.id)
        .populate('roomId', 'roomCode area landlordId')
        .populate('tenantId', 'fullName phone idCard email')
        .populate('services.serviceId', 'name unit type defaultPrice');
    if (!contract) {
        res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng!' });
        return null;
    }
    if (!canViewContract(contract, req.auth)) {
        res.status(403).json({ success: false, code: 'CONTRACT_FORBIDDEN', message: 'Bạn không có quyền xem hợp đồng này.' });
        return null;
    }
    return contract;
}

async function ensurePdf(contract) {
    const pdfFilePath = contractFilePath(contract._id, 'pdf');
    if (!fs.existsSync(pdfFilePath) || contract.pdfVersion !== PDF_DOCUMENT_VERSION) {
        await generateContractPdf(contract._id, contract.tenantSignature);
    }
    return pdfFilePath;
}

function sendContractError(res, error, fallbackMessage) {
    if (error instanceof ContractTermsError) {
        return res.status(error.status).json({
            success: false,
            code: error.code,
            field: error.field,
            message: error.message,
        });
    }

    return res.status(500).json({
        success: false,
        message: `${fallbackMessage}: ${error.message}`,
    });
}

// 1. Lấy danh sách toàn bộ hợp đồng (Chủ trọ xem trên Web)
exports.getAllContracts = async (req, res) => {
    try {
        let landlordId = req.auth?.role === 1 ? req.auth.id : null;
        let nguoiThueId = req.auth?.role === 2 ? req.auth.id : null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
                if (decoded.role === 1) landlordId = decoded.id;
                if (decoded.role === 2) nguoiThueId = decoded.id;
            } catch(e) {}
        }

        let query = {};
        if (landlordId) {
            const rooms = await Room.find({ landlordId }).select('_id');
            query.roomId = { $in: rooms.map(r => r._id) };
        } else if (nguoiThueId) {
            query = { tenantId: nguoiThueId };
        }

        const contracts = await Contract.find(query)
            .populate('roomId', 'roomCode area')
            .populate('tenantId', 'fullName phone')
            .populate('services.serviceId', 'name unit type defaultPrice')
            .sort({ createdAt: -1 });

        const responseContracts = nguoiThueId
            ? await Promise.all(contracts.map(async (contract) => ({
                ...contract.toObject(),
                depositPayment: await buildDepositPayment(contract),
            })))
            : contracts;

        res.status(200).json({ success: true, data: responseContracts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// GET /api/contracts/my-contracts - danh sách hợp đồng của Tenant hiện tại.
// Giữ endpoint riêng để Mobile không phải tự lọc dữ liệu của các Tenant khác.
exports.getMyContracts = exports.getAllContracts;

exports.getContractHistory = async (req, res) => {
    try {
        let landlordId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
                if (decoded.role === 1) landlordId = decoded.id;
            } catch(e) {}
        }

        let query = { status: 3 }; // Ví dụ: 3 là Đã thanh lý
        if (landlordId) {
            const rooms = await Room.find({ landlordId }).select('_id');
            query.roomId = { $in: rooms.map(r => r._id) };
        }

        const contracts = await Contract.find(query)
            .populate('roomId', 'roomCode area')
            .populate('tenantId', 'fullName phone')
            .populate('services.serviceId', 'name unit type defaultPrice')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: contracts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 2. Chủ trọ tạo dự thảo hợp đồng (Giao diện Tạo hợp đồng trên Figma)
exports.createContract = async (req, res) => {
    try {
        const { roomId, tenantId, startDate, endDate, services } = req.body;

        if (!roomId || !tenantId || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp đầy đủ roomId, tenantId, startDate và endDate!",
            });
        }

        let fixedRentPrice = req.body.fixedRentPrice ?? req.body.rentPrice ?? req.body.rent;
        let fixedDeposit = req.body.fixedDeposit ?? req.body.depositAmount ?? req.body.deposit;

        if (fixedRentPrice === undefined || fixedRentPrice === null || fixedDeposit === undefined || fixedDeposit === null) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập đầy đủ giá thuê và tiền cọc hợp đồng!",
            });
        }

        // 1. Ràng buộc Phòng: kiểm tra ownership và trạng thái đặt chỗ theo từng Room.
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ success: false, message: "Không tìm thấy phòng!" });
        if (String(room.landlordId) !== String(req.auth.id)) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền tạo hợp đồng cho phòng này." });
        }

        const activeContract = await Contract.findOne({ roomId, status: CONTRACT_STATUS.ACTIVE })
            .sort({ endDate: -1 })
            .select('endDate')
            .lean();
        const reservedContract = await Contract.findOne({ roomId, status: CONTRACT_STATUS.RESERVED })
            .select('_id startDate endDate')
            .lean();
        const pendingRoomContract = await Contract.findOne({ roomId, status: CONTRACT_STATUS.PENDING })
            .select('_id')
            .lean();
        if (pendingRoomContract) {
            return res.status(400).json({ success: false, message: "Phòng này đã có hợp đồng đang chờ khách ký." });
        }
        let lifecycle;
        try {
            lifecycle = classifyContractCreation({
                roomStatus: room.status,
                activeContract,
                reservedContract,
                startDate,
            });
        } catch (error) {
            return res.status(400).json({ success: false, code: 'ROOM_CONTRACT_CONFLICT', message: error.message });
        }

        const utilityDefaults = resolveUtilityPriceDefaults(await Service.find({
            landlordId: room.landlordId,
            isActive: true,
            type: 1,
        }).sort({ updatedAt: -1, _id: -1 }).select('name code type defaultPrice').lean());

        const previousContract = await Contract.findOne({ roomId })
            .sort({ createdAt: -1 })
            .select('initialElectricity initialWater checkoutSettlement')
            .lean();
        const latestInvoice = await Invoice.findOne({
            room: room.roomCode,
            period: { $nin: ['Tiền cọc', 'final_invoice'] },
            status: { $in: [1, 2, 3, 4] },
        })
            .sort({ createdAt: -1 })
            .select('electricityNew waterNew')
            .lean();

        const meterTerms = normalizeContractMeterTerms({
            ...resolveInitialContractMeterTerms({
                room,
                previousInvoice: latestInvoice,
                previousContract,
            }),
            ...req.body,
            electricityPrice: req.body.electricityPrice === undefined || req.body.electricityPrice === null || req.body.electricityPrice === '' || Number(req.body.electricityPrice) === 0
                ? utilityDefaults.electricityPrice
                : req.body.electricityPrice,
            waterPrice: req.body.waterPrice === undefined || req.body.waterPrice === null || req.body.waterPrice === '' || Number(req.body.waterPrice) === 0
                ? utilityDefaults.waterPrice
                : req.body.waterPrice,
        });

        const landlord = await Account.findById(req.auth.id).select('propertyAddress landlordSignature');
        const propertyAddress = typeof req.body.propertyAddress === 'string' && req.body.propertyAddress.trim()
            ? req.body.propertyAddress.trim()
            : (landlord?.propertyAddress || '');
        const landlordSignature = landlord?.landlordSignature || '';

        const newContract = new Contract({
            roomId,
            tenantId,
            startDate,
            endDate,
            fixedRentPrice,
            fixedDeposit,
            propertyAddress,
            landlordSignature,
            ...meterTerms,
            services: services || [], // Nhúng thẳng mảng dịch vụ vào đây
            isAdvanceBooking: lifecycle.isAdvanceBooking,
            status: lifecycle.status,
        });

        await newContract.save();

        // Tự động bắn thông báo cho Người thuê khi tạo Hợp đồng mới
        const roomCode = room?.roomCode || '';
        await sendNotification({
            userId: tenantId,
            title: "Hợp đồng thuê mới cần ký xác nhận",
            content: `Chủ trọ vừa gửi hợp đồng thuê phòng ${roomCode}. Vui lòng kiểm tra và ký xác nhận.`,
            category: "contract",
            deepLink: "contract",
            metadata: { contractId: newContract._id, roomId, action: 'review' },
            eventKey: `contract:${newContract._id}:created`,
        });

        res.status(201).json({
            success: true,
            message: lifecycle.isAdvanceBooking
                ? "Tạo hợp đồng đặt cọc giữ chỗ thành công! Chờ người thuê ký xác nhận."
                : "Tạo dự thảo hợp đồng thành công! Chờ người thuê ký xác nhận.",
            data: newContract
        });
    } catch (error) {
        return sendContractError(res, error, 'Lỗi khi tạo hợp đồng');
    }
};

// 3. Xem chi tiết hợp đồng (Cả Web và Mobile App đều dùng)
exports.getContractById = async (req, res) => {
    try {
        const contract = await loadAuthorizedContract(req, res);
        if (!contract) return;
        res.status(200).json({ success: true, data: contract });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

exports.sendContract = async (req, res) => {
    try {
        const result = await sendContractToNguoiThue({
            contractId: req.params.id,
            adminId: req.auth.id,
        });
        return res.json({ success: true, message: 'Đã gửi hợp đồng cho Người thuê.', data: result });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            code: error.code || 'CONTRACT_SEND_FAILED',
            message: error.message || 'Không thể gửi hợp đồng.',
        });
    }
};

// 4. Người thuê thực hiện Ký hợp đồng (Trên Mobile App)
exports.signContract = async (req, res) => {
    try {
        const signature = req.body?.signature || req.body?.tenantSignature || req.body?.signatureBase64;
        const result = await signContractAndEnsureDeposit({
            contractId: req.params.id,
            nguoiThueId: req.auth.id,
            signature,
        });
        await notifyLandlord({
            event: 'contract_signed',
            contractId: result.contract._id,
        });

        res.status(200).json({
            success: true,
            message: "Ký hợp đồng thành công! Vui lòng thanh toán tiền cọc ngay để hoàn tất.",
            data: result.contract,
            docxUrl: result.contract.docxUrl,
            pdfUrl: result.contract.pdfUrl,
            invoiceId: result.invoiceId,
            depositRequired: result.depositRequired,
            depositAmount: result.depositAmount,
            idempotent: result.idempotent,
        });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            code: error.code || "CONTRACT_SIGNING_FAILED",
            message: error.message || "Không thể ký hợp đồng.",
        });
    }
};

// 4.01 Tải file PDF Hợp đồng
exports.downloadPdf = async (req, res) => {
    try {
        const contract = await loadAuthorizedContract(req, res);
        if (!contract) return;
        const pdfFilePath = await ensurePdf(contract);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store' });
        return res.sendFile(pdfFilePath);
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi tải file PDF: " + error.message });
    }
};

exports.viewPdf = exports.downloadPdf;

exports.viewPdfHtml = async (req, res) => {
    try {
        const contract = await loadAuthorizedContract(req, res);
        if (!contract) return;
        const pdfPath = await ensurePdf(contract);
        const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
        res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' });
        return res.send(`<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>Hợp đồng</title><style>html,body{margin:0;background:#f1f5f9;font-family:Arial,sans-serif}#pages{display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px}canvas{max-width:100%;height:auto;background:#fff;box-shadow:0 2px 8px #0002}</style></head><body><main id="pages"></main><script type="module">import{getDocument,GlobalWorkerOptions}from'/api/contracts/assets/pdfjs/pdf.mjs';GlobalWorkerOptions.workerSrc='/api/contracts/assets/pdfjs/pdf.worker.min.mjs';const raw=atob('${pdfBase64}'),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const pdf=await getDocument({data:bytes}).promise;const pages=document.getElementById('pages');for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),viewport=page.getViewport({scale:1.35}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;pages.append(canvas);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;}</script></body></html>`);
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi mở hợp đồng: " + error.message });
    }
};

// 4.02 Tải file Word DOCX Hợp đồng
exports.downloadDocx = async (req, res) => {
    try {
        const contract = await loadAuthorizedContract(req, res);
        if (!contract) return;
        if (!canDownloadDocx(contract, req.auth)) {
            return res.status(403).json({ success: false, code: 'DOCX_FORBIDDEN', message: 'Chỉ chủ trọ mới được tải DOCX của bản nháp.' });
        }
        const docxFilePath = contractFilePath(contract._id, 'docx');
        if (!fs.existsSync(docxFilePath)) await generateContractDocx(contract._id);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="hop-dong-${contract._id}.docx"`);
        return res.sendFile(docxFilePath);
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi tải file DOCX: " + error.message });
    }
};


// 4.1. Chủ trọ bàn giao phòng và chốt số điện nước đầu vào.
exports.handoverContract = async (req, res) => {
    try {
        const contract = await Contract.findById(req.params.id);
        if (!contract) return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });

        const room = await Room.findById(contract.roomId);
        if (!room) return res.status(404).json({ success: false, message: "Không tìm thấy phòng của hợp đồng!" });
        if (String(room.landlordId) !== String(req.auth.id)) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền bàn giao hợp đồng này." });
        }
        if (Number(contract.status) !== CONTRACT_STATUS.RESERVED) {
            return res.status(400).json({ success: false, code: 'CONTRACT_NOT_RESERVED', message: "Chỉ hợp đồng Đã cọc / Chờ bàn giao mới được bàn giao." });
        }

        const handoverDate = req.body?.handoverDate || new Date().toISOString();
        const startDate = new Date(contract.startDate);
        const handoverAt = new Date(handoverDate);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(handoverAt.getTime()) || handoverAt < startDate) {
            return res.status(400).json({ success: false, code: 'INVALID_HANDOVER_DATE', message: "Ngày bàn giao không được trước ngày bắt đầu hợp đồng." });
        }

        const activeContract = await Contract.findOne({
            roomId: contract.roomId,
            status: CONTRACT_STATUS.ACTIVE,
            _id: { $ne: contract._id },
        }).select('endDate').lean();
        if (activeContract && (!activeContract.endDate || handoverAt < new Date(activeContract.endDate))) {
            return res.status(409).json({ success: false, code: 'ROOM_STILL_OCCUPIED', message: "Phòng vẫn còn hợp đồng hiện tại đến sau ngày bàn giao." });
        }

        const meterInput = validateHandoverInput(req.body, room);
        const depositInvoice = await Invoice.findOne({ contractId: contract._id, period: "Tiền cọc" });
        if (Number(contract.fixedDeposit) > 0 && (!depositInvoice || depositInvoice.status !== 2)) {
            return res.status(400).json({ success: false, code: 'DEPOSIT_NOT_PAID', message: "Người thuê chưa thanh toán tiền cọc! Không thể bàn giao." });
        }

        contract.status = CONTRACT_STATUS.ACTIVE;
        contract.handoverDate = handoverAt;
        contract.initialElectricity = meterInput.initialElectricity;
        contract.initialWater = meterInput.initialWater;
        await contract.save();

        room.status = 1;
        room.lastElectricityReading = meterInput.initialElectricity;
        room.lastWaterReading = meterInput.initialWater;
        room.draftElectricity = undefined;
        room.draftWater = undefined;
        await room.save();

        await sendNotification({
            userId: contract.tenantId,
            title: 'Phòng đã được bàn giao',
            content: `Phòng ${room.roomCode || ''} của bạn đã được bàn giao thành công! Hợp đồng chính thức có hiệu lực.`,
            category: 'contract',
            deepLink: 'contract',
            metadata: { contractId: contract._id, roomId: room._id, handoverDate: handoverAt, action: 'view' },
            eventKey: `contract:${contract._id}:handover`,
        });

        return res.status(200).json({
            success: true,
            message: "Bàn giao phòng thành công! Hợp đồng đã có hiệu lực.",
            data: contract,
        });
    } catch (error) {
        if (error.message?.includes('Chỉ số')) {
            return res.status(400).json({ success: false, code: 'INVALID_HANDOVER_METER', message: error.message });
        }
        return res.status(500).json({ success: false, message: "Lỗi khi bàn giao hợp đồng: " + error.message });
    }
};

// 4.2. Alias tương thích cho client cũ; dữ liệu meter lấy từ contract/Room nếu không truyền.
exports.confirmContract = async (req, res) => {
    const contract = await Contract.findById(req.params.id).lean();
    if (!contract) return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });
    const room = await Room.findById(contract.roomId).lean();
    req.body = {
        ...req.body,
        initialElectricity: req.body?.initialElectricity ?? contract.initialElectricity ?? room?.lastElectricityReading,
        initialWater: req.body?.initialWater ?? contract.initialWater ?? room?.lastWaterReading,
        handoverDate: req.body?.handoverDate || new Date().toISOString(),
    };
    return exports.handoverContract(req, res);
};

// 4.3. Chủ trọ quyết toán và duyệt trả phòng
exports.getCheckoutPreview = async (req, res) => {
    try {
        const preview = await loadCheckoutPreview({
            contractId: req.params.id,
            adminId: req.auth.id,
        });
        res.status(200).json({ success: true, data: preview });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            code: error.code || 'CHECKOUT_PREVIEW_FAILED',
            message: error.message || 'Không thể tải bảng quyết toán.',
        });
    }
};

exports.checkoutContract = async (req, res) => {
    try {
        const result = await completeContractCheckout({
            contractId: req.params.id,
            adminId: req.auth.id,
            input: req.body,
        });
        const money = new Intl.NumberFormat('vi-VN');
        const content = result.settlement.amountDue > 0
            ? `Quyết toán phòng ${result.roomCode}: cọc ${money.format(result.settlement.depositAmount)}đ, tổng nợ ${money.format(result.settlement.totalDebt)}đ; bạn cần thanh toán thêm ${money.format(result.settlement.amountDue)}đ.`
            : `Quyết toán phòng ${result.roomCode}: cọc ${money.format(result.settlement.depositAmount)}đ, tổng nợ ${money.format(result.settlement.totalDebt)}đ; tiền cọc được hoàn ${money.format(result.settlement.refundAmount)}đ.`;

        await sendNotification({
            userId: result.tenantId,
            title: 'Đã duyệt trả phòng',
            content,
            category: 'contract',
            deepLink: result.settlement.amountDue > 0 ? '/invoices' : '/contracts',
            metadata: {
                contractId: result.contract._id,
                roomId: result.room._id,
                refundAmount: result.settlement.refundAmount,
                amountDue: result.settlement.amountDue,
                unpaidAmount: result.settlement.unpaidAmount,
                totalDebt: result.settlement.totalDebt,
                finalInvoiceId: result.settlement.finalInvoiceId,
            },
            eventKey: `contract:${result.contract._id}:checkout`,
        });

        res.status(200).json({
            success: true,
            message: 'Đã duyệt trả phòng và chuyển phòng về trạng thái còn trống.',
            data: result.contract,
            settlement: result.settlement,
        });
    } catch (error) {
        const isValidationError = error instanceof CheckoutError || error instanceof CalculationError;
        res.status(error.status || (isValidationError ? 400 : 500)).json({
            success: false,
            code: error.code || 'CHECKOUT_FAILED',
            field: error.field,
            message: error.message || 'Không thể duyệt trả phòng.',
        });
    }
};

// 5. Cập nhật thông tin hợp đồng (Chủ trọ sửa trên Web)
exports.updateContract = async (req, res) => {
    try {
        const { roomId, tenantId, startDate, endDate, fixedRentPrice, fixedDeposit, status, services } = req.body;
        const meterTerms = normalizeContractMeterTerms(req.body, { partial: true });

        const existing = await Contract.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });

        // Không cho đổi tay sang ACTIVE; hợp đồng phải đi qua handover để chốt meter và Room đồng bộ.
        if (status !== undefined && Number(status) === CONTRACT_STATUS.ACTIVE && existing.status !== CONTRACT_STATUS.ACTIVE) {
            return res.status(400).json({ success: false, code: 'HANDOVER_REQUIRED', message: "Hợp đồng phải được bàn giao qua chức năng Bàn giao phòng & chốt số điện nước." });
        }

        const updateData = {};
        if (roomId !== undefined) {
            if (roomId.toString() !== existing.roomId.toString()) {
                const newRoom = await Room.findById(roomId);
                if (newRoom && newRoom.status === 1) {
                    return res.status(400).json({ success: false, message: "Phòng mới bạn chọn đang có người thuê!" });
                }
            }
            updateData.roomId = roomId;
        }
        if (tenantId !== undefined) updateData.tenantId = tenantId;
        if (startDate !== undefined) updateData.startDate = startDate;
        if (endDate !== undefined) updateData.endDate = endDate;
        if (fixedRentPrice !== undefined) updateData.fixedRentPrice = fixedRentPrice;
        if (fixedDeposit !== undefined) updateData.fixedDeposit = fixedDeposit;
        if (status !== undefined) updateData.status = status;
        if (services !== undefined) updateData.services = services;
        Object.assign(updateData, meterTerms);

        const updated = await Contract.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('roomId', 'roomCode area')
            .populate('tenantId', 'fullName phone');

        // Nếu admin đổi trạng thái thành hiệu lực (1) → đổi phòng thành Đang thuê
        const targetRoomId = updated.roomId._id || updated.roomId;
        if (status === 1 && targetRoomId) {
            await Room.findByIdAndUpdate(targetRoomId, { status: 1 });
        }

        // Cập nhật hợp đồng thành công

        res.status(200).json({ success: true, message: "Cập nhật hợp đồng thành công!", data: updated });
    } catch (error) {
        return sendContractError(res, error, 'Lỗi khi cập nhật hợp đồng');
    }
};

// 8. Xóa hợp đồng (Chủ trọ xóa hợp đồng nháp / chưa ký hoặc hợp đồng đã hủy)
exports.deleteContract = async (req, res) => {
    try {
        const { id } = req.params;
        const contract = await Contract.findById(id);
        if (!contract) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });
        }

        // Nếu hợp đồng đang có hiệu lực (status = 1), không cho xóa trực tiếp (phải thanh lý/quyết toán)
        if (contract.status === 1) {
            return res.status(400).json({
                success: false,
                message: "Hợp đồng đang có hiệu lực không thể xóa trực tiếp. Vui lòng thực hiện quy trình Quyết toán / Trả phòng!"
            });
        }

        const roomId = contract.roomId?._id || contract.roomId;

        // Xóa hợp đồng khỏi database
        await Contract.findByIdAndDelete(id);

        // Kiểm tra xem phòng còn hợp đồng hiệu lực hoặc đang chờ nào khác không
        if (roomId) {
            const activeOrPendingContract = await Contract.findOne({
                roomId,
                status: { $in: [0, 1, 4, 5] }
            });
            if (!activeOrPendingContract) {
                // Đặt lại phòng về trạng thái Trống (0)
                await Room.findByIdAndUpdate(roomId, { status: 0 });
            }
        }

        res.status(200).json({
            success: true,
            message: "Xóa hợp đồng thành công!"
        });
    } catch (error) {
        return sendContractError(res, error, 'Lỗi khi xóa hợp đồng');
    }
};

// 7. Xem trước toàn văn Hợp đồng trước khi tạo chính thức
exports.previewDraftHtml = async (req, res) => {
    try {
        const { roomId, tenantId, startDate, endDate, fixedRentPrice, fixedDeposit, electricityPrice, waterPrice, services, propertyAddress } = req.body;
        const landlord = await Account.findById(req.auth.id);
        if (!landlord) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản chủ trọ." });
        
        let roomCode = '';
        if (roomId) {
            const room = await Room.findById(roomId).select('roomCode');
            if (room) roomCode = room.roomCode;
        }

        let tenantName = '', tenantIdCard = '', tenantPhone = '';
        if (tenantId) {
            const tenant = await Account.findById(tenantId).select('fullName idCard phone');
            if (tenant) {
                tenantName = tenant.fullName || '';
                tenantIdCard = tenant.idCard || '';
                tenantPhone = tenant.phone || '';
            }
        }

        const address = propertyAddress || landlord.propertyAddress || '';
        const fixedServicesTotal = (services || []).reduce((sum, s) => sum + (Number(s.fixedPrice || s.price) || 0), 0);

        const data = {
            ten_chu_tro: landlord.fullName || '',
            cccd_chu_tro: landlord.idCard || '',
            sdt_chu_tro: landlord.phone || '',
            dia_chi_nha_tro: address,
            ten_nguoi_thue: tenantName,
            cccd_nguoi_thue: tenantIdCard,
            sdt_nguoi_thue: tenantPhone,
            ma_phong: roomCode,
            gia_thue: Number(fixedRentPrice || 0).toLocaleString('vi-VN'),
            tien_coc: Number(fixedDeposit || 0).toLocaleString('vi-VN'),
            tien_coc_bang_chu: require('../services/vietnameseNumber').numberToVietnameseWords(fixedDeposit),
            ngay_bat_dau: startDate || '',
            ngay_ket_thuc: endDate || '',
            gia_dien: electricityPrice == null ? '' : Number(electricityPrice).toLocaleString('vi-VN'),
            gia_nuoc: waterPrice == null ? '' : Number(waterPrice).toLocaleString('vi-VN'),
            phi_dich_vu: Number(fixedServicesTotal).toLocaleString('vi-VN'),
        };

        const html = renderContractHtml(data, landlord.landlordSignature || '', '');
        res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.send(html);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi xem trước hợp đồng: ' + error.message });
    }
};
