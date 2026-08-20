const jwt = require('jsonwebtoken');
const Account = require('../models/Account');

const JWT_SECRET = process.env.JWT_SECRET || 'trohub_secret_key_2026';

function authError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function createSessionVerifier({
    verifyToken,
    findAccountById,
}) {
    return async function verifySession(token) {
        const decoded = verifyToken(token);
        const account = await findAccountById(decoded.id);
        if (!account || account.status === 0) {
            throw authError('INVALID_TOKEN', 'Tài khoản không tồn tại hoặc đã bị khóa.');
        }
        if (
            account.passwordChangedAt
            && Number(decoded.iat) < Math.floor(account.passwordChangedAt.getTime() / 1000)
        ) {
            throw authError(
                'SESSION_EXPIRED_AFTER_PASSWORD_CHANGE',
                'Phiên đăng nhập đã hết hiệu lực sau khi mật khẩu thay đổi.',
            );
        }
        return { id: String(account._id), role: account.role };
    };
}

const verifySession = createSessionVerifier({
    verifyToken: (token) => jwt.verify(token, JWT_SECRET),
    findAccountById: (accountId) => Account.findById(accountId),
});

module.exports = { createSessionVerifier, verifySession };
