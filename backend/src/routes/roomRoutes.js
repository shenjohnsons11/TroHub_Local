const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Quản lý danh sách và tạo mới
router.get('/', roomController.getAllRooms);
router.post('/', roomController.createRoom);

// Xem chi tiết và cập nhật từng phòng cụ thể
router.get('/:id', roomController.getRoomById);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;