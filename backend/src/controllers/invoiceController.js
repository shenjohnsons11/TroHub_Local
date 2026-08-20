const Invoice = require('../models/Invoice');
const Contract = require('../models/Contract');
const Service = require('../models/Service');
const Transaction = require('../models/Transaction'); // Gọi thêm bảng Giao dịch
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const Account = require('../models/Account');
const BillingPolicy = require('../models/BillingPolicy');
const Room = require('../models/Room');
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
const { sendNotification } = require('../services/notificationService');
const { notifyLandlord } = require('../services/landlordNotificationService');
const { presentInvoice } = require('../services/invoicePresentationService');

function formatVndCurrency(amount) {
    if (!amount) return '0đ';
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}

async function syncRoomMeterReadings({
    roomId,
    electricityNew,
    waterNew,
    reason = 'invoice',
}) {
    if (!roomId) return;
    const update = {
        $unset: { draftElectricity: '', draftWater: '' },
    };

    if (Number.isFinite(Number(electricityNew))) {
        update.$set = update.$set || {};
        update.$set.lastElectricityReading = Number(electricityNew);
    }
    if (Number.isFinite(Number(waterNew))) {
        update.$set = update.$set || {};
        update.$set.lastWaterReading = Number(waterNew);
    }

    if (!update.$set) {
        return;
    }

    await Room.findByIdAndUpdate(roomId, update);
}

async function triggerInvoiceNotification(invoice, contractSnapshot = null) {
    try {
        if (!invoice) return;
        let tenantId = null;
        let roomCode = invoice.room || '';

        if (invoice.contractId) {
            const contract = contractSnapshot || await Contract.findById(invoice.contractId);
            if (contract) {
                tenantId = contract.tenantId;
                if (!roomCode && contract.roomId) {
                    const roomObj = await Room.findById(contract.roomId);
                    if (roomObj) roomCode = roomObj.roomCode;
                }
            }
        }

        if (!tenantId && invoice.tenant) {
            const tenantAcc = await Account.findOne({ fullName: invoice.tenant, role: 2 });
            if (tenantAcc) tenantId = tenantAcc._id;
        }

        if (tenantId) {
            const totalStr = formatVndCurrency(invoice.totalAmount);
            const periodStr = invoice.period || '';
            await sendNotification({
                userId: tenantId,
                title: `Hóa đơn mới kỳ ${periodStr}`,
                content: `Hóa đơn phòng ${roomCode} kỳ ${periodStr} với tổng tiền ${totalStr} đã phát hành. Vui lòng thanh toán đúng hạn.`,
                category: "invoice",
                deepLink: 'invoice',
                metadata: { invoiceId: invoice._id, period: periodStr, totalAmount: invoice.totalAmount, action: 'view' },
                eventKey: `invoice:${invoice._id}:issued`,
            });
        }
    } catch (err) {
        console.error('[triggerInvoiceNotification Error]', err.message);
    }
}

async function triggerInvoiceReminder(invoice) {
    const contract = invoice.contractId && await Contract.findById(invoice.contractId);
    if (!contract?.tenantId) return;
    await sendNotification({
        userId: contract.tenantId,
        title: `Nhắc thanh toán hóa đơn kỳ ${invoice.period || ''}`,
        content: 'Chủ trọ vừa gửi nhắc nhở thanh toán. Vui lòng kiểm tra hóa đơn và thanh toán đúng hạn.',
        category: 'invoice',
        deepLink: 'invoice',
        metadata: { invoiceId: invoice._id, period: invoice.period, action: 'payment' },
        eventKey: `invoice:${invoice._id}:reminder:${invoice.remindCount}`,
    });
}
const {
    resolveUtilityPriceDefaults,
    resolveContractMeterSnapshot,
} = require('../services/contractTerms');

