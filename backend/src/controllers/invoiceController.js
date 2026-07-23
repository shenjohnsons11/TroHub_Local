const Invoice = require('../models/Invoice');
const Contract = require('../models/Contract');
const Service = require('../models/Service');
const Transaction = require('../models/Transaction'); // Gọi thêm bảng Giao dịch
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || '***REMOVED***';
const Account = require('../models/Account');
const BillingPolicy = require('../models/BillingPolicy');
const {
    CalculationError,
    calculateInvoiceAmounts,
    calculateMeterCharge,
    parseNonNegativeFinite,
    roundVnd,
} = require('../services/invoiceCalculator');
const {
    OverdueInvoiceValidationError,
    applyAllOverduePenalties,
    applyOverduePenalty,
    buildLateFeeSnapshot,
} = require('../services/overdueInvoice');
const { remindInvoicePayment } = require('../services/invoiceNotificationService');

async function buildInvoicePolicySnapshot(req, issuedAt, penaltyBaseAmount) {
    const policy = await BillingPolicy.findOne({ landlordId: req.auth.id });
    return buildLateFeeSnapshot({
        issuedAt: issuedAt || new Date(),
        graceDays: policy?.lateFeeGraceDays ?? 3,
        penaltyRate: policy?.lateFeeRate ?? 5,
        penaltyBaseAmount,
    });
}

function sendInvoiceError(res, error, fallbackMessage) {
    if (error instanceof CalculationError || error instanceof OverdueInvoiceValidationError) {
        return res.status(400).json({
            success: false,
            code: error.code,
            field: error.field,
            message: error.message,
        });
    }

    return res.status(500).json({
        success: false,
        code: 'INVOICE_OPERATION_FAILED',
        message: `${fallbackMessage}: ${error.message}`,
    });
}

