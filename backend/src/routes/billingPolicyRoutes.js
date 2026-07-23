const express = require('express');
const { requireAdmin } = require('../middleware/requireAdmin');
const billingPolicyController = require('../controllers/billingPolicyController');

const router = express.Router();

router.use(requireAdmin);
router.get('/', billingPolicyController.getBillingPolicy);
router.put('/', billingPolicyController.updateBillingPolicy);

module.exports = router;
