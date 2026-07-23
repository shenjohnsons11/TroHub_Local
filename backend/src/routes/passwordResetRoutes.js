const express = require('express');
const { createPasswordResetController } = require('../controllers/passwordResetController');
const { createEmailService } = require('../services/emailService');
const { createMongoPasswordResetService } = require('../services/passwordResetService');

const emailService = createEmailService();
const service = createMongoPasswordResetService({
    sendOtpEmail: emailService.sendOtp,
    sendPasswordChangedEmail: emailService.sendPasswordChanged,
});
const controller = createPasswordResetController(service);
const router = express.Router();

router.post('/request', controller.requestOtp);
router.post('/verify', controller.verifyOtp);
router.post('/complete', controller.completeReset);

module.exports = router;