// Lấy dữ liệu xem trước để lập hóa đơn hàng loạt
exports.getBulkPreview = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
            } catch (e) {}
        }
        if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

        const Room = require('../models/Room');
        const rooms = await Room.find({ landlordId: userId });
        const roomIds = rooms.map(r => r._id);

        const contracts = await Contract.find({ roomId: { $in: roomIds }, status: 1 })
            .populate('roomId', 'roomCode draftElectricity draftWater')
            .populate('tenantId', 'fullName phone')
            .populate('services.serviceId', 'name type');

        const previewList = [];

        for (const contract of contracts) {
            const previousInvoice = await Invoice.findOne({
                contractId: contract._id,
                status: { $in: [1, 2, 3] }
            }).sort({ createdAt: -1 });

            const roomAmount = contract.fixedRentPrice || 0;

            let electricityOld = 0;
            let waterOld = 0;
            let electricityPrice = 0;
            let waterPrice = 0;
            let servicesTotal = 0;
            let parking = 0;
            let internet = 0;
            let garbage = 0;

            for (const item of contract.services) {
                const service = item.serviceId;
                if (!service) continue;
                const sName = service.name.toLowerCase();

                if (service.type === 1) {
                    if (sName.includes('điện') || sName.includes('dien')) {
                        electricityPrice = item.fixedPrice || 0;
                        if (previousInvoice && previousInvoice.electricityNew !== undefined) electricityOld = previousInvoice.electricityNew;
                    } else if (sName.includes('nước') || sName.includes('nuoc')) {
                        waterPrice = item.fixedPrice || 0;
                        if (previousInvoice && previousInvoice.waterNew !== undefined) waterOld = previousInvoice.waterNew;
                    }
                } else {
                    if (sName.includes('xe') || sName.includes('parking')) {
                        parking += item.fixedPrice || 0;
                    } else if (sName.includes('wifi') || sName.includes('internet') || sName.includes('mạng') || sName.includes('mang')) {
                        internet += item.fixedPrice || 0;
                    } else if (sName.includes('rác') || sName.includes('rac') || sName.includes('vệ sinh')) {
                        garbage += item.fixedPrice || 0;
                    } else {
                        servicesTotal += item.fixedPrice || 0;
                    }
                }
            }

            console.log(`Contract ${contract._id} preview:`, {
                eOld: electricityOld, ePrice: electricityPrice,
                wOld: waterOld, wPrice: waterPrice,
                servicesTotal, parking, internet, garbage
            });

            previewList.push({
                contractId: contract._id,
                roomId: contract.roomId._id,
                room: contract.roomId.roomCode,
                tenant: contract.tenantId.fullName,
                roomAmount: roomAmount,
                electricityOld: electricityOld,
                electricityPrice: electricityPrice,
                electricityDraft: contract.roomId.draftElectricity || "",
                waterOld: waterOld,
                waterPrice: waterPrice,
                waterDraft: contract.roomId.draftWater || "",
                services: servicesTotal,
                parking: parking,
                internet: internet,
                garbage: garbage
            });
        }

        res.status(200).json({ success: true, data: previewList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Tạo hóa đơn hàng loạt
exports.createBulkInvoices = async (req, res) => {
    try {
        const { invoices, period, issuedAt } = req.body;
        if (!invoices || !Array.isArray(invoices)) {
            return res.status(400).json({ success: false, message: "Dữ liệu hóa đơn không hợp lệ" });
        }

        // Xác thực toàn bộ phép tính trước khi ghi để lỗi chỉ số không tạo ra lô hóa đơn dở dang.
        const preparedInvoices = invoices.map((data) => ({
            data,
            amounts: calculateInvoiceAmounts({ ...data, penalty: 0 }),
        }));
        const createdInvoices = [];

        for (const { data, amounts } of preparedInvoices) {
            const policySnapshot = await buildInvoicePolicySnapshot(
                req,
                data.issuedAt || issuedAt,
                amounts.totalAmount
            );
            const penaltyAppliedAt = policySnapshot.isOverdue ? new Date() : null;
            const penalty = policySnapshot.isOverdue ? policySnapshot.penalty : 0;

            let resolvedPeriod = period;
            if (!resolvedPeriod) {
                const d = new Date();
                resolvedPeriod = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            }

            let warningNote = "";
            if (data.contractId) {
                const unpaidInvoices = await Invoice.find({
                    contractId: data.contractId,
                    status: { $in: [1, 3] }
                });
                const totalDebt = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
                if (totalDebt > 0) {
                    warningNote = `LƯU Ý: Phòng đang có khoản nợ ${totalDebt.toLocaleString("vi-VN")}đ từ kỳ trước chưa thanh toán.`;
                }
            }

            const newInvoice = new Invoice({
                contractId: data.contractId || null,
                period: resolvedPeriod,
                issuedAt: policySnapshot.issuedAt,
                graceDaysSnapshot: policySnapshot.graceDaysSnapshot,
                penaltyRateSnapshot: policySnapshot.penaltyRateSnapshot,
                overdueAt: policySnapshot.overdueAt,
                dueDate: new Date(policySnapshot.overdueAt.getTime() - 24 * 60 * 60 * 1000),
                penaltyBaseAmount: policySnapshot.penaltyBaseAmount,
                penaltyAppliedAt,
                penalty,
                totalAmount: policySnapshot.penaltyBaseAmount + penalty,
                status: policySnapshot.isOverdue ? 3 : 1,
                room: data.room || "",
                tenant: data.tenant || "",
                roomAmount: amounts.roomAmount,
                electricityOld: amounts.electricityOld,
                electricityNew: amounts.electricityNew,
                electricity: amounts.electricity,
                waterOld: amounts.waterOld,
                waterNew: amounts.waterNew,
                water: amounts.water,
                services: amounts.services,
                parking: amounts.parking,
                internet: amounts.internet,
                garbage: amounts.garbage,
                discount: amounts.discount,
                note: warningNote,
                details: []
            });

            await newInvoice.save();
            createdInvoices.push(newInvoice);

            // Xóa nháp điện nước sau khi đã xuất hóa đơn
            if (data.contractId) {
                const Contract = require('../models/Contract');
                const Room = require('../models/Room');
                const contract = await Contract.findById(data.contractId);
                if (contract && contract.roomId) {
                    await Room.findByIdAndUpdate(contract.roomId, {
                        $unset: { draftElectricity: "", draftWater: "" }
                    });
                }
            }
        }

        res.status(201).json({ success: true, message: `Đã tạo thành công ${createdInvoices.length} hóa đơn!`, data: createdInvoices });
    } catch (error) {
        return sendInvoiceError(res, error, 'Lỗi tạo hóa đơn hàng loạt');
    }
};

exports.remindInvoice = async (req, res) => {
    try {
        const data = await remindInvoicePayment({
            invoiceId: req.params.id,
            adminId: req.auth.id,
        });
        res.status(200).json({ success: true, message: 'Đã gửi nhắc thanh toán cho Người thuê.', data });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            code: error.code || 'INVOICE_REMINDER_FAILED',
            message: error.message || 'Không thể gửi nhắc thanh toán.',
        });
    }
};

