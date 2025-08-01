const User = require('../models/User');
const QuizResult = require('../models/QuizResult');
const mongoose = require('mongoose');

// Get weekly leaderboard
exports.getWeeklyLeaderboard = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    
    const leaderboard = await QuizResult.aggregate([
      { $match: { createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: '$userId',
          totalEarnings: { $sum: '$totalEarnings' },
          totalPoints: { $sum: '$totalPoints' },
          quizCount: { $sum: 1 },
          avgCorrectAnswers: { $avg: '$correctAnswers' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.name',
          profilePicture: '$user.profilePicture',
          totalEarnings: 1,
          totalPoints: 1,
          quizCount: 1,
          avgCorrectAnswers: { $round: ['$avgCorrectAnswers', 2] }
        }
      },
      { $sort: { totalPoints: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: rankedLeaderboard,
      period: 'weekly'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly leaderboard',
      error: error.message
    });
  }
};

// Get monthly leaderboard
exports.getMonthlyLeaderboard = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const leaderboard = await QuizResult.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: '$userId',
          totalEarnings: { $sum: '$totalEarnings' },
          totalPoints: { $sum: '$totalPoints' },
          quizCount: { $sum: 1 },
          avgCorrectAnswers: { $avg: '$correctAnswers' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.name',
          profilePicture: '$user.profilePicture',
          totalEarnings: 1,
          totalPoints: 1,
          quizCount: 1,
          avgCorrectAnswers: { $round: ['$avgCorrectAnswers', 2] }
        }
      },
      { $sort: { totalPoints: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: rankedLeaderboard,
      period: 'monthly'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly leaderboard',
      error: error.message
    });
  }
};

// Get all-time leaderboard
exports.getAllTimeLeaderboard = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const leaderboard = await QuizResult.aggregate([
      {
        $group: {
          _id: '$userId',
          totalEarnings: { $sum: '$totalEarnings' },
          totalPoints: { $sum: '$totalPoints' },
          quizCount: { $sum: 1 },
          avgCorrectAnswers: { $avg: '$correctAnswers' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.name',
          profilePicture: '$user.profilePicture',
          totalEarnings: 1,
          totalPoints: 1,
          quizCount: 1,
          avgCorrectAnswers: { $round: ['$avgCorrectAnswers', 2] }
        }
      },
      { $sort: { totalPoints: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: rankedLeaderboard,
      period: 'all-time'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching all-time leaderboard',
      error: error.message
    });
  }
};

// Get daily leaderboard
exports.getDailyLeaderboard = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const leaderboard = await QuizResult.aggregate([
      { 
        $match: { 
          createdAt: { 
            $gte: today,
            $lt: tomorrow
          }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalEarnings: { $sum: '$totalEarnings' },
          totalPoints: { $sum: '$totalPoints' },
          quizCount: { $sum: 1 },
          avgCorrectAnswers: { $avg: '$correctAnswers' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.name',
          profilePicture: '$user.profilePicture',
          totalEarnings: 1,
          totalPoints: 1,
          quizCount: 1,
          avgCorrectAnswers: { $round: ['$avgCorrectAnswers', 2] }
        }
      },
      { $sort: { totalPoints: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: rankedLeaderboard,
      period: 'daily'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching daily leaderboard',
      error: error.message
    });
  }
};

// Get user rank
exports.getUserRank = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'weekly' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'weekly') {
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: weekStart } };
    } else if (period === 'monthly') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: monthStart } };
    } else if (period === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateFilter = { createdAt: { $gte: today, $lt: tomorrow } };
    }
    
    const leaderboard = await QuizResult.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$userId',
          totalPoints: { $sum: '$totalPoints' }
        }
      },
      { $sort: { totalPoints: -1 } }
    ]);

    const userRank = leaderboard.findIndex(user => user._id.toString() === userId.toString()) + 1;
    const userStats = leaderboard.find(user => user._id.toString() === userId.toString());

    res.json({
      success: true,
      data: {
        rank: userRank || null,
        totalPoints: userStats?.totalPoints || 0,
        period
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user rank',
      error: error.message
    });
  }
};