async function buildInvoicePolicySnapshot(req, issuedAt, penaltyBaseAmount) {
    const policy = await BillingPolicy.findOne({ landlordId: req.auth?.id });
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

        const [rooms, utilityServices] = await Promise.all([
            Room.find({ landlordId: userId }),
            Service.find({ landlordId: userId, isActive: true, type: 1 }).sort({ updatedAt: -1, _id: -1 }).select('name code type defaultPrice').lean(),
        ]);
        const roomIds = rooms.map(r => r._id);
        const utilityDefaults = resolveUtilityPriceDefaults(utilityServices);

        const contracts = await Contract.find({ roomId: { $in: roomIds }, status: 1 })
            .populate('roomId', 'roomCode draftElectricity draftWater lastElectricityReading lastWaterReading')
            .populate('tenantId', 'fullName phone')
            .populate('services.serviceId', 'name type');

        const previewList = [];

        for (const contract of contracts) {
            const previousInvoice = await Invoice.findOne({
                contractId: contract._id,
                status: { $in: [1, 2, 3] }
            }).sort({ createdAt: -1 });

            const roomAmount = contract.fixedRentPrice || 0;

            const {
                electricityOld,
                waterOld,
                electricityPrice,
                waterPrice,
            } = resolveContractMeterSnapshot(contract, previousInvoice, contract.roomId, utilityDefaults);
            let servicesTotal = 0;
            let parking = 0;
            let internet = 0;
            let garbage = 0;

            for (const item of contract.services) {
                const service = item.serviceId;
                if (!service) continue;
                const sName = service.name.toLowerCase();

                if (service.type !== 1) {
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

            const rawDraftElec = contract.roomId?.draftElectricity;
            const rawDraftWater = contract.roomId?.draftWater;

            const electricityDraft = (rawDraftElec !== undefined && rawDraftElec !== null && Number(rawDraftElec) > Number(electricityOld))
                ? rawDraftElec
                : "";

            const waterDraft = (rawDraftWater !== undefined && rawDraftWater !== null && Number(rawDraftWater) > Number(waterOld))
                ? rawDraftWater
                : "";

            previewList.push({
                contractId: contract._id,
                roomId: contract.roomId._id,
                room: contract.roomId.roomCode,
                tenant: contract.tenantId.fullName,
                roomAmount: roomAmount,
                electricityOld: electricityOld,
                electricityPrice: electricityPrice,
                electricityDraft: electricityDraft,
                waterOld: waterOld,
                waterPrice: waterPrice,
                waterDraft: waterDraft,
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
        const contractIds = [...new Set(
            preparedInvoices
                .map(({ data }) => data.contractId)
                .filter(Boolean)
                .map(String)
        )];
        const [policy, unpaidInvoices, contracts] = await Promise.all([
            BillingPolicy.findOne({ landlordId: req.auth.id }),
            contractIds.length
                ? Invoice.find({
                    contractId: { $in: contractIds },
                    status: { $in: [1, 3] }
                }).select('contractId totalAmount').lean()
                : [],
            contractIds.length
                ? Contract.find({ _id: { $in: contractIds } }).select('_id roomId').lean()
                : [],
        ]);
        const debtByContract = new Map();
        for (const invoice of unpaidInvoices) {
            const contractId = String(invoice.contractId);
            debtByContract.set(
                contractId,
                (debtByContract.get(contractId) || 0) + (invoice.totalAmount || 0)
            );
        }

        let resolvedPeriod = period;
        if (!resolvedPeriod) {
            const d = new Date();
            resolvedPeriod = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }

        const invoiceDocuments = preparedInvoices.map(({ data, amounts }) => {
            const policySnapshot = buildLateFeeSnapshot({
                issuedAt: data.issuedAt || issuedAt || new Date(),
                graceDays: policy?.lateFeeGraceDays ?? 3,
                penaltyRate: policy?.lateFeeRate ?? 5,
                penaltyBaseAmount: amounts.totalAmount,
            });
            const penaltyAppliedAt = policySnapshot.isOverdue ? new Date() : null;
            const penalty = policySnapshot.isOverdue ? policySnapshot.penalty : 0;

            let warningNote = "";
            if (data.contractId) {
                const totalDebt = debtByContract.get(String(data.contractId)) || 0;
                if (totalDebt > 0) {
                    warningNote = `LƯU Ý: Phòng đang có khoản nợ ${totalDebt.toLocaleString("vi-VN")}đ từ kỳ trước chưa thanh toán.`;
                }
            }

            return {
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
            };
        });
        const createdInvoices = await Invoice.insertMany(invoiceDocuments);
        const roomOps = [];
        const invoiceByContractId = new Map(createdInvoices.map((invoice) => [String(invoice.contractId), invoice]));
        for (const contract of contracts) {
            const invoice = invoiceByContractId.get(String(contract._id));
            const roomId = contract.roomId?._id || contract.roomId;
            if (!invoice) continue;
            roomOps.push({
                updateOne: {
                    filter: { _id: roomId },
                    update: {
                        $set: {
                            lastElectricityReading: Number(invoice.electricityNew) || 0,
                            lastWaterReading: Number(invoice.waterNew) || 0,
                        },
                        $unset: { draftElectricity: "", draftWater: "" },
                    },
                },
            });
        }
        if (roomOps.length) {
            await Room.bulkWrite(roomOps);
        }

        await Promise.all(createdInvoices.map(async (inv) => {
            const contract = contracts.find((item) => String(item._id) === String(inv.contractId));
            const tenantId = contract?.tenantId?._id || contract?.tenantId;
            if (!tenantId) return;
            await triggerInvoiceNotification(inv, contract);
            await sendNotification({
                userId: tenantId,
                title: `Đã chốt chỉ số điện nước kỳ ${inv.period || ''}`,
                content: `Điện ${inv.electricityOld} → ${inv.electricityNew} kWh, nước ${inv.waterOld} → ${inv.waterNew} m³.`,
                category: 'utility',
                deepLink: 'utility',
                metadata: { roomId: contract?.roomId?._id || contract?.roomId, period: inv.period, electricityOld: inv.electricityOld, electricityNew: inv.electricityNew, waterOld: inv.waterOld, waterNew: inv.waterNew },
                eventKey: `utility:${inv._id}:confirmed`,
            });
        }));

        res.status(201).json({ success: true, message: `Đã tạo thành công ${createdInvoices.length} hóa đơn!`, data: createdInvoices });
    } catch (error) {
        return sendInvoiceError(res, error, 'Lỗi tạo hóa đơn hàng loạt');
    }
};

// Gửi nhắc nhở thanh toán hóa đơn (Nhắc nợ)
exports.remindInvoicePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await Invoice.findById(id);
        if (!invoice) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
        }

        // 1. Kiểm tra quyền Chủ trọ
        const landlordId = req.auth?.id;
        if (!landlordId) {
            return res.status(401).json({ success: false, message: 'Chưa xác thực thông tin đăng nhập' });
        }

        let contract = null;
        if (invoice.contractId) {
            contract = await Contract.findById(invoice.contractId)
                .populate({ path: 'roomId', select: 'roomCode landlordId' })
                .populate({ path: 'tenantId', select: '_id fullName phone email' });
        }

        if (contract && contract.roomId && contract.roomId.landlordId) {
            const roomLandlordId = contract.roomId.landlordId._id || contract.roomId.landlordId;
            if (roomLandlordId.toString() !== landlordId.toString() && req.auth.role !== 1) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên hóa đơn này' });
            }
        }

        // 2. Tìm thông tin Khách thuê
        let tenantId = null;
        let tenantAccount = null;

        if (contract?.tenantId) {
            tenantId = contract.tenantId._id || contract.tenantId;
            tenantAccount = typeof contract.tenantId === 'object' && contract.tenantId.fullName ? contract.tenantId : await Account.findById(tenantId);
        }

        if (!tenantId && invoice.tenant) {
            tenantAccount = await Account.findOne({ fullName: invoice.tenant, role: 2 });
            if (tenantAccount) tenantId = tenantAccount._id;
        }

        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Không tìm thấy thông tin Khách thuê cho hóa đơn này' });
        }

        // 3. Chuẩn bị nội dung thông báo
        const roomName = contract?.roomId?.roomCode || invoice.room || 'N/A';
        const formattedAmount = (invoice.totalAmount || 0).toLocaleString('vi-VN');
        
        let periodStr = invoice.period || '';
        let month = '';
        let year = '';
        if (periodStr.includes('/')) {
            const parts = periodStr.split('/');
            month = parts[0].replace(/\D/g, '') || parts[0];
            year = parts[1].replace(/\D/g, '') || parts[1];
        } else {
            const now = new Date();
            month = String(now.getMonth() + 1);
            year = String(now.getFullYear());
        }

        const title = "🔔 Nhắc nợ Hóa đơn";
        const message = `Hóa đơn tháng ${month}/${year} phòng ${roomName} số tiền ${formattedAmount}đ đã đến hạn thanh toán. Vui lòng kiểm tra và thanh toán.`;
        const deepLink = `/tenant/invoices/${invoice._id}`;

        // 4. Cập nhật lượt nhắc nợ / trạng thái hóa đơn
        invoice.remindCount = (invoice.remindCount || 0) + 1;
        if (invoice.remindCount >= 2 && invoice.status === 1) { // 1 = Chưa thanh toán
            invoice.status = 3; // 3 = Quá hạn
        }
        await invoice.save();

        // 5. Tạo Notification, Socket Realtime & Gửi Expo Push Notification
        await sendNotification({
            userId: tenantId,
            title,
            content: message,
            category: "invoice",
            deepLink,
            metadata: {
                invoiceId: invoice._id,
                period: invoice.period,
                totalAmount: invoice.totalAmount,
                action: 'remind',
            },
            eventKey: `invoice:${invoice._id}:remind:${invoice.remindCount}:${Date.now()}`,
        });

        return res.status(200).json({
            success: true,
            message: "Đã gửi thông báo nhắc nợ thành công!",
            data: invoice
        });
    } catch (error) {
        console.error('[remindInvoicePayment Error]', error);
        return res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};

