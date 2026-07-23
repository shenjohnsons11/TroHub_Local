const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "***REMOVED***";

function requireTenant(req, res, next) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      code: "AUTH_REQUIRED",
      message: "Người thuê cần đăng nhập để tiếp tục.",
    });
  }

  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (decoded.role !== 2) {
      return res.status(403).json({
        success: false,
        code: "NGUOI_THUE_REQUIRED",
        message: "Chức năng này chỉ dành cho Người thuê.",
      });
    }
    req.auth = { id: decoded.id, role: decoded.role };
    return next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }
}

module.exports = { requireTenant };
