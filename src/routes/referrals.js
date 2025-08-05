const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const referralController = require('../controllers/referralController');

router.get('/stats', protect, referralController.getReferralStats);

module.exports = router;