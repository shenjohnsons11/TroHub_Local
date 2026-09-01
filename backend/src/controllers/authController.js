const Account = require('../models/Account');
const InviteCode = require('../models/InviteCode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { buildLoginLookup, normalizeEmail, normalizePhone } = require('../services/authIdentifier');
const { normalizeCoordinates, reverseGeocode } = require('../services/propertyLocation');

// Chuỗi bí mật mã hóa phiên đăng nhập
const JWT_SECRET = process.env.JWT_SECRET;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function clearOtp(account) {
    account.passwordResetOtpHash = undefined;
    account.passwordResetOtpExpiresAt = undefined;
    account.passwordResetOtpSentAt = undefined;
    account.passwordResetOtpAttempts = 0;
}

function sameNonce(stored, supplied) {
    if (typeof stored !== 'string' || typeof supplied !== 'string') return false;
    const storedBuffer = Buffer.from(stored);
    const suppliedBuffer = Buffer.from(supplied);
    return storedBuffer.length === suppliedBuffer.length
        && crypto.timingSafeEqual(storedBuffer, suppliedBuffer);
}

function serializeUser(account) {
    return {
        id: account._id,
        username: account.username,
        fullName: account.fullName,
        phone: account.phone,
        email: account.email,
        idCard: account.idCard,
        role: account.role,
        status: account.status,
        mustChangePassword: account.mustChangePassword,
        bankId: account.bankId,
        bankAccountNo: account.bankAccountNo,
        bankAccountName: account.bankAccountName,
        propertyAddress: account.propertyAddress || '',
        propertyLatitude: account.propertyLatitude,
        propertyLongitude: account.propertyLongitude,
        landlordSignature: account.landlordSignature || '',
    };
}

exports.register = async (req, res) => {
    const role = Number(req.body?.role);
    const isLandlordRegistration = role === 1 && (typeof req.body?.propertyAddress === 'string' || typeof req.body?.inviteCode === 'string');
    let claimedInviteCode;
    let landlordAccount;
    let landlordAccountSaved = false;
    try {
        if (!isLandlordRegistration) {
            const { fullName, phone, email, idCard, password } = req.body;
            const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
            const cleanPhone = normalizePhone(phone);
            const cleanEmail = normalizeEmail(email);
            const cleanIdCard = typeof idCard === 'string' ? idCard.replace(/\D/g, '') : '';

            if (!cleanName) return res.status(400).json({ success: false, code: 'FULL_NAME_REQUIRED', message: 'Vui lòng nhập họ và tên đầy đủ.' });
            if (!cleanPhone || cleanPhone.length !== 10) return res.status(400).json({ success: false, code: 'INVALID_PHONE', message: 'Số điện thoại phải gồm đúng 10 chữ số hợp lệ.' });
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ success: false, code: 'INVALID_EMAIL', message: 'Địa chỉ Email không hợp lệ.' });
            if (cleanIdCard.length !== 12) return res.status(400).json({ success: false, code: 'INVALID_ID_CARD', message: 'CCCD phải gồm đúng 12 chữ số.' });
            if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ success: false, code: 'INVALID_PASSWORD', message: 'Mật khẩu phải có ít nhất 6 ký tự.' });

            const existing = await Account.findOne({ $or: [{ phone: cleanPhone }, { email: cleanEmail }, { username: cleanPhone }, { username: cleanEmail }, { idCard: cleanIdCard }] });
            if (existing) return res.status(400).json({ success: false, code: 'ACCOUNT_ALREADY_EXISTS', message: 'Số điện thoại hoặc Email này đã được đăng ký trên hệ thống!' });

            const account = await new Account({ username: cleanPhone, password: await bcrypt.hash(password, 10), fullName: cleanName, phone: cleanPhone, email: cleanEmail, idCard: cleanIdCard, role: 2, status: 1 }).save();
            const token = jwt.sign({ id: account._id, role: account.role }, JWT_SECRET, { expiresIn: '30d' });
            return res.status(201).json({ success: true, message: 'Đăng ký tài khoản mới thành công!', token, user: serializeUser(account) });
        }

        const { fullName, phone, email, idCard, password, inviteCode, propertyAddress, propertyLatitude, propertyLongitude } = req.body;
        const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
        const cleanPhone = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
        const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const cleanIdCard = typeof idCard === 'string' ? idCard.replace(/\D/g, '') : '';
        const cleanAddress = typeof propertyAddress === 'string' ? propertyAddress.trim() : '';
        const cleanInviteCode = typeof inviteCode === 'string' ? inviteCode.trim() : '';

        if (!cleanName) return res.status(400).json({ success: false, code: 'FULL_NAME_REQUIRED', message: 'Vui lòng nhập họ và tên đầy đủ.' });
        if (cleanPhone.length !== 10) return res.status(400).json({ success: false, code: 'INVALID_PHONE', message: 'Số điện thoại phải gồm đúng 10 chữ số.' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ success: false, code: 'INVALID_EMAIL', message: 'Địa chỉ Email không hợp lệ.' });
        if (cleanIdCard.length !== 12) return res.status(400).json({ success: false, code: 'INVALID_ID_CARD', message: 'CCCD phải gồm đúng 12 chữ số.' });
        if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ success: false, code: 'INVALID_PASSWORD', message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
        if (!cleanAddress) return res.status(400).json({ success: false, code: 'PROPERTY_ADDRESS_REQUIRED', message: 'Vui lòng nhập địa chỉ nhà trọ.' });
        if (!/^\d{6}$/.test(cleanInviteCode)) {
            return res.status(403).json({ success: false, code: 'INVALID_LANDLORD_INVITE', message: 'Mã mời đăng ký Chủ trọ không hợp lệ.' });
        }

        const coordinates = normalizeCoordinates(propertyLatitude, propertyLongitude);
        const existing = await Account.findOne({ $or: [{ phone: cleanPhone }, { email: cleanEmail }, { idCard: cleanIdCard }] });
        if (existing) return res.status(400).json({ success: false, code: 'ACCOUNT_ALREADY_EXISTS', message: 'Số điện thoại, Email hoặc CCCD đã được đăng ký.' });

        landlordAccount = new Account({
            username: cleanPhone,
            password: await bcrypt.hash(password, 10),
            fullName: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            idCard: cleanIdCard,
            role: 1,
            status: 1,
            propertyAddress: cleanAddress,
            propertyLatitude: coordinates?.latitude,
            propertyLongitude: coordinates?.longitude,
        });

        claimedInviteCode = await InviteCode.findOneAndUpdate(
            { code: cleanInviteCode, isUsed: false },
            { $set: { isUsed: true, usedAt: new Date(), usedBy: landlordAccount._id } },
            { returnDocument: 'after' }
        );
        if (!claimedInviteCode) {
            return res.status(403).json({ success: false, code: 'INVALID_LANDLORD_INVITE', message: 'Mã mời đăng ký Chủ trọ không hợp lệ.' });
        }

        const account = await landlordAccount.save();
        landlordAccountSaved = true;
        const token = jwt.sign({ id: account._id, role: account.role }, JWT_SECRET, { expiresIn: '30d' });
        return res.status(201).json({ success: true, message: 'Đăng ký tài khoản Chủ trọ thành công!', token, user: serializeUser(account) });
    } catch (error) {
        if (claimedInviteCode && landlordAccount && !landlordAccountSaved) {
            try {
                await InviteCode.updateOne(
                    { _id: claimedInviteCode._id, usedBy: landlordAccount._id },
                    { $set: { isUsed: false }, $unset: { usedAt: 1, usedBy: 1 } }
                );
            } catch (rollbackError) {
                console.error('[INVITE_CODE_ROLLBACK]', rollbackError.message);
            }
        }
        const status = error.code === 'INVALID_PROPERTY_COORDINATES' ? 400 : 500;
        return res.status(status).json({ success: false, code: error.code, message: error.message || 'Không thể đăng ký tài khoản Chủ trọ.' });
    }
};

