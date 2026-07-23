const { verifySession } = require("../services/sessionAuth");

async function requireTenant(req, res, next) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      code: "AUTH_REQUIRED",
      message: "Người thuê cần đăng nhập để tiếp tục.",
    });
  }

  try {
    const auth = await verifySession(authHeader.slice(7));
    if (auth.role !== 2) {
      return res.status(403).json({
        success: false,
        code: "NGUOI_THUE_REQUIRED",
        message: "Chức năng này chỉ dành cho Người thuê.",
      });
    }
    req.auth = auth;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: error.code || "INVALID_TOKEN",
      message: error.message || "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }
}

module.exports = { requireTenant };
