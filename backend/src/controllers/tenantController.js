const Account = require('../models/Account');
const Room = require('../models/Room');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const RepairRequest = require('../models/RepairRequest');
const bcrypt = require('bcryptjs');
const { createOrLinkTenant, lookupTenantAccount } = require('../services/tenantLinkService');

// =========================================================================
// PHẦN 1: DÀNH CHO GIAO DIỆN WEB (CHỦ TRỌ QUẢN LÝ)
// =========================================================================

// 1. Lấy danh sách toàn bộ người thuê (role = 2) thuộc danh bạ của Chủ trọ
exports.getAllTenants = async (req, res) => {
    try {
        let landlordId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'trohub_secret_key_2026');
                if (decoded.role === 1) landlordId = decoded.id;
            } catch(e) {}
        }

        if (!landlordId) return res.status(401).json({ success: false, message: "Không tìm thấy thông tin chủ trọ!" });

        // Lấy tất cả người thuê mà trong linkedLandlords hoặc pendingLandlords có chứa landlordId
        let tenants = await Account.find({
            role: 2,
            $or: [{ linkedLandlords: landlordId }, { pendingLandlords: landlordId }]
        }).lean().sort({ createdAt: -1 });

        // Populate room from active contracts (1: Hiệu lực, 5: Yêu cầu trả phòng) để hiển thị thông tin phòng nếu có
        const activeContracts = await Contract.find({ status: { $in: [1, 5] } }).populate('roomId');

        for (let t of tenants) {
            // Đánh dấu nếu Người thuê đang chờ xác nhận
            if (t.pendingLandlords && t.pendingLandlords.some(id => id.toString() === landlordId.toString())) {
                t.pending = true;
            }

            const contract = activeContracts.find(c => c.tenantId && c.tenantId.toString() === t._id.toString());
            if (contract && contract.roomId) {
                t.room = contract.roomId.roomCode || contract.roomId.name;
                t.contractStatus = contract.status;
            } else {
                t.room = "Chưa xếp phòng";
                t.contractStatus = "Không có";
            }
        }

        res.status(200).json({
            success: true,
            message: "Lấy danh sách người thuê thành công!",
            data: tenants
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};
// 1.5. Real-time Duplicate Check
exports.checkDuplicate = async (req, res) => {
    try {
        let landlordId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'trohub_secret_key_2026');
                if (decoded.role === 1) landlordId = decoded.id;
            } catch(e) {}
        }
        if (!landlordId) return res.status(401).json({ success: false, message: "Không tìm thấy thông tin chủ trọ!" });

        const { field, value } = req.body; // field = 'email', 'phone', or 'idCard'
        if (!field || !value) return res.status(200).json({ success: true, isDuplicate: false });

        if (field === 'idCard' || field === 'citizenId') {
            const existingIdCard = await Account.findOne({ idCard: value, role: 2 });
            if (existingIdCard) {
                return res.status(200).json({ success: true, isDuplicate: true, message: "Số CCCD này đã được đăng ký cho một tài khoản khác trên hệ thống!" });
            }
        } else if (field === 'email' || field === 'phone') {
            const query = field === 'email' ? { email: value } : { phone: value };
            const existingAccount = await Account.findOne({ ...query, role: 2 });
            if (existingAccount && existingAccount.linkedLandlords.some(id => id.toString() === landlordId.toString())) {
                const msg = field === 'email' ? "Email này đã tồn tại trong danh sách của bạn!" : "Số điện thoại đã có người đăng ký trong danh sách của bạn!";
                return res.status(200).json({ success: true, isDuplicate: true, message: msg });
            }
        }

        return res.status(200).json({ success: true, isDuplicate: false });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

exports.lookupTenant = async (req, res) => {
    try {
        const tenant = await lookupTenantAccount(req.query.identifier);
        res.status(200).json({ success: true, found: Boolean(tenant), data: tenant });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
    }
};

// 2. Tạo hoặc liên kết người thuê vào một hợp đồng nháp
exports.createTenant = async (req, res) => {
    try {
        let landlordId = req.auth?.id || null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'trohub_secret_key_2026');
                if (decoded.role === 1) landlordId = decoded.id;
            } catch(e) {}
        }
        if (!landlordId) return res.status(401).json({ success: false, message: "Không tìm thấy thông tin chủ trọ!" });

        const result = await createOrLinkTenant({ ...req.body, landlordId });
        res.status(result.created ? 201 : 200).json({
            success: true,
            message: result.created ? "Đã tạo mới và liên kết Người thuê vào phòng!" : "Đã liên kết Người thuê vào phòng!",
            data: result.tenant,
            contract: result.contract
        });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({ success: false, message: "Số điện thoại hoặc Email đã được sử dụng bởi tài khoản khác!" });
        }
        res.status(error.status || 500).json({ success: false, code: error.code, message: error.message || "Lỗi khi thêm người thuê!" });
    }
};

