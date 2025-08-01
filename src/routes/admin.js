const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const admin = require('../middleware/admin');

// Admin authentication
router.post('/login', adminController.adminLogin);

// Protected admin routes
router.use(admin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.post('/create-admin', adminController.createAdmin);

module.exports = router;