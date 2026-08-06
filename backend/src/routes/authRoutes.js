const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Đường dẫn đăng ký và đăng nhập tổng hợp mới
router.post('/register', authController.register);
router.get('/reverse-geocode', authController.reverseGeocode);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOtp);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authController.getMe);
router.put('/me', authController.updateMe);
router.put('/change-password', authController.changePassword);

module.exports = router;
