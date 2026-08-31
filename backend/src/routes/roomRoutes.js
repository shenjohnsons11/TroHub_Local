const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { requireAdmin } = require('../middleware/requireAdmin');

// Quản lý danh sách và tạo mới
router.get('/', requireAdmin, roomController.getAllRooms);
router.post('/', requireAdmin, roomController.createRoom);

// Xem chi tiết và cập nhật từng phòng cụ thể
router.get('/:id', requireAdmin, roomController.getRoomById);
router.put('/:id', requireAdmin, roomController.updateRoom);
router.delete('/:id', requireAdmin, roomController.deleteRoom);

// Cập nhật sổ điện nước hàng loạt
router.post('/bulk-report-utility', requireAdmin, roomController.reportBulkUtilities);

// Chủ trọ lưu chỉ số điện nước từ AI scanner
router.post('/:id/report-utility', requireAdmin, roomController.reportUtility);

module.exports = router;
