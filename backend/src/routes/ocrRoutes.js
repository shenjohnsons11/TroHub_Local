const express = require('express');
const { requireAdmin } = require('../middleware/requireAdmin');
const { readMeter } = require('../controllers/ocrController');

const router = express.Router();
router.post('/meter', requireAdmin, readMeter);

module.exports = router;
