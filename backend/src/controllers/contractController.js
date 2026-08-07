const Contract = require('../models/Contract');
const Room = require('../models/Room');
const Invoice = require('../models/Invoice');
const Property = require('../models/Property');
const PropertyMembership = require('../models/PropertyMembership');
const { assertContractEligibility, PropertyMembershipError } = require('../services/propertyMembershipService');
const {
    buildDepositPayment,
    signContractAndEnsureDeposit,
} = require('../services/contractSigningService');
const {
    ContractTermsError,
    normalizeContractMeterTerms,
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

function sendContractError(res, error, fallbackMessage) {
    if (error instanceof PropertyMembershipError) {
        return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    }
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
        let landlordId = null;
        let nguoiThueId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || '***REMOVED***');
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

exports.getContractHistory = async (req, res) => {
    try {
        let landlordId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || '***REMOVED***');
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
        const { propertyId, roomId, tenantId, startDate, endDate, services } = req.body;

        if (!propertyId || !roomId || !tenantId || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp đầy đủ propertyId, roomId, tenantId, startDate và endDate!",
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

        const room = await assertContractEligibility({
            propertyId,
            landlordId: req.auth.id,
            roomId,
            tenantId,
            PropertyModel: Property,
            RoomModel: Room,
            MembershipModel: PropertyMembership,
            ContractModel: Contract,
        });

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
        });

        // Xóa các số điện/nước nháp cũ của phòng để ô số điện mới trên màn hình chốt điện nước để trống
        room.draftElectricity = undefined;
        room.draftWater = undefined;
        await room.save();

        const newContract = new Contract({
            roomId,
            tenantId,
            startDate,
            endDate,
            fixedRentPrice,
            fixedDeposit,
            ...meterTerms,
            services: services || [], // Nhúng thẳng mảng dịch vụ vào đây
            status: 0 // Trạng thái mặc định: 0 - Chờ Người thuê xác nhận
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
            metadata: { propertyId, contractId: newContract._id, roomId, action: 'review' },
            eventKey: `contract:${newContract._id}:created`,
        });

        res.status(201).json({
            success: true,
            message: "Tạo dự thảo hợp đồng thành công! Chờ người thuê ký xác nhận.",
            data: newContract
        });
    } catch (error) {
        return sendContractError(res, error, 'Lỗi khi tạo hợp đồng');
    }
};

// 3. Xem chi tiết hợp đồng (Cả Web và Mobile App đều dùng)
exports.getContractById = async (req, res) => {
    try {
        const contract = await Contract.findById(req.params.id)
            .populate('roomId')
            .populate('tenantId', 'fullName phone idCard email')
            .populate('services.serviceId', 'name unit type defaultPrice'); // Kéo chi tiết dịch vụ ra

        if (!contract) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });
        }
        if (req.auth.role === 2 && String(contract.tenantId?._id || contract.tenantId) !== String(req.auth.id)) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });
        }
        if (req.auth.role === 1 && String(contract.roomId?.landlordId || '') !== String(req.auth.id)) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });
        }
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
        const result = await signContractAndEnsureDeposit({
            contractId: req.params.id,
            nguoiThueId: req.auth.id,
        });
        await notifyLandlord({
            event: 'contract_signed',
            contractId: result.contract._id,
        });

        res.status(200).json({
            success: true,
            message: "Ký hợp đồng thành công! Vui lòng thanh toán tiền cọc ngay để hoàn tất.",
            data: result.contract,
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

// 4.1. Chủ trọ (Admin) duyệt xác nhận hợp đồng (Trên Web/App)
exports.confirmContract = async (req, res) => {
    try {
        const contract = await Contract.findById(req.params.id);

        if (!contract) return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng!" });
        if (contract.status !== 4) {
            return res.status(400).json({ success: false, message: "Hợp đồng này không ở trạng thái chờ duyệt!" });
        }

        // Kiểm tra xem phòng có đang có hợp đồng nào Đang hiệu lực không (để chặn kích hoạt đè)
        const activeContract = await Contract.findOne({ roomId: contract.roomId, status: 1 });
        if (activeContract) {
            return res.status(400).json({
                success: false,
                message: "Phòng này vẫn đang có một hợp đồng khác Đang hiệu lực. Vui lòng thanh lý hợp đồng cũ của Người thuê hiện tại trước khi duyệt kích hoạt hợp đồng giữ chỗ này!"
            });
        }

        // 1. Kiểm tra hóa đơn cọc đã thanh toán chưa
        const depositInvoice = await Invoice.findOne({ contractId: contract._id, period: "Tiền cọc" });
        if (Number(contract.fixedDeposit) > 0 && (!depositInvoice || depositInvoice.status !== 2)) {
            return res.status(400).json({ success: false, message: "Người thuê chưa thanh toán tiền cọc! Không thể duyệt." });
        }

        // 2. Chuyển trạng thái hợp đồng thành Đang hiệu lực (1)
        contract.status = 1;
        await contract.save();

        // 2. Chuyển trạng thái Phòng thành Đang thuê (1)
        const room = await Room.findByIdAndUpdate(contract.roomId, { status: 1 });

        await sendNotification({
            userId: contract.tenantId,
            title: 'Hợp đồng đã được kích hoạt',
            content: `Hợp đồng phòng ${room?.roomCode || ''} đã có hiệu lực.`,
            category: 'contract',
            deepLink: 'contract',
            metadata: { contractId: contract._id, roomId: contract.roomId, action: 'view' },
            eventKey: `contract:${contract._id}:activated`,
        });

        // (Hóa đơn tiền cọc đã được tạo lúc người thuê ký, không tạo lại ở đây)
        res.status(200).json({
            success: true,
            message: "Xác nhận duyệt hợp đồng thành công! Đã tạo hóa đơn tiền cọc.",
            data: contract
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi xác nhận hợp đồng: " + error.message });
    }
};

// 4.2. Chủ trọ quyết toán và duyệt trả phòng
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

        // Admin tạo hợp đồng phải thông qua người thuê ký (status = 4), nếu không thì không tự xác nhận thành Đang hiệu lực (1) được.
        if (status !== undefined && Number(status) === 1 && existing.status !== 1 && existing.status !== 4) {
            return res.status(400).json({ success: false, message: "Người thuê chưa ký hợp đồng này, Chủ trọ không thể xác nhận!" });
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
