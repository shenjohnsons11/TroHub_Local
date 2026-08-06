const NEUTRAL_MESSAGE =
    'Nếu thông tin hợp lệ, mã xác minh sẽ được gửi tới email đã đăng ký.';

function statusForError(code) {
    if (code === 'OTP_RESEND_TOO_SOON' || code === 'OTP_HOURLY_LIMIT') return 429;
    if (code === 'SMTP_NOT_CONFIGURED') return 503;
    if (code === 'ACCOUNT_NOT_FOUND') return 404;
    return 400;
}

function createPasswordResetController(service) {
    return {
        async requestOtp(req, res) {
            const identifier = req.body?.identifier;
            if (typeof identifier !== 'string' || !identifier.trim()) {
                return res.status(400).json({
                    success: false,
                    code: 'RESET_IDENTIFIER_REQUIRED',
                    message: 'Vui lòng nhập số điện thoại hoặc tên đăng nhập.',
                });
            }
            try {
                await service.requestByIdentifier({
                    identifier: identifier.trim(),
                    requestedIp: req.ip || req.socket?.remoteAddress || 'unknown',
                });
                return res.status(200).json({ success: true, message: NEUTRAL_MESSAGE });
            } catch (error) {
                if (error.code === 'ACCOUNT_NOT_FOUND' || error.code === 'ACCOUNT_EMAIL_MISSING') {
                    return res.status(200).json({ success: true, message: NEUTRAL_MESSAGE });
                }
                return res.status(statusForError(error.code)).json({
                    success: false,
                    code: error.code || 'PASSWORD_RESET_REQUEST_FAILED',
                    message: error.message || 'Không thể gửi mã xác minh.',
                });
            }
        },

        async verifyOtp(req, res) {
            const { identifier, otp } = req.body || {};
            if (!identifier || !/^\d{6}$/.test(String(otp || ''))) {
                return res.status(400).json({
                    success: false,
                    code: 'OTP_INVALID',
                    message: 'Vui lòng nhập mã xác minh gồm 6 chữ số.',
                });
            }
            try {
                const result = await service.verifyByIdentifier({
                    identifier: String(identifier).trim(),
                    otp: String(otp),
                });
                return res.status(200).json({
                    success: true,
                    resetToken: result.resetToken,
                });
            } catch (error) {
                return res.status(statusForError(error.code)).json({
                    success: false,
                    code: error.code || 'OTP_INVALID',
                    message: error.message || 'Mã xác minh không hợp lệ.',
                });
            }
        },

        async completeReset(req, res) {
            const { resetToken, newPassword } = req.body || {};
            try {
                await service.completeReset({ resetToken, newPassword });
                return res.status(200).json({
                    success: true,
                    message: 'Đặt lại mật khẩu thành công.',
                });
            } catch (error) {
                return res.status(statusForError(error.code)).json({
                    success: false,
                    code: error.code || 'PASSWORD_RESET_FAILED',
                    message: error.message || 'Không thể đặt lại mật khẩu.',
                });
            }
        },

        async issueTemporaryPassword(req, res) {
            try {
                const result = await service.issueTemporaryPassword({
                    accountId: req.params.accountId,
                    adminId: req.auth.id,
                });
                return res.status(200).json({
                    success: true,
                    message: 'Đã cấp mật khẩu tạm cho Người thuê.',
                    temporaryPassword: result.temporaryPassword,
                });
            } catch (error) {
                return res.status(statusForError(error.code)).json({
                    success: false,
                    code: error.code || 'TEMPORARY_PASSWORD_FAILED',
                    message: error.message || 'Không thể cấp mật khẩu tạm.',
                });
            }
        },
    };
}

module.exports = { createPasswordResetController, NEUTRAL_MESSAGE };
