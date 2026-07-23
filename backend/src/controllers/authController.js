const Account = require('../models/Account');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { buildLoginLookup } = require('../services/authIdentifier');

// Chuỗi bí mật mã hóa phiên đăng nhập
const JWT_SECRET = process.env.JWT_SECRET || 'trohub_secret_key_2026';

// Tài khoản chỉ được cấp qua luồng quản trị; không mở đăng ký công khai.
exports.register = async (_req, res) => {
    return res.status(403).json({
        success: false,
        code: 'PUBLIC_REGISTRATION_DISABLED',
        message: 'Tài khoản mới chỉ được tạo bởi Admin.',
    });
};

// 2. Đăng nhập hệ thống tổng hợp (Dùng chung cho cả Web và Mobile App)
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (typeof username !== 'string' || !username.trim()) {
            return res.status(400).json({
                success: false,
                code: 'LOGIN_IDENTIFIER_REQUIRED',
                message: 'Vui lòng nhập số điện thoại hoặc tên đăng nhập.',
            });
        }

        if (typeof password !== 'string' || !password) {
            return res.status(400).json({
                success: false,
                code: 'PASSWORD_REQUIRED',
                message: 'Vui lòng nhập mật khẩu.',
            });
        }

        // Ưu tiên SĐT, sau đó tên đăng nhập; email vẫn được giữ để tương thích tài khoản cũ.
        const account = await Account.findOne(buildLoginLookup(username));
        if (!account || account.status === 0) {
            return res.status(400).json({ success: false, message: "Tài khoản không tồn tại hoặc đã bị khóa!" });
        }
        // So khớp mật khẩu đã mã hóa lưu trong cơ sở dữ liệu
        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Mật khẩu đăng nhập không chính xác!" });
        }

        // Tạo mã Token phiên làm việc thời hạn 30 ngày, đính kèm ID và Quyền hạn truy cập
        const token = jwt.sign(
            { id: account._id, role: account.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            message: "Đăng nhập hệ thống thành công!",
            token,
            user: {
                id: account._id,
                username: account.username,
                fullName: account.fullName,
                role: account.role, // 1: Giao diện Web chủ trọ, 2: Giao diện Mobile người thuê
                mustChangePassword: account.mustChangePassword
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi Server khi đăng nhập: " + error.message });
    }
};

// 3. Lấy thông tin tài khoản hiện tại (GET /api/auth/me)
exports.getMe = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập hoặc token không hợp lệ!' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const account = await Account.findById(decoded.id);
        if (!account) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản!' });
        }

        res.status(200).json({
            success: true,
            user: {
                id: account._id,
                username: account.username,
                fullName: account.fullName,
                phone: account.phone,
                email: account.email,
                idCard: account.idCard,
                role: account.role,
                status: account.status,
                bankId: account.bankId,
                bankAccountNo: account.bankAccountNo,
                bankAccountName: account.bankAccountName
            }
        });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn: ' + error.message });
    }
};

// 4. Cập nhật thông tin tài khoản hiện tại (PUT /api/auth/me)
exports.updateMe = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập hoặc token không hợp lệ!' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const { fullName, phone, email, idCard, bankId, bankAccountNo, bankAccountName } = req.body;

        const account = await Account.findById(decoded.id);
        if (!account) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản!' });
        }

        if (fullName !== undefined) account.fullName = fullName;
        if (phone !== undefined) account.phone = phone;
        if (email !== undefined) account.email = email;
        if (idCard !== undefined) account.idCard = idCard;
        if (bankId !== undefined) account.bankId = bankId;
        if (bankAccountNo !== undefined) account.bankAccountNo = bankAccountNo;
        if (bankAccountName !== undefined) account.bankAccountName = bankAccountName;

        await account.save();

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin tài khoản thành công!',
            user: {
                id: account._id,
                username: account.username,
                fullName: account.fullName,
                phone: account.phone,
                email: account.email,
                idCard: account.idCard,
                role: account.role,
                status: account.status,
                bankId: account.bankId,
                bankAccountNo: account.bankAccountNo,
                bankAccountName: account.bankAccountName
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server khi cập nhật thông tin: ' + error.message });
    }
};

// 5. Đổi mật khẩu (PUT /api/auth/change-password)
exports.changePassword = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập hoặc token không hợp lệ!' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
        }

        const account = await Account.findById(decoded.id);
        if (!account) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản!' });
        }

        // So khớp mật khẩu cũ
        const isMatch = await bcrypt.compare(currentPassword, account.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Mật khẩu hiện tại không chính xác!" });
        }

        // Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        account.password = await bcrypt.hash(newPassword, salt);
        account.mustChangePassword = false; // Đã đổi mật khẩu thành công
        await account.save();

        res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server khi đổi mật khẩu: ' + error.message });
    }
};
