const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAdmin } = require('../middleware/requireAdmin');

router.get('/', requireAdmin, paymentController.getAllPayments);

// Tạo mã QR VietQR cho hóa đơn
router.post('/vietqr/create', paymentController.createVietQRPayment);

// Webhook giả lập xác nhận thanh toán VietQR thành công
router.post('/vietqr/webhook', paymentController.vietQRWebhook);

// VNPay routes
router.post('/vnpay/create', paymentController.createVNPayUrl);
router.get('/vnpay/ipn', paymentController.vnpayIpn);

// Kiểm tra trạng thái giao dịch
router.get('/:id/status', paymentController.getPaymentStatus);

module.exports = router;
