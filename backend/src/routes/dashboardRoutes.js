const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAdmin } = require('../middleware/requireAdmin');

router.use(requireAdmin);
router.get('/stats', dashboardController.getStats);

module.exports = router;
