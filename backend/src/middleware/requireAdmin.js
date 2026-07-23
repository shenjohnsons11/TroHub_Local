const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '***REMOVED***';

function requireAdmin(req, res, next) {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            code: 'AUTH_REQUIRED',
            message: 'Bạn cần đăng nhập để tiếp tục.',
        });
    }

    try {
        const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
        if (decoded.role !== 1) {
            return res.status(403).json({
                success: false,
                code: 'ADMIN_REQUIRED',
                message: 'Chức năng này chỉ dành cho Admin.',
            });
        }

        req.auth = { id: decoded.id, role: decoded.role };
        return next();
    } catch (_error) {
        return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN',
            message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
        });
    }
}

module.exports = { requireAdmin };
