const nodemailer = require('nodemailer');
const {
    buildOtpEmail,
    buildPasswordChangedEmail,
} = require('../templates/passwordResetOtpEmail');

function createEmailService(
    env = process.env,
    transportFactory = nodemailer.createTransport,
) {
    const user = env.SMTP_USER;
    const pass = env.SMTP_APP_PASSWORD;
    let transport;

    function getTransport() {
        if (!user || !pass) {
            const error = new Error('Dịch vụ email chưa được cấu hình.');
            error.code = 'SMTP_NOT_CONFIGURED';
            throw error;
        }
        if (!transport) {
            transport = transportFactory({
                service: 'gmail',
                auth: { user, pass },
            });
        }
        return transport;
    }

    async function send(to, content) {
        await getTransport().sendMail({
            from: `TroHub <${user}>`,
            to,
            ...content,
        });
    }

    return {
        isConfigured: Boolean(user && pass),
        sendOtp: async (payload) => send(payload.to, buildOtpEmail(payload)),
        sendPasswordChanged: async (payload) => send(
            payload.to,
            buildPasswordChangedEmail(payload),
        ),
    };
}

module.exports = { createEmailService };
