const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { requireTenant } = require('../middleware/requireTenant');
const notificationController = require('../controllers/notificationController');

const router = express.Router();
router.use(requireAuth);
router.use(requireTenant);

router.post('/devices', notificationController.registerDevice);
router.post('/devices/deactivate', notificationController.deactivateDevice);
router.delete('/devices/:deviceId', notificationController.unregisterDevice);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.put('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.put('/:id/read', notificationController.markRead);
router.get('/', notificationController.listNotifications);

module.exports = router;
