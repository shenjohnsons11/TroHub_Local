const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');
const { requireAdmin } = require('../middleware/requireAdmin');
const { requireTenant } = require('../middleware/requireTenant');

// [WEB] Lấy danh sách toàn bộ báo cáo sự cố
router.get('/', requireAdmin, repairController.getAllRequests);

// [APP] Người thuê gửi báo cáo sự cố mới
router.post('/', requireTenant, repairController.createRequest);

// [WEB] Chủ trọ cập nhật trạng thái & ghi chú
router.put('/:id', requireAdmin, repairController.updateRequestStatus);

// Xóa yêu cầu sửa chữa (Admin)
router.delete('/:id', requireAdmin, repairController.deleteRequest);

module.exports = router;