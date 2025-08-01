const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const referralController = require('../controllers/referralController');

router.get('/stats', auth, referralController.getReferralStats);

module.exports = router;