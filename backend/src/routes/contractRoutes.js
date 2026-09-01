const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { requireAdmin } = require('../middleware/requireAdmin');
const { requireTenant } = require('../middleware/requireTenant');
const { requireAuth } = require('../middleware/requireAuth');

// Lấy danh sách & Tạo hợp đồng dự thảo
router.get('/', requireAuth, contractController.getAllContracts);
router.post('/preview-draft', requireAdmin, contractController.previewDraftHtml);
router.post('/', requireAdmin, contractController.createContract);
router.post('/:id/send', requireAdmin, contractController.sendContract);

// Mobile Tenant dùng endpoint này để lấy toàn bộ phòng/hợp đồng của chính mình.
router.get('/my-contracts', requireTenant, contractController.getMyContracts);

// Lịch sử hợp đồng (Phải đặt TRƯỚC /:id)
router.get('/history', requireAdmin, contractController.getContractHistory);

// PDF riêng tư: chỉ render/xem qua phiên đăng nhập hợp lệ
router.get('/:id/pdf', requireAuth, contractController.viewPdf);
router.get('/:id/viewer', requireAuth, contractController.viewPdfHtml);

// Xem chi tiết hợp đồng
router.get('/:id', requireAuth, contractController.getContractById);

// Cập nhật & Xóa hợp đồng (Admin)
router.put('/:id', requireAdmin, contractController.updateContract);
router.delete('/:id', requireAdmin, contractController.deleteContract);


// Người thuê gọi API này để ký hợp đồng (Chuyển status thành RESERVED=4)
router.put('/:id/sign', requireTenant, contractController.signContract);
router.patch('/:id/sign', requireTenant, contractController.signContract);

// Tải file hợp đồng PDF / DOCX
router.get('/:id/download-pdf', requireAuth, contractController.downloadPdf);
router.get('/:id/download-docx', requireAuth, contractController.downloadDocx);

// Chủ trọ bàn giao hợp đồng đặt cọc (Chuyển RESERVED=4 thành ACTIVE=1)
router.put('/:id/handover', requireAdmin, contractController.handoverContract);

// Alias cũ: xác nhận hợp đồng và dùng meter đã lưu làm số bàn giao.
router.put('/:id/confirm', requireAdmin, contractController.confirmContract);

// Chủ trọ quyết toán và duyệt trả phòng
router.get('/:id/checkout-preview', requireAdmin, contractController.getCheckoutPreview);
router.put('/:id/checkout', requireAdmin, contractController.checkoutContract);

module.exports = router;
