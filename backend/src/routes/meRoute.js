const express = require('express');
const router = express.Router();
const meController = require('../controllers/meController');

// Lấy toàn bộ dữ liệu portal người thuê
router.get('/', meController.getTenantPortal);

// Người thuê ký hợp đồng
router.put('/sign-contract/:contractId', meController.signContract);

// Người thuê thanh toán hóa đơn
router.put('/pay-invoice/:invoiceId', meController.payInvoice);

// Người thuê gửi yêu cầu sửa chữa
router.post('/repairs', meController.createRepair);

// Người thuê xóa yêu cầu sửa chữa
router.delete('/repairs/:id', meController.deleteRepair);

// Người thuê yêu cầu trả phòng
router.put('/request-terminate/:contractId', meController.requestTerminateContract);

module.exports = router;
