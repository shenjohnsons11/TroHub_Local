const express = require('express');
const { requireAdmin } = require('../middleware/requireAdmin');
const { readMeter, scanCCCD } = require('../controllers/ocrController');

const router = express.Router();
router.post('/meter', requireAdmin, readMeter);
router.post('/cccd', scanCCCD);

module.exports = router;

