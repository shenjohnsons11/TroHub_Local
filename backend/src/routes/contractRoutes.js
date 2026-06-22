const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');

// Lấy danh sách & Tạo hợp đồng dự thảo
router.get('/', contractController.getAllContracts);
router.post('/', contractController.createContract);

// Xem chi tiết hợp đồng
router.get('/:id', contractController.getContractById);

// Cập nhật hợp đồng (Admin)
router.put('/:id', contractController.updateContract);

// Khách thuê gọi API này để ký hợp đồng (Chuyển status thành 4)
router.put('/:id/sign', contractController.signContract);

// Chủ trọ duyệt xác nhận hợp đồng (Chuyển status thành 1)
router.put('/:id/confirm', contractController.confirmContract);

module.exports = router;