const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireAuth');
const { chatWithAI } = require('../controllers/aiController');

router.post('/chat', requireAuth, chatWithAI);

module.exports = router;