// 3. Lấy chi tiết thông tin 1 người thuê
exports.getTenantById = async (req, res) => {
    try {
        const tenant = await Account.findOne({ _id: req.params.id, role: 2 });
        if (!tenant) return res.status(404).json({ success: false, message: "Không tìm thấy người thuê!" });
        res.status(200).json({ success: true, data: tenant });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 4. Cập nhật thông tin người thuê
exports.updateTenant = async (req, res) => {
    try {
        const { password, name, fullName, citizenId, idCard, ...rest } = req.body;
        let updateData = { ...rest };

        if (name || fullName) updateData.fullName = fullName || name;
        if (citizenId || idCard) updateData.idCard = idCard || citizenId;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        } else {
            delete updateData.password;
        }

        if (updateData.email) {
            updateData.username = updateData.email;
        }

        const updatedTenant = await Account.findOneAndUpdate(
            { _id: req.params.id, role: 2 },
            updateData,
            { new: true }
        );

        if (!updatedTenant) return res.status(404).json({ success: false, message: "Không tìm thấy người thuê!" });

        res.status(200).json({ success: true, message: "Cập nhật thành công!", data: updatedTenant });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 5. Ngừng thuê phòng (Chấm dứt hợp đồng)
exports.terminateTenant = async (req, res) => {
    try {
        const tenantId = req.params.id;

        // Tìm hợp đồng đang hiệu lực của khách này (bao gồm cả trạng thái 5: Chờ duyệt trả phòng)
        const activeContract = await Contract.findOne({ tenantId: tenantId, status: { $in: [1, 5] } });
        if (!activeContract) {
            return res.status(404).json({ success: false, message: "Người thuê không có hợp đồng nào đang hiệu lực!" });
        }

        // --- NEW LOGIC: Kiểm tra hóa đơn chưa thanh toán ---
        const unpaidInvoice = await Invoice.findOne({ contractId: activeContract._id, status: { $in: [1, 3] } }); // 1: Chưa thanh toán, 3: Quá hạn
        if (unpaidInvoice) {
            return res.status(400).json({
                success: false,
                message: "Không thể chấm dứt hợp đồng! Người thuê này vẫn còn hóa đơn chưa thanh toán. Vui lòng thu tiền hoặc hủy hóa đơn trước."
            });
        }
        // ---------------------------------------------------

        // 1. Chuyển hợp đồng sang trạng thái Hết hạn (2)
        activeContract.status = 2;
        await activeContract.save();

        // 2. Chuyển phòng về trạng thái Trống (0)
        await Room.findByIdAndUpdate(activeContract.roomId, { status: 0 });

        // 3. KHÔNG KHÓA TÀI KHOẢN NGƯỜI THUÊ
        // Giữ tài khoản active để khách vẫn có thể dùng App xem lại lịch sử hóa đơn cũ.

        res.status(200).json({ success: true, message: "Đã xử lý trả phòng thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi trả phòng: " + error.message });
    }
};

// =========================================================================
// PHẦN 2: DÀNH CHO GIAO DIỆN MOBILE APP (NGƯỜI THUÊ)
// =========================================================================

// 6. Lấy dữ liệu tổng hợp hiển thị lên màn hình chính Mobile App
exports.getHomeSummary = async (req, res) => {
    try {
        const { tenantId } = req.params;

        const tenant = await Account.findById(tenantId);
        if (!tenant || tenant.role !== 2) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người thuê!" });
        }

        // Tìm hợp đồng đang hiệu lực, populate để lấy thông tin mã phòng
        const contract = await Contract.findOne({ tenantId: tenantId, status: 1 }).populate('roomId', 'roomCode');

        let latestInvoice = null;
        let latestRepair = null;

        // Nếu có hợp đồng, mới tìm hóa đơn và sửa chữa dựa trên ID hợp đồng đó
        if (contract) {
            latestInvoice = await Invoice.findOne({ contractId: contract._id, status: 0 }).sort({ createdAt: -1 });
            latestRepair = await RepairRequest.findOne({ contractId: contract._id }).sort({ createdAt: -1 });
        }

        res.status(200).json({
            success: true,
            data: {
                tenantName: tenant.fullName,
                roomCode: contract && contract.roomId ? contract.roomId.roomCode : "Chưa có phòng",
                invoiceSummary: latestInvoice ? {
                    totalAmount: latestInvoice.totalAmount,
                    status: latestInvoice.status,
                    period: latestInvoice.period,
                    dueDate: latestInvoice.dueDate ? latestInvoice.dueDate.toLocaleDateString('vi-VN') : "N/A"
                } : null,
                contractSummary: contract ? {
                    endDate: contract.endDate.toLocaleDateString('vi-VN')
                } : null,
                repairSummary: latestRepair ? {
                    title: latestRepair.title,
                    status: latestRepair.status
                } : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Mobile Dashboard: " + error.message });
    }
};
