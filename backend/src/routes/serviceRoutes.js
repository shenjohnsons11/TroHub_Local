const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { requireAdmin } = require('../middleware/requireAdmin');

router.use(requireAdmin);
router.get('/', serviceController.getAllServices);
router.post('/', serviceController.createService);
router.post('/:id/price-impact', serviceController.previewPriceImpact);
router.put('/:id/price', serviceController.applyPrice);
router.get('/:id', serviceController.getServiceById);
router.put('/:id', serviceController.updateService);
router.delete('/:id', serviceController.deleteService);

module.exports = router;
