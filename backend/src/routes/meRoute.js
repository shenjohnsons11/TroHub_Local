const express = require('express');
const router = express.Router();
const meController = require('../controllers/meController');
const { requireTenant } = require('../middleware/requireTenant');

// Lấy toàn bộ dữ liệu portal người thuê
router.get('/', meController.getTenantPortal);

// Người thuê ký hợp đồng
router.put('/sign-contract/:contractId', requireTenant, meController.signContract);

// Người thuê thanh toán hóa đơn
router.put('/pay-invoice/:invoiceId', meController.payInvoice);

// Người thuê gửi yêu cầu sửa chữa
router.post('/repairs', meController.createRepair);

// Người thuê xóa yêu cầu sửa chữa
router.delete('/repairs/:id', meController.deleteRepair);

// Người thuê yêu cầu trả phòng
router.put('/request-terminate/:contractId', requireTenant, meController.requestTerminateContract);

// Người thuê báo cáo điện nước
router.post('/report-utility', meController.reportUtility);

// Quản lý lời mời (Invites)
router.get('/invites', meController.getInvites);
router.put('/invites/:id/accept', meController.acceptInvite);
router.put('/invites/:id/reject', meController.rejectInvite);

module.exports = router;
