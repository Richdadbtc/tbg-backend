const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const walletController = require('../controllers/walletController');

router.get('/balance', auth, walletController.getWalletBalance);
router.get('/transactions', auth, walletController.getTransactionHistory);
router.post('/withdraw', auth, walletController.requestWithdrawal);
router.get('/withdrawals', auth, walletController.getWithdrawalHistory);

module.exports = router;