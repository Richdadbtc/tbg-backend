const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

router.get('/profile', auth, userController.getUserProfile);
router.put('/profile', auth, userController.updateProfile);
router.post('/fcm-token', auth, userController.updateFCMToken);
router.get('/earnings', auth, userController.getUserEarnings);

module.exports = router;