exports.reverseGeocode = async (req, res) => {
    try {
        const coordinates = normalizeCoordinates(req.query.lat, req.query.lng);
        if (!coordinates) throw Object.assign(new Error('Tọa độ nhà trọ không hợp lệ.'), { code: 'INVALID_PROPERTY_COORDINATES' });
        const address = await reverseGeocode(coordinates);
        return res.status(200).json({ success: true, data: { address } });
    } catch (error) {
        const status = error.code === 'INVALID_PROPERTY_COORDINATES' ? 400
            : error.code === 'LOCATION_RATE_LIMITED' ? 429
                : 502;
        return res.status(status).json({ success: false, code: error.code || 'LOCATION_LOOKUP_FAILED', message: error.message || 'Không thể lấy địa chỉ từ vị trí hiện tại.' });
    }
};

// 2. Đăng nhập hệ thống tổng hợp (Dùng chung cho cả Web và Mobile App)
exports.login = async (req, res) => {
    try {
        const identifier = req.body.identifier ?? req.body.username;
        const { password } = req.body;

        if (typeof identifier !== 'string' || !identifier.trim()) {
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
        const account = await Account.findOne(buildLoginLookup(identifier));
        if (!account || account.status === 0) {
            return res.status(400).json({ success: false, code: 'ACCOUNT_NOT_FOUND', message: "Tài khoản không tồn tại hoặc đã bị khóa!" });
        }
        // So khớp mật khẩu đã mã hóa lưu trong cơ sở dữ liệu
        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, code: 'INVALID_PASSWORD', message: "Mật khẩu đăng nhập không chính xác!" });
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
            user: serializeUser(account)
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
            user: serializeUser(account)
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

        const { fullName, phone, email, idCard, bankId, bankAccountNo, bankAccountName, propertyAddress, propertyLatitude, propertyLongitude, landlordSignature } = req.body;

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
        if (landlordSignature !== undefined) account.landlordSignature = landlordSignature;
        if (account.role === 1 && propertyAddress !== undefined) {
            const cleanAddress = typeof propertyAddress === 'string' ? propertyAddress.trim() : '';
            if (!cleanAddress) return res.status(400).json({ success: false, code: 'PROPERTY_ADDRESS_REQUIRED', message: 'Vui lòng nhập địa chỉ nhà trọ.' });
            account.propertyAddress = cleanAddress;
        }
        if (account.role === 1 && (propertyLatitude !== undefined || propertyLongitude !== undefined)) {
            const coordinates = normalizeCoordinates(
                propertyLatitude === undefined ? account.propertyLatitude : propertyLatitude,
                propertyLongitude === undefined ? account.propertyLongitude : propertyLongitude,
            );
            account.propertyLatitude = coordinates?.latitude;
            account.propertyLongitude = coordinates?.longitude;
        }

        await account.save();

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin tài khoản thành công!',
            user: serializeUser(account)
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
        account.passwordChangedAt = new Date();
        await account.save();

        res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server khi đổi mật khẩu: ' + error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    const identifier = req.body.identifier ?? req.body.username;
    if (typeof identifier !== 'string' || !identifier.trim()) {
        return res.status(400).json({
            success: false,
            code: 'RESET_IDENTIFIER_REQUIRED',
            message: 'Vui lòng nhập số điện thoại hoặc Email.',
        });
    }

    try {
        const account = await Account.findOne(buildLoginLookup(identifier))
            .select('+passwordResetOtpSentAt');
        const genericResponse = {
            success: true,
            message: 'Nếu tài khoản hợp lệ, mã OTP sẽ được gửi đến Email đã đăng ký.',
        };

        if (!account || account.status === 0) return res.status(200).json(genericResponse);
        if (!account.email) {
            return res.status(400).json({
                success: false,
                code: 'ACCOUNT_EMAIL_REQUIRED',
                message: 'Tài khoản chưa cập nhật Email. Vui lòng liên hệ Chủ trọ để hỗ trợ',
            });
        }
        if (account.passwordResetOtpSentAt
            && Date.now() - account.passwordResetOtpSentAt.getTime() < OTP_RESEND_MS) {
            return res.status(429).json({
                success: false,
                code: 'OTP_RESEND_TOO_SOON',
                message: 'Vui lòng đợi 60 giây trước khi yêu cầu mã OTP mới.',
            });
        }

        const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
        account.passwordResetOtpHash = await bcrypt.hash(otp, 10);
        account.passwordResetOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
        account.passwordResetOtpAttempts = 0;
        account.passwordResetOtpSentAt = new Date();
        account.passwordResetNonce = undefined;
        await account.save();

        try {
            const mailer = req.app?.locals?.mailer || require('../services/mailer');
            await mailer.sendPasswordResetOtp(account.email, otp);
        } catch (_error) {
            clearOtp(account);
            await account.save();
            return res.status(503).json({
                success: false,
                code: 'OTP_DELIVERY_FAILED',
                message: 'Không thể gửi Email OTP. Vui lòng thử lại sau.',
            });
        }

        return res.status(200).json(genericResponse);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi Server khi yêu cầu OTP: ' + error.message });
    }
};

