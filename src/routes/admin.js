const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// Existing routes
router.post('/login', adminController.adminLogin);
router.get('/dashboard-stats', protect, admin, adminController.getDashboardStats);
router.get('/users', protect, admin, adminController.getAllUsers);
router.put('/users/:userId/status', protect, admin, adminController.updateUserStatus);
router.post('/create-admin', protect, admin, adminController.createAdmin);

// Quiz Management Routes
router.post('/quiz/questions', protect, admin, adminController.createQuizQuestion);
router.get('/quiz/questions', protect, admin, adminController.getAllQuizQuestions);
router.put('/quiz/questions/:questionId', protect, admin, adminController.updateQuizQuestion);
router.delete('/quiz/questions/:questionId', protect, admin, adminController.deleteQuizQuestion);

// Notification Management Routes
router.post('/notifications/announcement', protect, admin, adminController.sendAnnouncement);
router.post('/notifications/targeted', protect, admin, adminController.sendTargetedNotification);
router.get('/notifications/analytics', protect, admin, adminController.getNotificationAnalytics);

module.exports = router;