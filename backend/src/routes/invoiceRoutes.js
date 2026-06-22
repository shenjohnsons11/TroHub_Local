const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

// Lấy danh sách hóa đơn (Web)
router.get('/', invoiceController.getAllInvoices);

// Lấy danh sách xem trước lập hóa đơn hàng loạt
router.get('/bulk-preview', invoiceController.getBulkPreview);

// Tạo hóa đơn hàng loạt
router.post('/bulk', invoiceController.createBulkInvoices);

// Chủ trọ xuất hóa đơn mới
router.post('/', invoiceController.createInvoice);

// Xem chi tiết một hóa đơn (Web & Mobile)
router.get('/:id', invoiceController.getInvoiceById);

// Đánh dấu thanh toán (Tự động sinh Transaction)
router.put('/:id/pay', invoiceController.payInvoice);

// Gửi nhắc nhở thanh toán (Tự chuyển quá hạn)
router.put('/:id/remind', invoiceController.remindInvoice);

// Cập nhật hóa đơn
router.put('/:id', invoiceController.updateInvoice);

module.exports = router;