const express = require('express');
const { createPasswordResetController } = require('../controllers/passwordResetController');
const { requireAdmin } = require('../middleware/requireAdmin');
const { createMongoPasswordResetService } = require('../services/passwordResetService');

const controller = createPasswordResetController(createMongoPasswordResetService({
    sendOtpEmail: async () => {},
    sendPasswordChangedEmail: async () => {},
}));
const router = express.Router();

router.post(
    '/:accountId/temporary-password',
    requireAdmin,
    controller.issueTemporaryPassword,
);

module.exports = router;
