const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');

// [WEB] Lấy danh sách toàn bộ báo cáo sự cố
router.get('/', repairController.getAllRequests);

// [APP] Khách thuê gửi báo cáo sự cố mới
router.post('/', repairController.createRequest);

// [WEB] Chủ trọ cập nhật trạng thái & ghi chú
router.put('/:id', repairController.updateRequestStatus);

// Xóa yêu cầu sửa chữa (Admin)
router.delete('/:id', repairController.deleteRequest);

module.exports = router;