const Invoice = require('../models/Invoice');
const Contract = require('../models/Contract');
const Service = require('../models/Service');
const Transaction = require('../models/Transaction'); // Gọi thêm bảng Giao dịch
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'trohub_secret_key_2026';
const Account = require('../models/Account');

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
            .populate('roomId', 'roomCode')
            .populate('tenantId', 'fullName phone')
            .populate('services.serviceId', 'name type');

        const previewList = [];

        for (const contract of contracts) {
            const previousInvoice = await Invoice.findOne({ contractId: contract._id }).sort({ createdAt: -1 });
            
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
                        if (previousInvoice) electricityOld = previousInvoice.electricityNew || 0;
                    } else if (sName.includes('nước') || sName.includes('nuoc')) {
                        waterPrice = item.fixedPrice || 0;
                        if (previousInvoice) waterOld = previousInvoice.waterNew || 0;
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

            previewList.push({
                contractId: contract._id,
                room: contract.roomId.roomCode,
                tenant: contract.tenantId.fullName,
                roomAmount: roomAmount,
                electricityOld: electricityOld,
                electricityPrice: electricityPrice,
                waterOld: waterOld,
                waterPrice: waterPrice,
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
        const { invoices, period, dueDate } = req.body;
        if (!invoices || !Array.isArray(invoices)) {
            return res.status(400).json({ success: false, message: "Dữ liệu hóa đơn không hợp lệ" });
        }

        const createdInvoices = [];

        for (const data of invoices) {
            const electricityOld = Number(data.electricityOld) || 0;
            const electricityNew = Number(data.electricityNew) || 0;
            const electricityPrice = Number(data.electricityPrice) || 0;
            const electricityAmount = Math.max(0, electricityNew - electricityOld) * electricityPrice;

            const waterOld = Number(data.waterOld) || 0;
            const waterNew = Number(data.waterNew) || 0;
            const waterPrice = Number(data.waterPrice) || 0;
            const waterAmount = Math.max(0, waterNew - waterOld) * waterPrice;

            const roomAmount = Number(data.roomAmount) || 0;
            const services = Number(data.services) || 0;
            const parking = Number(data.parking) || 0;
            const internet = Number(data.internet) || 0;
            const garbage = Number(data.garbage) || 0;
            const discount = Number(data.discount) || 0;
            const totalAmount = roomAmount + electricityAmount + waterAmount + services + parking + internet + garbage - discount;

            let resolvedPeriod = period;
            if (!resolvedPeriod) {
                const d = new Date();
                resolvedPeriod = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            }

            const newInvoice = new Invoice({
                contractId: data.contractId || null,
                period: resolvedPeriod,
                dueDate: dueDate ? new Date(dueDate) : new Date(),
                totalAmount: Math.max(0, totalAmount),
                status: 1, // Chưa thanh toán
                room: data.room || "",
                tenant: data.tenant || "",
                roomAmount,
                electricityOld,
                electricityNew,
                electricity: electricityAmount,
                waterOld,
                waterNew,
                water: waterAmount,
                services,
                parking,
                internet,
                garbage,
                discount
            });

            await newInvoice.save();
            createdInvoices.push(newInvoice);
        }

        res.status(201).json({ success: true, message: `Đã tạo thành công ${createdInvoices.length} hóa đơn!`, data: createdInvoices });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi tạo hóa đơn hàng loạt: " + error.message });
    }
};

exports.remindInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
        
        invoice.remindCount = (invoice.remindCount || 0) + 1;
        if (invoice.remindCount >= 2 && invoice.status === 1) { // 1 = Chưa thanh toán
            invoice.status = 3; // 3 = Quá hạn
        }
        await invoice.save();
        res.status(200).json({ success: true, message: 'Đã gửi yêu cầu thanh toán', data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};

// 1. Lấy danh sách toàn bộ hóa đơn (Hiển thị lên bảng Web)
exports.getAllInvoices = async (req, res) => {
    try {
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
            // Chỉ lấy hóa đơn của hợp đồng hiện tại (đang thuê hoặc chờ ký), ẩn lịch sử hợp đồng cũ
            const activeContract = tenantContracts.find(c => c.status === 1 || c.status === 0 || c.status === 4);
            const currentContractIds = activeContract ? [activeContract._id] : [];
            
            // XÓA BỎ logic lấy hóa đơn theo tên phòng (roomCode) vì sẽ lấy nhầm hóa đơn của khách cũ!
            // Chỉ lấy hóa đơn gắn chính xác với contractId HIỆN TẠI của người thuê này.
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
                    { path: 'roomId', select: 'roomCode' },
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

        // Hỗ trợ lưu trực tiếp các trường tính toán từ Frontend
        if (room || tenant) {
            let resolvedContractId = contractId;
            if (!resolvedContractId && room) {
                const Room = require('../models/Room');
                const targetRoom = await Room.findOne({ roomCode: room });
                if (targetRoom) {
                    resolvedContractId = targetRoom._id; // Lưu tạm roomId làm contractId nếu không có hợp đồng
                    const contract = await Contract.findOne({ roomId: targetRoom._id }).sort({ createdAt: -1 });
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

            const electricityOld = Number(req.body.electricityOld) || 0;
            const electricityNew = Number(req.body.electricityNew) || 0;
            const electricityPrice = Number(req.body.electricityPrice) || 0;
            const electricityUsage = Math.max(0, electricityNew - electricityOld);
            const electricityAmount = electricityUsage * electricityPrice;

            const waterOld = Number(req.body.waterOld) || 0;
            const waterNew = Number(req.body.waterNew) || 0;
            const waterPrice = Number(req.body.waterPrice) || 0;
            const waterUsage = Math.max(0, waterNew - waterOld);
            const waterAmount = waterUsage * waterPrice;

            const total = Number(req.body.total) || Number(req.body.totalAmount) || 0;

            const newInvoice = new Invoice({
                contractId: resolvedContractId || null,
                period: resolvedPeriod,
                dueDate: parsedDueDate,
                totalAmount: total,
                status: resolvedStatus,
                room: room || "",
                tenant: tenant || "",
                fromDate: req.body.fromDate || "",
                toDate: req.body.toDate || "",
                roomAmount: Number(req.body.roomAmount) || 0,
                electricityOld,
                electricityNew,
                electricity: electricityAmount,
                waterOld,
                waterNew,
                water: waterAmount,
                services: Number(req.body.services) || 0,
                parking: Number(req.body.parking) || 0,
                internet: Number(req.body.internet) || 0,
                garbage: Number(req.body.garbage) || 0,
                discount: Number(req.body.discount) || 0,
                penaltyDays: Number(req.body.penaltyDays) || 0,
                penaltyRate: Number(req.body.penaltyRate) || 0.1,
                penalty: Number(req.body.penalty) || 0,
                paymentMethod: req.body.paymentMethod || "",
                transactionCode: req.body.transactionCode || "",
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

                const quantity = newIndex > oldIndex ? newIndex - oldIndex : 0;
                const amount = quantity * appliedPrice;

                detailRow.oldIndex = oldIndex;
                detailRow.newIndex = newIndex;
                detailRow.quantity = quantity;
                detailRow.amount = amount;
            } else {
                // Loại 2: Tính khoán (Wifi, Rác...)
                detailRow.quantity = 1;
                detailRow.amount = appliedPrice;
            }

            totalAmount += detailRow.amount;
            details.push(detailRow);
        }

        const newInvoice = new Invoice({
            contractId,
            period,
            dueDate,
            totalAmount,
            status: 1, // 1: Chưa thanh toán (mặc định cho logic cũ)
            details
        });

        await newInvoice.save();
        res.status(201).json({ success: true, message: "Xuất hóa đơn thành công!", data: newInvoice });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi tạo hóa đơn: " + error.message });
    }
};

// 3. Xem chi tiết 1 hóa đơn
exports.getInvoiceById = async (req, res) => {
    try {
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