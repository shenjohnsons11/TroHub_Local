const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireAuth');
const { chatWithAI } = require('../controllers/aiController');
const { scanCCCD, readMeter } = require('../controllers/ocrController');

router.post('/chat', requireAuth, chatWithAI);
router.post('/ocr-cccd', scanCCCD);
router.post('/ocr-meter', readMeter);

module.exports = router;
