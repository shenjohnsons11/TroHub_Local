function escapeHtml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function buildOtpEmail({ fullName, otp, expiresInMinutes = 10 }) {
    const safeName = escapeHtml(fullName || 'bạn');
    const safeOtp = escapeHtml(otp);
    return {
        subject: 'Mã xác minh đặt lại mật khẩu TroHub',
        text: `Xin chào ${fullName || 'bạn'}, mã xác minh TroHub của bạn là ${otp}. Mã hết hạn sau ${expiresInMinutes} phút.`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17211d">
                <h1 style="font-size:24px">Đặt lại mật khẩu TroHub</h1>
                <p>Xin chào ${safeName},</p>
                <p>Nhập mã sau để tiếp tục đặt lại mật khẩu:</p>
                <p style="font-size:32px;font-weight:800;letter-spacing:8px">${safeOtp}</p>
                <p>Mã có hiệu lực trong ${expiresInMinutes} phút. Không chia sẻ mã này với bất kỳ ai.</p>
            </div>
        `,
    };
}

function buildPasswordChangedEmail({ fullName }) {
    const safeName = escapeHtml(fullName || 'bạn');
    return {
        subject: 'Mật khẩu TroHub đã được thay đổi',
        text: `Xin chào ${fullName || 'bạn'}, mật khẩu TroHub của bạn vừa được thay đổi thành công.`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17211d">
                <h1 style="font-size:24px">Mật khẩu đã được thay đổi</h1>
                <p>Xin chào ${safeName},</p>
                <p>Mật khẩu TroHub của bạn vừa được thay đổi thành công.</p>
                <p>Nếu bạn không thực hiện thao tác này, hãy liên hệ Admin ngay.</p>
            </div>
        `,
    };
}

module.exports = { buildOtpEmail, buildPasswordChangedEmail };