// 1. Lấy danh sách toàn bộ hóa đơn (Hiển thị lên bảng Web)
exports.getAllInvoices = async (req, res) => {
    try {
        await applyAllOverduePenalties();
        // 1. Giải mã token để check role của người gửi yêu cầu
        const authHeader = req.headers['authorization'];
        let userId = null;
        let userRole = 1; // Mặc định là Landlord (Admin) nếu không xác thực được

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
                userRole = decoded.role;
            } catch (e) {
                // Token lỗi hoặc hết hạn, coi như khách vãng lai
            }
        }

        let query = {};

        if (userRole === 2 && userId) {
            const tenantContracts = await Contract.find({ tenantId: userId }).sort({ createdAt: -1 });
            // Lấy tất cả CÁC hợp đồng hiện tại (đang thuê, chờ ký, chờ duyệt, yêu cầu trả phòng)
            const activeContracts = tenantContracts.filter(c => [0, 1, 4, 5].includes(c.status));
            const currentContractIds = activeContracts.map(c => c._id);

            // Lấy hóa đơn gắn chính xác với các contractId HIỆN TẠI của người thuê này.
            query = { contractId: { $in: currentContractIds }, status: { $ne: 0 } };
        } else if (userRole === 1 && userId) {
            const Room = require('../models/Room');
            const rooms = await Room.find({ landlordId: userId }).select('_id roomCode');
            const roomIds = rooms.map(r => r._id);
            const roomCodes = rooms.map(r => r.roomCode);
            const contracts = await Contract.find({ roomId: { $in: roomIds } }).select('_id');
            const contractIds = contracts.map(c => c._id);

            // Lọc hóa đơn thuộc về hợp đồng của chủ trọ, HOẶC hóa đơn nháp (không có contractId) nhưng tên phòng thuộc chủ trọ
            query = {
                $or: [
                    { contractId: { $in: contractIds } },
                    { room: { $in: roomCodes } }
                ]
            };
        }

        // Dùng populate 2 tầng để lấy tên phòng và tên người thuê từ Hợp đồng
        const invoices = await Invoice.find(query)
            .populate({
                path: 'contractId',
                populate: [
                    {
                        path: 'roomId',
                        select: 'roomCode landlordId',
                        populate: { path: 'landlordId', select: 'bankId bankAccountNo bankAccountName fullName' }
                    },
                    { path: 'tenantId', select: 'fullName' }
                ]
            })
            .populate('details.serviceId', 'name type')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 2. Tạo hóa đơn mới (Chủ trọ chốt số điện nước hàng tháng)
