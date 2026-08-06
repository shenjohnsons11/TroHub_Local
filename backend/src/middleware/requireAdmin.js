const { verifySession } = require('../services/sessionAuth');

async function requireAdmin(req, res, next) {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            code: 'AUTH_REQUIRED',
            message: 'Bạn cần đăng nhập để tiếp tục.',
        });
    }

    try {
        const auth = await verifySession(authHeader.slice(7));
        if (auth.role !== 1) {
            return res.status(403).json({
                success: false,
                code: 'ADMIN_REQUIRED',
                message: 'Chức năng này chỉ dành cho Chủ trọ.',
            });
        }

        req.auth = auth;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            code: error.code || 'INVALID_TOKEN',
            message: error.message || 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
        });
    }
}

module.exports = { requireAdmin };
