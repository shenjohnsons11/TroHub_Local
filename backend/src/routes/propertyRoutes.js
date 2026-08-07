const express = require('express');
const { requireAdmin } = require('../middleware/requireAdmin');
const propertyController = require('../controllers/propertyController');
const propertyMembershipController = require('../controllers/propertyMembershipController');

const router = express.Router();

router.use(requireAdmin);
router.get('/', propertyController.list);
router.post('/', propertyController.create);
router.patch('/:propertyId', propertyController.update);
router.get('/:propertyId/members', propertyMembershipController.listForProperty);
router.post('/:propertyId/members', propertyMembershipController.invite);

module.exports = router;
