const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // Import protect function specifically
const userController = require('../controllers/userController');

router.get('/profile', protect, userController.getUserProfile); // Use protect instead of auth
router.put('/profile', protect, userController.updateProfile); // Use protect instead of auth
router.post('/fcm-token', protect, userController.updateFCMToken); // Use protect instead of auth
router.get('/earnings', protect, userController.getUserEarnings); // Use protect instead of auth

module.exports = router;