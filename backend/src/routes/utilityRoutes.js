const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { requireAdmin } = require('../middleware/requireAdmin');

router.get('/readings', requireAdmin, invoiceController.getBulkPreview);

module.exports = router;
