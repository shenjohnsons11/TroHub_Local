const express = require('express');
const { readMeter, scanCCCD } = require('../controllers/ocrController');

const router = express.Router();
router.post('/meter', readMeter);
router.post('/cccd', scanCCCD);

module.exports = router;
