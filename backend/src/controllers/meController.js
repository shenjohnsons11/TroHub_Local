const Account = require('../models/Account');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const RepairRequest = require('../models/RepairRequest');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'trohub_secret_key_2026';

// Hàm lấy tenantId từ JWT token trong header Authorization
const getTenantIdFromToken = (req) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.id;
    } catch (e) {
        return null;
    }
};

// GET /api/me - Lấy toàn bộ dữ liệu portal người thuê (dùng cho Web)
exports.getTenantPortal = async (req, res) => {
    try {
        const tenantId = getTenantIdFromToken(req);
        if (!tenantId) {
            return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để xem thông tin!' });
        }

        const tenant = await Account.findById(tenantId);
        if (!tenant || tenant.role !== 2) {
            return res.status(403).json({ success: false, message: 'Chỉ người thuê mới có thể truy cập trang này!' });
        }

        // Lấy TẤT CẢ hợp đồng (bao gồm cả Chờ ký status=0) của tenant này
        const contracts = await Contract.find({ tenantId: tenantId })
            .populate('roomId', 'roomCode area defaultRentPrice defaultDeposit')
            .sort({ createdAt: -1 });

        // Lấy hợp đồng đang hiệu lực (status = 0 chờ ký HOẶC status = 1 đang thuê)
        const activeContract = contracts.find(c => c.status === 1) || contracts.find(c => c.status === 0) || null;

        // Thông tin phòng
        let roomInfo = null;
        if (activeContract && activeContract.roomId) {
            const r = activeContract.roomId;
            roomInfo = {
                id: r.roomCode || '',
                name: 'Phòng ' + (r.roomCode || ''),
                rent: r.defaultRentPrice || activeContract.fixedRentPrice || 0,
                deposit: r.defaultDeposit || activeContract.fixedDeposit || 0,
                area: r.area || 0,
                status: 'Đang thuê'
            };
        }

        const allContractIds = contracts.map(c => c._id);

        // Lấy tất cả hóa đơn theo hợp đồng HIỆN TẠI (activeContract), bỏ qua hóa đơn nháp status: 0
        let invoices = [];
        const currentContractIds = activeContract ? [activeContract._id] : [];

        if (currentContractIds.length > 0) {
            const rawInvoices = await Invoice.find({ contractId: { $in: currentContractIds }, status: { $ne: 0 } }).sort({ createdAt: -1 });
            invoices = rawInvoices.map(inv => ({
                id: inv.invoiceCode || inv._id.toString(),
                month: inv.period || '',
                fromDate: inv.fromDate || '',
                toDate: inv.toDate || '',
                dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('vi-VN') : '',
                roomAmount: inv.roomAmount || 0,
                electricity: inv.electricity || 0,
                water: inv.water || 0,
                services: inv.services || 0,
                discount: inv.discount || 0,
                penalty: inv.penalty || 0,
                total: inv.totalAmount || 0,
                status: ['Nháp', 'Chưa thanh toán', 'Đã thanh toán', 'Quá hạn'][inv.status] || 'Nháp'
            }));
        }

        // Đã xóa block lấy hóa đơn theo roomInfo.id vì nó sẽ lấy nhầm hóa đơn của khách thuê cũ gán cho khách mới
        // Khách mới chỉ thấy hóa đơn nếu hợp đồng của họ (contractId) thực sự phát sinh hóa đơn!

        // Lấy lịch sử giao dịch của hóa đơn thuộc hợp đồng hiện tại
        const invoiceIds = invoices.map(i => i.id);
        let payments = [];
        if (currentContractIds.length > 0) {
            const rawInvoiceObjs = await Invoice.find({ contractId: { $in: currentContractIds } });
            const invoiceMongoIds = rawInvoiceObjs.map(i => i._id);
            const transactions = await Transaction.find({ invoiceId: { $in: invoiceMongoIds } }).sort({ createdAt: -1 });
            payments = transactions.map((t, idx) => ({
                id: t._id.toString(),
                invoiceId: t.invoiceId ? t.invoiceId.toString() : '',
                month: '',
                date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : '',
                method: t.method || 'Tiền mặt',
                amount: t.amount || 0,
                status: t.status === 1 ? 'Đã thanh toán' : 'Thất bại'
            }));
        }

        let repairs = [];
        if (currentContractIds.length > 0) {
            const rawRepairs = await RepairRequest.find({ contractId: { $in: currentContractIds } })
                .sort({ createdAt: -1 })
                .allowDiskUse(true);
            repairs = rawRepairs.map(r => ({
                id: r._id.toString(),
                category: r.title || '',
                description: r.content || '',
                date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '',
                status: ['Mới', 'Đang xử lý', 'Đã hoàn thành', 'Đã hủy'][r.status] || 'Mới',
                priority: ['Chưa phân loại', 'Thấp', 'Trung bình', 'Cao'][r.priority] || 'Chưa phân loại',
                note: r.landlordNote || '',
                images: r.images || []
            }));
        }

        // Tính toán thống kê
        const paidInvoices = invoices.filter(i => i.status === 'Đã thanh toán');
        const unpaidInvoices = invoices.filter(i => i.status !== 'Đã thanh toán');
        const paidTotal = paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
        const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
        const penaltyTotal = invoices.reduce((sum, i) => sum + (i.penalty || 0), 0);

        // Mapping hợp đồng cho frontend
        const contractsMapped = contracts.map(c => ({
            id: c._id.toString(),
            room: c.roomId ? c.roomId.roomCode : '',
            tenant: tenant.fullName,
            startDate: c.startDate ? new Date(c.startDate).toLocaleDateString('vi-VN') : '',
            endDate: c.endDate ? new Date(c.endDate).toLocaleDateString('vi-VN') : '',
            rent: c.fixedRentPrice || 0,
            deposit: c.fixedDeposit || 0,
            status: ['Chờ ký', 'Đang hiệu lực', 'Đã kết thúc', 'Đã hủy', 'Chờ chủ duyệt', 'Yêu cầu trả phòng'][c.status] || 'Chờ ký',
            tenantAccepted: c.status > 0
        }));

        res.status(200).json({
            success: true,
            data: {
                tenant: {
                    id: tenant._id.toString(),
                    name: tenant.fullName,
                    phone: tenant.phone,
                    email: tenant.email || '',
                    room: roomInfo ? roomInfo.id : '-'
                },
                room: roomInfo,
                contracts: contractsMapped,
                invoices,
                payments,
                repairs,
                stats: {
                    unpaidInvoiceCount: unpaidInvoices.length,
                    unpaidTotal,
                    paidTotal,
                    penaltyTotal
                }
            }
        });
    } catch (error) {
        console.error('meController error:', error);
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};

// PUT /api/me/sign-contract/:contractId - Người thuê ký hợp đồng
exports.signContract = async (req, res) => {
    try {
        const tenantId = getTenantIdFromToken(req);
        if (!tenantId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

        const contract = await Contract.findById(req.params.contractId);
        if (!contract) return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng!' });
        if (contract.tenantId.toString() !== tenantId.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền ký hợp đồng này!' });
        }
        if (contract.status !== 0) {
            return res.status(400).json({ success: false, message: 'Hợp đồng không ở trạng thái chờ ký!' });
        }

        contract.status = 4;
        contract.tenantConfirmedAt = new Date();
        await contract.save();

        res.status(200).json({ success: true, message: 'Đã ký hợp đồng thành công! Đang chờ chủ trọ duyệt và xác nhận để hợp đồng có hiệu lực.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};

// PUT /api/me/pay-invoice/:invoiceId - Người thuê thanh toán hóa đơn
exports.payInvoice = async (req, res) => {
    try {
        const tenantId = getTenantIdFromToken(req);
        if (!tenantId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

        const invoice = await Invoice.findById(req.params.invoiceId);
        if (!invoice) return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn!' });
        if (invoice.status === 2) return res.status(400).json({ success: false, message: 'Hóa đơn đã được thanh toán!' });

        invoice.status = 2;
        invoice.paymentMethod = req.body.paymentMethod || 'QR ngân hàng';
        invoice.transactionCode = 'TXN' + Date.now().toString().slice(-6);
        await invoice.save();

        const newTransaction = new Transaction({
            invoiceId: invoice._id,
            amount: invoice.totalAmount,
            method: req.body.paymentMethod || 'QR ngân hàng',
            status: 1,
            gatewayReference: invoice.transactionCode
        });
        await newTransaction.save();

        res.status(200).json({ success: true, message: 'Thanh toán hóa đơn thành công!', transaction: newTransaction });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};

// POST /api/me/repairs - Người thuê gửi yêu cầu sửa chữa
exports.createRepair = async (req, res) => {
    try {
        const tenantId = getTenantIdFromToken(req);
        if (!tenantId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

        const activeContract = await Contract.findOne({ tenantId, status: 1 });
        if (!activeContract) {
            // Thử tìm hợp đồng bất kỳ
            const anyContract = await Contract.findOne({ tenantId }).sort({ createdAt: -1 });
            if (!anyContract) {
                return res.status(400).json({ success: false, message: 'Bạn không có hợp đồng để gửi yêu cầu sửa chữa!' });
            }
        }

        const contractToUse = activeContract || await Contract.findOne({ tenantId }).sort({ createdAt: -1 });

        let imagesArray = [];
        console.log("ME_CONTROLLER: Received images typeof:", typeof req.body.images, "isArray:", Array.isArray(req.body.images));
        if (typeof req.body.images === 'string') {
            console.log("ME_CONTROLLER string preview:", req.body.images.substring(0, 100));
        }
        if (Array.isArray(req.body.images)) {
            imagesArray = req.body.images.map(img => {
                if (typeof img === 'string') return img;
                return img.fileUrl || img.url || '';
            }).filter(Boolean);
        }

        const newRepair = new RepairRequest({
            contractId: contractToUse._id,
            title: req.body.category || req.body.title || 'Yêu cầu sửa chữa',
            content: req.body.description || req.body.content || '',
            priority: 0,
            status: 0,
            images: imagesArray
        });
        await newRepair.save();

        res.status(201).json({ success: true, message: 'Đã gửi yêu cầu sửa chữa!', data: newRepair });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};

// PUT /api/me/request-terminate/:contractId - Người thuê yêu cầu trả phòng
exports.requestTerminateContract = async (req, res) => {
    try {
        const tenantId = getTenantIdFromToken(req);
        if (!tenantId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

        const contract = await Contract.findById(req.params.contractId);
        if (!contract) return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng!' });
        if (contract.tenantId.toString() !== tenantId.toString()) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này!' });
        }
        if (contract.status !== 1) {
            return res.status(400).json({ success: false, message: 'Hợp đồng không ở trạng thái Đang thuê để trả phòng!' });
        }

        // Kiểm tra nợ
        const unpaidInvoice = await Invoice.findOne({ contractId: contract._id, status: { $in: [1, 3] } });
        if (unpaidInvoice) {
            return res.status(400).json({ 
                success: false, 
                message: "Bạn cần thanh toán toàn bộ hóa đơn trước khi yêu cầu trả phòng." 
            });
        }

        // Đổi trạng thái sang Chờ duyệt trả phòng (5)
        contract.status = 5;
        await contract.save();

        res.status(200).json({ success: true, message: 'Đã gửi yêu cầu trả phòng thành công. Vui lòng chờ chủ trọ xác nhận!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server: ' + error.message });
    }
};

exports.deleteRepair = async (req, res) => {
    try {
        const deletedRequest = await RepairRequest.findByIdAndDelete(req.params.id);
        if (!deletedRequest) {
            return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu sửa chữa này!" });
        }
        res.status(200).json({ success: true, message: "Đã xóa yêu cầu sửa chữa thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi xóa yêu cầu sửa chữa: " + error.message });
    }
};
