const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { requireAdmin } = require('../middleware/requireAdmin');
const { requireTenant } = require('../middleware/requireTenant');
const { requireAuth } = require('../middleware/requireAuth');

// Lấy danh sách & Tạo hợp đồng dự thảo
router.get('/', requireAuth, contractController.getAllContracts);
router.post('/', requireAdmin, contractController.createContract);
router.post('/:id/send', requireAdmin, contractController.sendContract);

// Lịch sử hợp đồng (Phải đặt TRƯỚC /:id)
router.get('/history', requireAdmin, contractController.getContractHistory);

// Xem chi tiết hợp đồng
router.get('/:id', requireAuth, contractController.getContractById);

// Cập nhật hợp đồng (Admin)
router.put('/:id', requireAdmin, contractController.updateContract);

// Người thuê gọi API này để ký hợp đồng (Chuyển status thành 4)
router.put('/:id/sign', requireTenant, contractController.signContract);

// Chủ trọ duyệt xác nhận hợp đồng (Chuyển status thành 1)
router.put('/:id/confirm', requireAdmin, contractController.confirmContract);

// Chủ trọ quyết toán và duyệt trả phòng
router.get('/:id/checkout-preview', requireAdmin, contractController.getCheckoutPreview);
router.put('/:id/checkout', requireAdmin, contractController.checkoutContract);

module.exports = router;
