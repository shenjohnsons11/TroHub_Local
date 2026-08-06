const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { requireAdmin } = require('../middleware/requireAdmin');

// Web
router.post('/check-duplicate', requireAdmin, tenantController.checkDuplicate);
router.get('/lookup', requireAdmin, tenantController.lookupTenant);
router.get('/', requireAdmin, tenantController.getAllTenants);
router.post('/', requireAdmin, tenantController.createTenant);
router.get('/:id', requireAdmin, tenantController.getTenantById);
router.put('/:id', requireAdmin, tenantController.updateTenant);
router.put('/:id/terminate', requireAdmin, tenantController.terminateTenant);

// Mobile
router.get('/home-summary/:tenantId', tenantController.getHomeSummary);

module.exports = router;