exports.createInvoice = async (req, res) => {
    try {
        const { contractId, period, dueDate, serviceIndices, room, tenant } = req.body;

        // Lấy landlordId từ token
        let landlordId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded.role === 1) landlordId = decoded.id;
            } catch (e) {}
        }

        // Hỗ trợ lưu trực tiếp các trường tính toán từ Frontend
        if (room || tenant) {
            let resolvedContractId = contractId;
            if (!resolvedContractId && room) {
                const Room = require('../models/Room');
                const roomQuery = { roomCode: room };
                if (landlordId) roomQuery.landlordId = landlordId;

                const targetRoom = await Room.findOne(roomQuery);
                if (targetRoom) {
                    resolvedContractId = targetRoom._id; // Lưu tạm roomId làm contractId nếu không có hợp đồng
                    const contract = await Contract.findOne({ roomId: targetRoom._id, status: { $in: [0, 1, 4, 5] } }).sort({ createdAt: -1 });
                    if (contract) {
                        resolvedContractId = contract._id;
                    }
                }
            }

            // Parse period từ fromDate (MM/YYYY)
            let resolvedPeriod = period;
            if (!resolvedPeriod && req.body.fromDate) {
                const parts = req.body.fromDate.split('/');
                if (parts.length === 3) {
                    resolvedPeriod = `${parts[1]}/${parts[2]}`;
                }
            }
            if (!resolvedPeriod) {
                const d = new Date();
                resolvedPeriod = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            }

            // Trạng thái: "Nháp" -> 0, "Chưa thanh toán" -> 1, "Đã thanh toán" -> 2, "Quá hạn" -> 3
            let resolvedStatus = 1; // mặc định là Chưa thanh toán
            if (req.body.status === "Nháp" || req.body.status === 0 || Number(req.body.status) === 0) {
                resolvedStatus = 0;
            } else if (req.body.status === "Đã thanh toán" || req.body.status === 2 || Number(req.body.status) === 2) {
                resolvedStatus = 2;
            } else if (req.body.status === "Quá hạn" || req.body.status === 3 || Number(req.body.status) === 3) {
                resolvedStatus = 3;
            }

            // Định dạng ngày
            let parsedDueDate = new Date();
            if (dueDate) {
                if (typeof dueDate === 'string') {
                    if (dueDate.includes('/')) {
                        const parts = dueDate.split('/');
                        parsedDueDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    } else {
                        parsedDueDate = new Date(dueDate);
                    }
                } else {
                    parsedDueDate = new Date(dueDate);
                }
            }

            const amounts = calculateInvoiceAmounts({ ...req.body, penalty: 0 });
            const policySnapshot = await buildInvoicePolicySnapshot(
                req,
                req.body.issuedAt,
                amounts.totalAmount
            );
            const shouldApplyPenalty =
                policySnapshot.isOverdue && resolvedStatus !== 0 && resolvedStatus !== 2;
            const effectivePenalty = shouldApplyPenalty ? policySnapshot.penalty : 0;

            // Kiểm tra nợ cũ để thêm cảnh báo
            let warningNote = req.body.note || "";
            if (resolvedContractId) {
                const unpaidInvoices = await Invoice.find({
                    contractId: resolvedContractId,
                    status: { $in: [1, 3] }
                });
                const totalDebt = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
                if (totalDebt > 0) {
                    warningNote = `LƯU Ý: Phòng đang có khoản nợ ${totalDebt.toLocaleString("vi-VN")}đ từ kỳ trước chưa thanh toán.\n${warningNote}`.trim();
                }
            }

            const newInvoice = new Invoice({
                contractId: resolvedContractId || null,
                period: resolvedPeriod,
                issuedAt: policySnapshot.issuedAt,
                graceDaysSnapshot: policySnapshot.graceDaysSnapshot,
                penaltyRateSnapshot: policySnapshot.penaltyRateSnapshot,
                overdueAt: policySnapshot.overdueAt,
                dueDate: new Date(policySnapshot.overdueAt.getTime() - 24 * 60 * 60 * 1000),
                penaltyBaseAmount: policySnapshot.penaltyBaseAmount,
                penaltyAppliedAt: shouldApplyPenalty ? new Date() : null,
                totalAmount: policySnapshot.penaltyBaseAmount + effectivePenalty,
                status: shouldApplyPenalty ? 3 : resolvedStatus,
                room: room || "",
                tenant: tenant || "",
                fromDate: req.body.fromDate || "",
                toDate: req.body.toDate || "",
                roomAmount: amounts.roomAmount,
                electricityOld: amounts.electricityOld,
                electricityNew: amounts.electricityNew,
                electricity: amounts.electricity,
                waterOld: amounts.waterOld,
                waterNew: amounts.waterNew,
                water: amounts.water,
                services: amounts.services,
                parking: amounts.parking,
                internet: amounts.internet,
                garbage: amounts.garbage,
                discount: amounts.discount,
                penaltyDays: policySnapshot.graceDaysSnapshot,
                penaltyRate: policySnapshot.penaltyRateSnapshot,
                penalty: effectivePenalty,
                paymentMethod: req.body.paymentMethod || "",
                transactionCode: req.body.transactionCode || "",
                note: warningNote,
                details: []
            });

            await newInvoice.save();
            return res.status(201).json({ success: true, message: "Xuất hóa đơn thành công!", data: newInvoice });
        }

        // --- Logic cũ khi gọi bằng API thô ---
        const contract = await Contract.findById(contractId).populate('services.serviceId');
        if (!contract || contract.status !== 1) {
            return res.status(400).json({ success: false, message: "Hợp đồng không tồn tại hoặc đã hết hiệu lực!" });
        }

        // Tìm hóa đơn của tháng trước để lấy Chỉ số cũ (oldIndex)
        const previousInvoice = await Invoice.findOne({ contractId }).sort({ createdAt: -1 });

        let totalAmount = contract.fixedRentPrice; // Bắt đầu cộng từ Tiền phòng gốc
        let details = [];

        // Duyệt qua từng dịch vụ đã chốt trong hợp đồng để tính tiền
        for (const item of contract.services) {
            const service = item.serviceId;
            let appliedPrice = item.fixedPrice;

            let detailRow = {
                serviceId: service._id,
                appliedPrice: appliedPrice
            };

            if (service.type === 1) {
                // Loại 1: Tính theo chỉ số (Điện, Nước)
                // Tìm chỉ số mới chủ trọ vừa nhập cho dịch vụ này
                const inputData = serviceIndices.find(s => s.serviceId.toString() === service._id.toString());
                const newIndex = inputData ? inputData.newIndex : 0;

                // Lấy chỉ số cũ từ hóa đơn tháng trước (nếu không có thì = 0)
                let oldIndex = 0;
                if (previousInvoice) {
                    const prevDetail = previousInvoice.details.find(d => d.serviceId.toString() === service._id.toString());
                    if (prevDetail) oldIndex = prevDetail.newIndex;
                }

                const meter = calculateMeterCharge({
                    label: service.name,
                    oldIndex,
                    newIndex,
                    unitPrice: appliedPrice,
                });

                detailRow.oldIndex = meter.oldIndex;
                detailRow.newIndex = meter.newIndex;
                detailRow.quantity = meter.usage;
                detailRow.amount = meter.amount;
            } else {
                // Loại 2: Tính khoán (Wifi, Rác...)
                detailRow.quantity = 1;
                detailRow.amount = roundVnd(
                    parseNonNegativeFinite(
                        appliedPrice,
                        `service.${service._id}.fixedPrice`,
                        `Đơn giá ${service.name}`
                    )
                );
            }

            totalAmount += detailRow.amount;
            details.push(detailRow);
        }

        totalAmount = roundVnd(totalAmount);
        const policySnapshot = await buildInvoicePolicySnapshot(
            req,
            req.body.issuedAt,
            totalAmount
        );
        const effectivePenalty = policySnapshot.isOverdue
            ? policySnapshot.penalty
            : 0;
        const newInvoice = new Invoice({
            contractId,
            period,
            issuedAt: policySnapshot.issuedAt,
            graceDaysSnapshot: policySnapshot.graceDaysSnapshot,
            penaltyRateSnapshot: policySnapshot.penaltyRateSnapshot,
            overdueAt: policySnapshot.overdueAt,
            dueDate: new Date(policySnapshot.overdueAt.getTime() - 24 * 60 * 60 * 1000),
            penaltyBaseAmount: policySnapshot.penaltyBaseAmount,
            penaltyAppliedAt: policySnapshot.isOverdue ? new Date() : null,
            penalty: effectivePenalty,
            totalAmount: policySnapshot.penaltyBaseAmount + effectivePenalty,
            status: policySnapshot.isOverdue ? 3 : 1,
            details
        });

        await newInvoice.save();
        res.status(201).json({ success: true, message: "Xuất hóa đơn thành công!", data: newInvoice });
    } catch (error) {
        return sendInvoiceError(res, error, 'Lỗi khi tạo hóa đơn');
    }
};

