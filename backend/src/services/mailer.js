const nodemailer = require('nodemailer');

function smtpConfig() {
    const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length) {
        throw new Error(`Thiếu cấu hình SMTP: ${missing.join(', ')}`);
    }

    return {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    };
}

async function sendPasswordResetOtp(email, otp) {
    const transporter = nodemailer.createTransport(smtpConfig());
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Mã OTP khôi phục mật khẩu TroHub',
        text: `Mã OTP của bạn là ${otp}. Mã có hiệu lực trong 10 phút.`,
    });
}

module.exports = { sendPasswordResetOtp };
