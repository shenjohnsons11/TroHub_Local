const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { requireAdmin } = require('../middleware/requireAdmin');
const { requireAuth } = require('../middleware/requireAuth');

// Lấy danh sách hóa đơn (Web)
router.get('/', requireAuth, invoiceController.getAllInvoices);

// Lấy danh sách xem trước lập hóa đơn hàng loạt
router.get('/bulk-preview', requireAdmin, invoiceController.getBulkPreview);

// Lấy danh sách công nợ
router.get('/debts', requireAdmin, invoiceController.getDebts);
router.post('/debts/:contractId/remind', requireAdmin, invoiceController.remindDebt);

// Tạo hóa đơn hàng loạt
router.post('/bulk', requireAdmin, invoiceController.createBulkInvoices);

// Chủ trọ xuất hóa đơn mới
router.post('/', requireAdmin, invoiceController.createInvoice);

// Xem chi tiết một hóa đơn (Web & Mobile)
router.get('/:id', invoiceController.getInvoiceById);

// Đánh dấu thanh toán (Tự động sinh Transaction)
router.put('/:id/pay', invoiceController.payInvoice);

// Gửi nhắc nhở thanh toán (Nhắc nợ)
router.post('/:id/remind', requireAdmin, invoiceController.remindInvoicePayment);
router.put('/:id/remind', requireAdmin, invoiceController.remindInvoicePayment);

// Cập nhật hóa đơn
router.put('/:id', requireAdmin, invoiceController.updateInvoice);

module.exports = router;
