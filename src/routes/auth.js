const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth'); // Import protect function

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-signin', authController.googleSignIn);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout); // Use protect instead of auth

// Protected routes
router.get('/me', protect, authController.getProfile); // Use protect instead of auth
router.put('/change-password', protect, authController.changePassword); // Use protect instead of auth

module.exports = router;