exports.verifyResetOtp = async (req, res) => {
    const identifier = req.body.identifier ?? req.body.username;
    const { otp } = req.body;
    if (typeof identifier !== 'string' || !identifier.trim() || !/^\d{6}$/.test(otp || '')) {
        return res.status(400).json({
            success: false,
            code: 'INVALID_RESET_OTP',
            message: 'Mã OTP không hợp lệ hoặc đã hết hạn.',
        });
    }

    try {
        const account = await Account.findOne(buildLoginLookup(identifier))
            .select('+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts');
        if (!account || !account.passwordResetOtpHash || !account.passwordResetOtpExpiresAt) {
            return res.status(400).json({ success: false, code: 'INVALID_RESET_OTP', message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }
        if (account.passwordResetOtpExpiresAt.getTime() <= Date.now()) {
            clearOtp(account);
            await account.save();
            return res.status(400).json({ success: false, code: 'INVALID_RESET_OTP', message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }

        const matches = await bcrypt.compare(otp, account.passwordResetOtpHash);
        if (!matches) {
            account.passwordResetOtpAttempts = (account.passwordResetOtpAttempts || 0) + 1;
            if (account.passwordResetOtpAttempts >= OTP_MAX_ATTEMPTS) clearOtp(account);
            await account.save();
            return res.status(400).json({ success: false, code: 'INVALID_RESET_OTP', message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }

        clearOtp(account);
        account.passwordResetNonce = crypto.randomUUID();
        await account.save();
        const resetToken = jwt.sign(
            { id: account._id, purpose: 'password-reset', nonce: account.passwordResetNonce },
            JWT_SECRET,
            { expiresIn: '10m' },
        );
        return res.status(200).json({ success: true, message: 'Xác minh OTP thành công.', resetToken });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi Server khi xác minh OTP: ' + error.message });
    }
};

exports.resetPassword = async (req, res) => {
    const { resetToken, newPassword } = req.body;
    if (typeof resetToken !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            code: 'INVALID_PASSWORD_RESET',
            message: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        });
    }

    try {
        const decoded = jwt.verify(resetToken, JWT_SECRET);
        if (decoded.purpose !== 'password-reset') throw new Error('Invalid token purpose');

        const account = await Account.findById(decoded.id).select('+passwordResetNonce');
        if (!account || !sameNonce(account.passwordResetNonce, decoded.nonce)) {
            return res.status(401).json({ success: false, code: 'INVALID_RESET_TOKEN', message: 'Phiên khôi phục mật khẩu không hợp lệ hoặc đã hết hạn.' });
        }

        account.password = await bcrypt.hash(newPassword, 10);
        account.mustChangePassword = false;
        account.passwordResetNonce = undefined;
        clearOtp(account);
        await account.save();
        return res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công.' });
    } catch (_error) {
        return res.status(401).json({ success: false, code: 'INVALID_RESET_TOKEN', message: 'Phiên khôi phục mật khẩu không hợp lệ hoặc đã hết hạn.' });
    }
};
