const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

// All wallet routes require authentication
router.use(protect);

router.get('/balance', walletController.getWalletBalance);
router.get('/transactions', walletController.getTransactionHistory);
router.post('/withdraw', walletController.requestWithdrawal);
router.get('/withdrawals', walletController.getWithdrawalHistory);

// TBG Transfer routes
router.post('/transfer/tbg', walletController.sendTBGCoins);
router.get('/transfer/tbg/history', walletController.getTBGTransferHistory);
router.get('/user/phone/:phoneNumber', walletController.findUserByPhone);

module.exports = router;