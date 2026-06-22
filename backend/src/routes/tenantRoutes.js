const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

// Web
router.get('/', tenantController.getAllTenants);
router.post('/', tenantController.createTenant);
router.get('/:id', tenantController.getTenantById);
router.put('/:id', tenantController.updateTenant);
router.put('/:id/terminate', tenantController.terminateTenant);

// Mobile
router.get('/home-summary/:tenantId', tenantController.getHomeSummary);

module.exports = router;