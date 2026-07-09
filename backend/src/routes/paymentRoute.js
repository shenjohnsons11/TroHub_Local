const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.get('/', paymentController.getAllPayments);

// Tạo mã QR VietQR cho hóa đơn
router.post('/vietqr/create', paymentController.createVietQRPayment);

// Webhook giả lập xác nhận thanh toán VietQR thành công
router.post('/vietqr/webhook', paymentController.vietQRWebhook);

// Kiểm tra trạng thái giao dịch
router.get('/:id/status', paymentController.getPaymentStatus);

module.exports = router;