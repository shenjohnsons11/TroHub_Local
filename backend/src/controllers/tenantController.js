const Account = require('../models/Account');
const Room = require('../models/Room');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const RepairRequest = require('../models/RepairRequest');
const bcrypt = require('bcryptjs');

// =========================================================================
// PHẦN 1: DÀNH CHO GIAO DIỆN WEB (CHỦ TRỌ QUẢN LÝ)
// =========================================================================

// 1. Lấy danh sách toàn bộ khách thuê (role = 2) thuộc danh bạ của Chủ trọ
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

        // Lấy tất cả khách thuê mà trong linkedLandlords có chứa landlordId
        let tenants = await Account.find({ role: 2, linkedLandlords: landlordId }).lean().sort({ createdAt: -1 });
        
        // Populate room from active contracts (1: Hiệu lực, 5: Yêu cầu trả phòng) để hiển thị thông tin phòng nếu có
        const activeContracts = await Contract.find({ status: { $in: [1, 5] } }).populate('roomId');
        
        for (let t of tenants) {
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
            message: "Lấy danh sách khách thuê thành công!",
            data: tenants
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 2. Thêm khách thuê mới (Chỉ thêm vào Danh bạ - linkedLandlords)
exports.createTenant = async (req, res) => {
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

        const { fullName, name, phone, email, password, idCard, citizenId } = req.body;
        const finalFullName = fullName || name;
        const finalIdCard = idCard || citizenId;

        if (!email && !phone) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập Email hoặc SĐT!" });
        }

        // Tìm xem khách đã có tài khoản chưa
        let existingAccount = await Account.findOne({ $or: [{ email }, { phone }], role: 2 });
        
        if (existingAccount) {
            // Nếu khách đã tồn tại, chỉ cần link landlordId vào linkedLandlords
            if (!existingAccount.linkedLandlords.includes(landlordId)) {
                existingAccount.linkedLandlords.push(landlordId);
                await existingAccount.save();
            }
            return res.status(200).json({
                success: true,
                message: "Khách này đã dùng App. Đã tự động thêm vào danh sách quản lý của bạn!",
                data: existingAccount
            });
        }

        // Nếu khách chưa tồn tại trên hệ thống, yêu cầu phải có ĐỦ SĐT và CCCD để tạo tài khoản mới
        if (!phone || phone.length !== 10) {
            return res.status(400).json({ success: false, message: "Khách mới chưa có tài khoản. Vui lòng nhập đúng SĐT gồm 10 chữ số!" });
        }
        if (!finalIdCard || finalIdCard.length !== 12) {
            return res.status(400).json({ success: false, message: "Khách mới chưa có tài khoản. Vui lòng nhập đúng CCCD gồm 12 chữ số!" });
        }
        
        // Kiểm tra định dạng email bắt buộc phải hợp lệ (có @ và đuôi) vì hệ thống dùng email làm tên đăng nhập
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập Email đúng định dạng (ví dụ: nguyenvanA@gmail.com) để làm tên đăng nhập!" });
        }

        // Sử dụng mật khẩu được truyền lên từ Frontend, nếu không có thì mặc định là "123456"
        const defaultPassword = password || "123456";

        // Tạo tài khoản khách thuê mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        const newTenant = new Account({
            username: email || phone,
            password: hashedPassword,
            fullName: finalFullName || "Khách mới",
            phone,
            email,
            idCard: finalIdCard,
            role: 2,
            status: 1,
            linkedLandlords: [landlordId]
        });
        const savedTenant = await newTenant.save();

        let contractMsg = "";
        // 3. Tạo hợp đồng nháp nếu có chọn phòng
        if (roomCode) {
            const room = await Room.findOne({ roomCode, landlordId });
            if (room && room.status === 0) { // Chỉ tạo nếu phòng trống
                const newContract = new Contract({
                    roomId: room._id,
                    tenantId: savedTenant._id,
                    startDate: startDate || new Date(),
                    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Mặc định 1 năm
                    fixedRentPrice: room.rentPrice || 0,
                    fixedDeposit: room.deposit || 0,
                    services: [],
                    status: 0 // Hợp đồng nháp / Chờ ký
                });
                await newContract.save();
                contractMsg = " và đã tạo hợp đồng nháp";
            }
        }

        res.status(201).json({
            success: true,
            message: `Đã tạo tài khoản${contractMsg} thành công!`,
            data: savedTenant
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi thêm khách thuê: " + error.message });
    }
};

// 3. Lấy chi tiết thông tin 1 khách thuê
exports.getTenantById = async (req, res) => {
    try {
        const tenant = await Account.findOne({ _id: req.params.id, role: 2 });
        if (!tenant) return res.status(404).json({ success: false, message: "Không tìm thấy khách thuê!" });
        res.status(200).json({ success: true, data: tenant });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
    }
};

// 4. Cập nhật thông tin khách thuê
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
        
        if (!updatedTenant) return res.status(404).json({ success: false, message: "Không tìm thấy khách thuê!" });

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
            return res.status(404).json({ success: false, message: "Khách thuê không có hợp đồng nào đang hiệu lực!" });
        }

        // --- NEW LOGIC: Kiểm tra hóa đơn chưa thanh toán ---
        const unpaidInvoice = await Invoice.findOne({ contractId: activeContract._id, status: { $in: [1, 3] } }); // 1: Chưa thanh toán, 3: Quá hạn
        if (unpaidInvoice) {
            return res.status(400).json({ 
                success: false, 
                message: "Không thể chấm dứt hợp đồng! Khách thuê này vẫn còn hóa đơn chưa thanh toán. Vui lòng thu tiền hoặc hủy hóa đơn trước." 
            });
        }
        // ---------------------------------------------------

        // 1. Chuyển hợp đồng sang trạng thái Hết hạn (2)
        activeContract.status = 2;
        await activeContract.save();

        // 2. Chuyển phòng về trạng thái Trống (0)
        await Room.findByIdAndUpdate(activeContract.roomId, { status: 0 });

        // 3. KHÔNG KHÓA TÀI KHOẢN KHÁCH THUÊ
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
            return res.status(404).json({ success: false, message: "Không tìm thấy khách thuê!" });
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