exports.remindInvoice = exports.remindInvoicePayment;

// 1. Lấy danh sách toàn bộ hóa đơn (Hiển thị lên bảng Web)
exports.getAllInvoices = async (req, res) => {
    try {
        await applyAllOverduePenalties();
        const userId = req.auth.id;
        const userRole = req.auth.role;

        let query = {};

        if (userRole === 2 && userId) {
            const tenantContracts = await Contract.find({ tenantId: userId }).sort({ createdAt: -1 });
            const currentContractIds = tenantContracts.map(c => c._id);

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
                        select: 'roomCode landlordId defaultRentPrice',
                        populate: { path: 'landlordId', select: 'bankId bankAccountNo bankAccountName fullName' }
                    },
                    { path: 'tenantId', select: 'fullName phone' }
                ]
            })
            .populate('details.serviceId', 'name type')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: invoices.map(presentInvoice) });
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

        // Hỗ trợ lưu trực tiếp các trường tính toán từ Frontend hoặc từ roomId
        if (room || tenant || req.body.roomId) {
            let resolvedContractId = contractId;
            let resolvedRoomId = req.body.roomId || null;
            let resolvedRoom = room || "";
            let resolvedTenant = tenant || "";

            let resolvedContract = null;
            if (req.body.roomId) {
                const Room = require('../models/Room');
                const targetRoom = await Room.findById(req.body.roomId);
                if (targetRoom) {
                    resolvedRoomId = targetRoom._id;
                    resolvedRoom = targetRoom.roomCode;
                    const contract = await Contract.findOne({ roomId: targetRoom._id, status: { $in: [0, 1, 4, 5] } })
                        .populate('tenantId', 'fullName')
                        .sort({ createdAt: -1 });
                    if (contract) {
                        resolvedContract = contract;
                        resolvedContractId = contract._id;
                        if (!resolvedTenant && contract.tenantId) {
                            resolvedTenant = contract.tenantId.fullName || "";
                        }
                    }
                }
            } else if (!resolvedContractId && room) {
                const Room = require('../models/Room');
                const roomQuery = { roomCode: room };
                if (landlordId) roomQuery.landlordId = landlordId;

                const targetRoom = await Room.findOne(roomQuery);
                if (targetRoom) {
                    resolvedContractId = targetRoom._id; // Lưu tạm roomId làm contractId nếu không có hợp đồng
                    resolvedRoomId = targetRoom._id;
                    const contract = await Contract.findOne({ roomId: targetRoom._id, status: { $in: [0, 1, 4, 5] } }).sort({ createdAt: -1 });
                    if (contract) {
                        resolvedContract = contract;
                        resolvedContractId = contract._id;
                        resolvedRoomId = contract.roomId?._id || contract.roomId;
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

            const targetRoomObj = resolvedRoomId ? await Room.findById(resolvedRoomId) : null;
            const electricityOld = req.body.electricityOld !== undefined && req.body.electricityOld !== null && req.body.electricityOld !== ''
                ? Number(req.body.electricityOld)
                : (targetRoomObj?.lastElectricityReading || 0);
            const electricityNew = req.body.electricityNew !== undefined && req.body.electricityNew !== null && req.body.electricityNew !== ''
                ? Number(req.body.electricityNew)
                : (targetRoomObj?.draftElectricity !== undefined && targetRoomObj?.draftElectricity !== null ? Number(targetRoomObj.draftElectricity) : electricityOld);
            const electricityPrice = req.body.electricityPrice !== undefined && req.body.electricityPrice !== null && req.body.electricityPrice !== ''
                ? Number(req.body.electricityPrice)
                : (resolvedContract?.electricityPrice || 3500);

            const waterOld = req.body.waterOld !== undefined && req.body.waterOld !== null && req.body.waterOld !== ''
                ? Number(req.body.waterOld)
                : (targetRoomObj?.lastWaterReading || 0);
            const waterNew = req.body.waterNew !== undefined && req.body.waterNew !== null && req.body.waterNew !== ''
                ? Number(req.body.waterNew)
                : (targetRoomObj?.draftWater !== undefined && targetRoomObj?.draftWater !== null ? Number(targetRoomObj.draftWater) : waterOld);
            const waterPrice = req.body.waterPrice !== undefined && req.body.waterPrice !== null && req.body.waterPrice !== ''
                ? Number(req.body.waterPrice)
                : (resolvedContract?.waterPrice || 15000);

            const roomAmount = req.body.roomAmount !== undefined && req.body.roomAmount !== null && req.body.roomAmount !== ''
                ? Number(req.body.roomAmount)
                : (resolvedContract?.monthlyRent || resolvedContract?.fixedRentPrice || targetRoomObj?.basePrice || targetRoomObj?.defaultRentPrice || 0);

            const amounts = calculateInvoiceAmounts({
                ...req.body,
                electricityOld,
                electricityNew,
                electricityPrice,
                waterOld,
                waterNew,
                waterPrice,
                roomAmount,
                penalty: 0
            });

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
                room: resolvedRoom || "",
                tenant: resolvedTenant || "",

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
            if (resolvedRoomId && (req.body.electricityNew !== undefined || req.body.waterNew !== undefined || req.body.serviceIndices !== undefined)) {
                await syncRoomMeterReadings({
                    roomId: resolvedRoomId,
                    electricityNew: newInvoice.electricityNew,
                    waterNew: newInvoice.waterNew,
                    reason: 'single-invoice',
                });
            }
            await triggerInvoiceNotification(newInvoice);
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
        const invoiceRoomId = contract?.roomId?._id || contract?.roomId;
        if (invoiceRoomId) {
            await syncRoomMeterReadings({
                roomId: invoiceRoomId,
                electricityNew: newInvoice.electricityNew,
                waterNew: newInvoice.waterNew,
                reason: 'manual-invoice',
            });
        }
        await triggerInvoiceNotification(newInvoice);
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
                    { path: 'roomId', select: 'roomCode area defaultRentPrice' },
                    { path: 'tenantId', select: 'fullName phone idCard' }
                ]
            })
            .populate('details.serviceId', 'name unit'); // Lấy thêm tên dịch vụ (Điện, Nước) và đơn vị

        if (!invoice) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn!" });
        res.status(200).json({ success: true, data: presentInvoice(invoice) });
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
        if ([2, 4].includes(invoice.status)) return res.status(400).json({ success: false, message: "Hóa đơn này đã được thanh toán hoặc gộp quyết toán!" });

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

        await notifyLandlord({
            event: 'invoice_paid',
            contractId: invoice.contractId,
            entityId: invoice._id,
        });

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

        // Increment remindCount
        for (const inv of unpaidInvoices) {
            inv.remindCount = (inv.remindCount || 0) + 1;
            await inv.save();
            await triggerInvoiceReminder(inv);
        }

        res.status(200).json({ success: true, message: `Đã gửi nhắc nợ cho ${unpaidInvoices.length} hóa đơn.` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi nhắc nợ: " + error.message });
    }
};
