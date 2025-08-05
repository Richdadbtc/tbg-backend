const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/', protect, notificationController.getNotifications);
router.put('/:notificationId/read', protect, notificationController.markAsRead);
router.put('/mark-all-read', protect, notificationController.markAllAsRead);
router.delete('/:notificationId', protect, notificationController.deleteNotification);

module.exports = router;