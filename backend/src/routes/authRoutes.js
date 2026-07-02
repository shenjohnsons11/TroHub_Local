const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Đường dẫn đăng ký và đăng nhập tổng hợp mới
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.getMe);
router.put('/me', authController.updateMe);
router.put('/change-password', authController.changePassword);

module.exports = router;