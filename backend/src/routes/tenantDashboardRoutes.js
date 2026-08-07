const express = require('express');
const { requireTenant } = require('../middleware/requireTenant');
const propertyMembershipController = require('../controllers/propertyMembershipController');
const tenantDashboardController = require('../controllers/tenantDashboardController');

const router = express.Router();

router.use(requireTenant);
router.get('/dashboard', tenantDashboardController.getDashboard);
router.get('/memberships', propertyMembershipController.listMine);
router.put('/memberships/:membershipId/accept', propertyMembershipController.accept);
router.delete('/memberships/:membershipId', propertyMembershipController.decline);

module.exports = router;
