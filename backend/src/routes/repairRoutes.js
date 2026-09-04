const express = require("express");

const router = express.Router();

const repairController =
  require("../controllers/repairController");

const {
  requireAdmin,
} = require("../middleware/requireAdmin");

const {
  requireTenant,
} = require("../middleware/requireTenant");

/* =========================================================
   NGƯỜI THUÊ
========================================================= */

// Lấy danh sách yêu cầu của chính người thuê
router.get(
  "/my",
  requireTenant,
  repairController.getMyRequests
);

// Người thuê tạo yêu cầu mới
router.post(
  "/",
  requireTenant,
  repairController.createRequest
);

// Người thuê chỉ được xóa yêu cầu của mình
// khi yêu cầu còn ở trạng thái Chờ tiếp nhận
router.delete(
  "/my/:id",
  requireTenant,
  repairController.deleteMyRequest
);

/* =========================================================
   CHỦ TRỌ
========================================================= */

// Chủ trọ lấy các yêu cầu thuộc phòng của mình
router.get(
  "/",
  requireAdmin,
  repairController.getAllRequests
);

// Chủ trọ cập nhật trạng thái,
// lịch hẹn, ghi chú, chi phí...
router.put(
  "/:id",
  requireAdmin,
  repairController.updateRequestStatus
);

// Chủ trọ xóa
router.delete(
  "/:id",
  requireAdmin,
  repairController.deleteRequest
);

module.exports = router;