// Get top performers
exports.getTopPerformers = async (req, res) => {
  try {
    const { limit = 10, period = 'weekly' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'weekly') {
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: weekStart } };
    } else if (period === 'monthly') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: monthStart } };
    }
    
    const topPerformers = await QuizResult.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$userId',
          totalEarnings: { $sum: '$totalEarnings' },
          totalPoints: { $sum: '$totalPoints' },
          quizCount: { $sum: 1 },
          avgCorrectAnswers: { $avg: '$correctAnswers' },
          avgAccuracy: { $avg: { $divide: ['$correctAnswers', '$totalQuestions'] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.name',
          profilePicture: '$user.profilePicture',
          totalEarnings: 1,
          totalPoints: 1,
          quizCount: 1,
          avgCorrectAnswers: { $round: ['$avgCorrectAnswers', 2] },
          avgAccuracy: { $round: [{ $multiply: ['$avgAccuracy', 100] }, 2] }
        }
      },
      { $sort: { avgAccuracy: -1, totalPoints: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: topPerformers,
      period
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching top performers',
      error: error.message
    });
  }
};

// Get category leaderboard
exports.getCategoryLeaderboard = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 50, period = 'weekly' } = req.query;
    
    let dateFilter = { category };
    const now = new Date();
    
    if (period === 'weekly') {
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      dateFilter.createdAt = { $gte: weekStart };
    } else if (period === 'monthly') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter.createdAt = { $gte: monthStart };
    }
    
    const leaderboard = await QuizResult.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$userId',
          totalEarnings: { $sum: '$totalEarnings' },
          totalPoints: { $sum: '$totalPoints' },
          quizCount: { $sum: 1 },
          avgCorrectAnswers: { $avg: '$correctAnswers' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.name',
          profilePicture: '$user.profilePicture',
          totalEarnings: 1,
          totalPoints: 1,
          quizCount: 1,
          avgCorrectAnswers: { $round: ['$avgCorrectAnswers', 2] }
        }
      },
      { $sort: { totalPoints: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: rankedLeaderboard,
      category,
      period
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category leaderboard',
      error: error.message
    });
  }
};

// Get user stats
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    
    // Get overall stats
    const overallStats = await QuizResult.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          totalEarnings: { $sum: '$totalEarnings' },
          totalPoints: { $sum: '$totalPoints' },
          avgCorrectAnswers: { $avg: '$correctAnswers' },
          avgAccuracy: { $avg: { $divide: ['$correctAnswers', '$totalQuestions'] } }
        }
      }
    ]);

    // Get daily stats (today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dailyStats = await QuizResult.aggregate([
      { 
        $match: { 
          userId: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          dailyQuizzes: { $sum: 1 },
          dailyEarnings: { $sum: '$totalEarnings' },
          dailyPoints: { $sum: '$totalPoints' }
        }
      }
    ]);

    // Get weekly stats
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    
    const weeklyStats = await QuizResult.aggregate([
      { 
        $match: { 
          userId: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: weekStart }
        }
      },
      {
        $group: {
          _id: null,
          weeklyQuizzes: { $sum: 1 },
          weeklyEarnings: { $sum: '$totalEarnings' },
          weeklyPoints: { $sum: '$totalPoints' }
        }
      }
    ]);

    // Get weekly rank
    const weeklyLeaderboard = await QuizResult.aggregate([
      { $match: { createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: '$userId',
          totalPoints: { $sum: '$totalPoints' }
        }
      },
      { $sort: { totalPoints: -1 } }
    ]);

    const weeklyRank = weeklyLeaderboard.findIndex(user => 
      user._id.toString() === userId.toString()
    ) + 1;

    const stats = {
      overall: overallStats[0] || {
        totalQuizzes: 0,
        totalEarnings: 0,
        totalPoints: 0,
        avgCorrectAnswers: 0,
        avgAccuracy: 0
      },
      daily: dailyStats[0] || {
        dailyQuizzes: 0,
        dailyEarnings: 0,
        dailyPoints: 0
      },
      weekly: {
        ...weeklyStats[0] || {
          weeklyQuizzes: 0,
          weeklyEarnings: 0,
          weeklyPoints: 0
        },
        weeklyRank: weeklyRank || null
      }
    };

    // Round accuracy to percentage
    if (stats.overall.avgAccuracy) {
      stats.overall.avgAccuracy = Math.round(stats.overall.avgAccuracy * 100);
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user stats',
      error: error.message
    });
  }
};