// 3. Xem chi tiết 1 hóa đơn
exports.getInvoiceById = async (req, res) => {
    try {
        await applyOverduePenalty(req.params.id);
        const invoice = await Invoice.findById(req.params.id)
            .populate({
                path: 'contractId',
                populate: [
                    { path: 'roomId', select: 'roomCode area' },
                    { path: 'tenantId', select: 'fullName phone idCard' }
                ]
            })
            .populate('details.serviceId', 'name unit'); // Lấy thêm tên dịch vụ (Điện, Nước) và đơn vị

        if (!invoice) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn!" });
        res.status(200).json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 4. Thanh toán hóa đơn (Ghi nhận Giao dịch)
exports.payInvoice = async (req, res) => {
    try {
        const { method, gatewayReference } = req.body; // VD: method = "VNPay" hoặc "Chuyển khoản"

        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn!" });
        if (invoice.status === 2) return res.status(400).json({ success: false, message: "Hóa đơn này đã được thanh toán rồi!" });

        // 1. Cập nhật trạng thái hóa đơn thành Đã thanh toán (2)
        invoice.status = 2;
        invoice.paymentMethod = req.body.paymentMethod || method || 'Tiền mặt';
        invoice.transactionCode = gatewayReference || 'TXN' + Date.now().toString().slice(-6);
        await invoice.save();

        // 2. Tạo một bản ghi Giao dịch (Transaction) theo chuẩn ERD
        const newTransaction = new Transaction({
            invoiceId: invoice._id,
            amount: invoice.totalAmount,
            method: method || 'Tiền mặt',
            status: 1, // 1: Thành công
            gatewayReference: invoice.transactionCode
        });
        await newTransaction.save();

        res.status(200).json({
            success: true,
            message: "Thanh toán thành công và đã ghi nhận giao dịch!",
            transaction: newTransaction
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi xử lý thanh toán: " + error.message });
    }
};

// 5. Cập nhật thông tin hóa đơn (Admin sửa trên Web/App)
exports.updateInvoice = async (req, res) => {
    try {
        const { status, paymentMethod, transactionCode } = req.body;
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn!" });

        let statusChangedToPaid = false;

        if (status !== undefined) {
            let statusNum = invoice.status;
            if (status === "Nháp" || status === 0 || Number(status) === 0) statusNum = 0;
            else if (status === "Chưa thanh toán" || status === 1 || Number(status) === 1) statusNum = 1;
            else if (status === "Đã thanh toán" || status === 2 || Number(status) === 2) statusNum = 2;
            else if (status === "Quá hạn" || status === 3 || Number(status) === 3) statusNum = 3;

            // Cờ để kiểm tra nếu chuyển từ trạng thái khác sang Đã thanh toán
            if (statusNum === 2 && invoice.status !== 2) {
                statusChangedToPaid = true;
            }

            // Cờ để kiểm tra nếu chuyển từ trạng thái khác sang Quá hạn
            if (statusNum === 3 && invoice.status !== 3) {
                // Tự động tính phí phạt 5% nếu chưa có phí phạt
                if (!invoice.penalty || invoice.penalty === 0) {
                    const baseAmount = invoice.totalAmount || 0;
                    const penaltyAmt = Math.round(baseAmount * 0.05);
                    invoice.penalty = penaltyAmt;
                    invoice.totalAmount = baseAmount + penaltyAmt;
                }
            }

            invoice.status = statusNum;
        }

        if (paymentMethod !== undefined) invoice.paymentMethod = paymentMethod;
        if (transactionCode !== undefined) invoice.transactionCode = transactionCode;

        await invoice.save();

        // Tự động tạo giao dịch nếu đổi thành Đã thanh toán
        if (statusChangedToPaid) {
            const newTransaction = new Transaction({
                invoiceId: invoice._id,
                amount: invoice.totalAmount,
                method: invoice.paymentMethod || 'Tiền mặt',
                status: 1, // Thành công
                gatewayReference: invoice.transactionCode || ''
            });
            await newTransaction.save();
        }

        res.status(200).json({ success: true, message: "Cập nhật hóa đơn thành công!", data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi cập nhật hóa đơn: " + error.message });
    }
};
// Lấy danh sách công nợ
exports.getDebts = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
            } catch (e) {}
        }
        if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

        const Room = require('../models/Room');
        const rooms = await Room.find({ landlordId: userId });
        const roomIds = rooms.map(r => r._id);

        const contracts = await Contract.find({ roomId: { $in: roomIds } })
            .populate('roomId', 'roomCode')
            .populate('tenantId', 'fullName name');
        const contractIds = contracts.map(c => c._id);

        // Fetch unpaid or overdue invoices
        const unpaidInvoices = await Invoice.find({
            contractId: { $in: contractIds },
            status: { $in: [1, 3] } // 1: Chưa TT, 3: Quá hạn
        });

        // Group by contract/room
        const debtMap = {};
        for (const inv of unpaidInvoices) {
            const contractIdStr = inv.contractId.toString();
            if (!debtMap[contractIdStr]) {
                const contract = contracts.find(c => c._id.toString() === contractIdStr);
                debtMap[contractIdStr] = {
                    contractId: contractIdStr,
                    room: inv.room || (contract && contract.roomId ? contract.roomId.roomCode : 'Không xác định'),
                    nguoiThue: inv.tenant || (contract && contract.tenantId ? (contract.tenantId.fullName || contract.tenantId.name) : 'Không xác định'),
                    totalDebt: 0,
                    unpaidInvoiceCount: 0,
                    invoices: []
                };
            }
            debtMap[contractIdStr].totalDebt += inv.totalAmount || 0;
            debtMap[contractIdStr].unpaidInvoiceCount += 1;
            debtMap[contractIdStr].invoices.push(inv);
        }

        const debts = Object.values(debtMap).sort((a, b) => b.totalDebt - a.totalDebt);

        res.status(200).json({ success: true, data: debts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi lấy công nợ: " + error.message });
    }
};

// Gửi nhắc nợ hàng loạt cho 1 phòng (contract)
exports.remindDebt = async (req, res) => {
    try {
        const { contractId } = req.params;
        const unpaidInvoices = await Invoice.find({
            contractId: contractId,
            status: { $in: [1, 3] }
        });

        if (unpaidInvoices.length === 0) {
            return res.status(400).json({ success: false, message: "Phòng này không có nợ!" });
        }

        const deliveries = [];
        for (const inv of unpaidInvoices) {
            deliveries.push(await remindInvoicePayment({
                invoiceId: inv._id,
                adminId: req.auth.id,
            }));
        }
        res.status(200).json({
            success: true,
            message: `Đã gửi nhắc thanh toán cho ${unpaidInvoices.length} hóa đơn.`,
            data: deliveries,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi nhắc nợ: " + error.message });
    }
};
