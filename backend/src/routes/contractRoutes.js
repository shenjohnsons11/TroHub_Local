const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { requireAdmin } = require('../middleware/requireAdmin');
const { requireTenant } = require('../middleware/requireTenant');
<<<<<<< HEAD

// Lấy danh sách & Tạo hợp đồng dự thảo
router.get('/', contractController.getAllContracts);
=======
const { requireAuth } = require('../middleware/requireAuth');

// Lấy danh sách & Tạo hợp đồng dự thảo
router.get('/', requireAuth, contractController.getAllContracts);
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
router.post('/', requireAdmin, contractController.createContract);
router.post('/:id/send', requireAdmin, contractController.sendContract);

// Lịch sử hợp đồng (Phải đặt TRƯỚC /:id)
router.get('/history', requireAdmin, contractController.getContractHistory);

<<<<<<< HEAD
// Xem chi tiết hợp đồng
router.get('/:id', contractController.getContractById);
=======
// PDF riêng tư: chỉ render/xem qua phiên đăng nhập hợp lệ
router.get('/:id/pdf', requireAuth, contractController.viewPdf);
router.get('/:id/viewer', requireAuth, contractController.viewPdfHtml);

// Xem chi tiết hợp đồng
router.get('/:id', requireAuth, contractController.getContractById);
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e

// Cập nhật & Xóa hợp đồng (Admin)
router.put('/:id', requireAdmin, contractController.updateContract);
router.delete('/:id', requireAdmin, contractController.deleteContract);


// Người thuê gọi API này để ký hợp đồng (Chuyển status thành 4)
router.put('/:id/sign', requireTenant, contractController.signContract);
router.patch('/:id/sign', requireTenant, contractController.signContract);

// Tải file hợp đồng PDF / DOCX
<<<<<<< HEAD
router.get('/:id/download-pdf', contractController.downloadPdf);
router.get('/:id/download-docx', contractController.downloadDocx);
=======
router.get('/:id/download-pdf', requireAuth, contractController.downloadPdf);
router.get('/:id/download-docx', requireAuth, contractController.downloadDocx);
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e

// Chủ trọ duyệt xác nhận hợp đồng (Chuyển status thành 1)

router.put('/:id/confirm', requireAdmin, contractController.confirmContract);

// Chủ trọ quyết toán và duyệt trả phòng
router.get('/:id/checkout-preview', requireAdmin, contractController.getCheckoutPreview);
router.put('/:id/checkout', requireAdmin, contractController.checkoutContract);

module.exports = router;
