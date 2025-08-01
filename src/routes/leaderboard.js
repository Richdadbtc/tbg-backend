const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const auth = require('../middleware/auth');

// Leaderboard routes (all protected)
router.use(auth);

// Get leaderboards
router.get('/weekly', leaderboardController.getWeeklyLeaderboard);
router.get('/monthly', leaderboardController.getMonthlyLeaderboard);
router.get('/all-time', leaderboardController.getAllTimeLeaderboard);
router.get('/daily', leaderboardController.getDailyLeaderboard);

// User ranking and stats
router.get('/my-rank', leaderboardController.getUserRank);
router.get('/user-stats/:userId', leaderboardController.getUserStats);
router.get('/top-performers', leaderboardController.getTopPerformers);

// Category-specific leaderboards
router.get('/category/:category', leaderboardController.getCategoryLeaderboard);

module.exports = router;