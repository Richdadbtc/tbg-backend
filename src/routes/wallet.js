const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const auth = require('../middleware/auth');

// Wallet routes (all protected)
router.use(auth);

// Existing routes
router.get('/balance', walletController.getWalletBalance);
router.get('/transactions', walletController.getTransactionHistory);
router.post('/withdraw', walletController.requestWithdrawal);
router.get('/withdrawals', walletController.getWithdrawalHistory);

// TBG Transfer routes
router.post('/transfer/tbg', walletController.sendTBGCoins);
router.get('/transfer/tbg/history', walletController.getTBGTransferHistory);
router.get('/user/phone/:phoneNumber', walletController.findUserByPhone);

module.exports = router;