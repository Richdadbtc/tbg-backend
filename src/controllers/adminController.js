const User = require('../models/User');
const QuizResult = require('../models/QuizResult');
const Question = require('../models/Question');
const Notification = require('../models/Notification');
const { sendFCMNotification } = require('../services/notificationService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and is admin
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get admin dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalQuizzes = await Question.countDocuments();
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    
    // Calculate total TBG coins earned by all users (including both old earnings and new tbgCoins)
    const earningsResult = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $group: {
          _id: null,
          totalEarnings: { 
            $sum: { 
              $add: [
                { $ifNull: ['$tbgCoins', 0] },
                { $ifNull: ['$earnings', 0] }
              ]
            }
          }
        }
      }
    ]);
    
    const totalEarnings = earningsResult.length > 0 ? earningsResult[0].totalEarnings : 0;
    
    // Get recent activity
    const recentUsers = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');
    
    const recentQuizResults = await QuizResult.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      totalUsers,
      totalQuizzes,
      totalEarnings, // Now includes both old earnings and new TBG coins
      activeUsers,
      recentActivity: {
        recentUsers,
        recentQuizResults
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all users with pagination
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create admin user
exports.createAdmin = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create admin user
    const admin = new User({
      email,
      name,
      password,
      role: 'admin',
      isVerified: true
    });

    await admin.save();

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: adminResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create new quiz question
exports.createQuizQuestion = async (req, res) => {
  try {
    const {
      question,
      options,
      correctAnswerIndex,
      category,
      difficulty,
      reward,
      timeLimit
    } = req.body;

    const newQuestion = new Question({
      question,
      options,
      correctAnswerIndex,
      category,
      difficulty,
      reward,
      timeLimit,
      isActive: true
    });

    await newQuestion.save();

    res.status(201).json({
      success: true,
      message: 'Quiz question created successfully',
      question: newQuestion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz question',
      error: error.message
    });
  }
};

// Get all quiz questions for admin
exports.getAllQuizQuestions = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, difficulty, isActive } = req.query;
    
    const query = {};
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Question.countDocuments(query);

    res.json({
      success: true,
      questions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz questions',
      error: error.message
    });
  }
};

// Update quiz question
exports.updateQuizQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const updateData = req.body;

    const question = await Question.findByIdAndUpdate(
      questionId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Quiz question not found'
      });
    }

    res.json({
      success: true,
      message: 'Quiz question updated successfully',
      question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz question',
      error: error.message
    });
  }
};

// Delete quiz question
exports.deleteQuizQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findByIdAndDelete(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Quiz question not found'
      });
    }

    res.json({
      success: true,
      message: 'Quiz question deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz question',
      error: error.message
    });
  }
};

// Send announcement to all users
exports.sendAnnouncement = async (req, res) => {
  try {
    const { title, body, type = 'system', priority = 'medium', imageUrl, actionUrl } = req.body;

    // Get all active users
    const users = await User.find({ isActive: true }).select('_id fcmToken');

    // Create notifications for all users
    const notifications = users.map(user => ({
      userId: user._id,
      title,
      body,
      type,
      priority,
      imageUrl,
      actionUrl,
      isRead: false
    }));

    await Notification.insertMany(notifications);

    // Send push notifications to users with FCM tokens
    const usersWithTokens = users.filter(user => user.fcmToken);
    const pushPromises = usersWithTokens.map(user => 
      sendFCMNotification(user.fcmToken, title, body, { type, actionUrl })
    );

    await Promise.allSettled(pushPromises);

    res.json({
      success: true,
      message: `Announcement sent to ${users.length} users`,
      sentTo: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send announcement',
      error: error.message
    });
  }
};

// Send targeted notification
exports.sendTargetedNotification = async (req, res) => {
  try {
    const { userIds, title, body, type = 'system', priority = 'medium', imageUrl, actionUrl } = req.body;

    // Validate userIds
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    // Get target users
    const users = await User.find({ 
      _id: { $in: userIds }, 
      isActive: true 
    }).select('_id fcmToken');

    // Create notifications
    const notifications = users.map(user => ({
      userId: user._id,
      title,
      body,
      type,
      priority,
      imageUrl,
      actionUrl,
      isRead: false
    }));

    await Notification.insertMany(notifications);

    // Send push notifications
    const usersWithTokens = users.filter(user => user.fcmToken);
    const pushPromises = usersWithTokens.map(user => 
      sendFCMNotification(user.fcmToken, title, body, { type, actionUrl })
    );

    await Promise.allSettled(pushPromises);

    res.json({
      success: true,
      message: `Notification sent to ${users.length} users`,
      sentTo: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send targeted notification',
      error: error.message
    });
  }
};

// Get notification analytics
exports.getNotificationAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            type: '$type',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          total: { $sum: 1 },
          read: { $sum: { $cond: ['$isRead', 1, 0] } },
          unread: { $sum: { $cond: ['$isRead', 0, 1] } }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          dailyStats: {
            $push: {
              date: '$_id.date',
              total: '$total',
              read: '$read',
              unread: '$unread'
            }
          },
          totalNotifications: { $sum: '$total' },
          totalRead: { $sum: '$read' },
          totalUnread: { $sum: '$unread' }
        }
      }
    ]);

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification analytics',
      error: error.message
    });
  }
};

// Add new user (Admin only)
exports.addUser = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role,
      isVerified: true, // Admin-created users are auto-verified
      isActive: true
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deletion of admin users
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Delete user and related data
    await User.findByIdAndDelete(userId);
    
    // Optionally delete related quiz results
    await QuizResult.deleteMany({ userId });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get comprehensive analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (range) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get overview stats
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    const totalQuizzes = await Question.countDocuments();
    
    // Calculate total earnings
    const earningsResult = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $group: {
          _id: null,
          totalEarnings: { 
            $sum: { 
              $add: [
                { $ifNull: ['$tbgCoins', 0] },
                { $ifNull: ['$earnings', 0] }
              ]
            }
          }
        }
      }
    ]);
    
    const totalEarnings = earningsResult.length > 0 ? earningsResult[0].totalEarnings : 0;
    
    // Get quiz completions in range
    const quizCompletions = await QuizResult.countDocuments({
      createdAt: { $gte: startDate }
    });
    
    // Get user growth stats
    const userStats = {
      daily: await User.countDocuments({
        role: 'user',
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }),
      weekly: await User.countDocuments({
        role: 'user',
        createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      }),
      monthly: await User.countDocuments({
        role: 'user',
        createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      })
    };
    
    // Get quiz stats
    const quizStatsResult = await QuizResult.aggregate([
      {
        $group: {
          _id: null,
          averageScore: { $avg: { $divide: ['$correctAnswers', '$totalQuestions'] } },
          totalQuestions: { $sum: '$totalQuestions' }
        }
      }
    ]);
    
    const quizStats = {
      totalQuestions: await Question.countDocuments(),
      averageScore: quizStatsResult.length > 0 ? Math.round(quizStatsResult[0].averageScore * 100) : 0,
      popularCategories: await Question.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { category: '$_id', count: 1, _id: 0 } }
      ])
    };
    
    // Get earnings stats
    const Transaction = require('../models/Transaction');
    const earningsStats = {
      totalPaid: 0, // This would need to be calculated from completed withdrawal transactions
      pendingPayouts: 0, // This would need to be calculated from pending withdrawal transactions
      averageEarningsPerUser: totalUsers > 0 ? totalEarnings / totalUsers : 0
    };
    
    // Calculate user growth percentage
    const previousPeriodUsers = await User.countDocuments({
      role: 'user',
      createdAt: { $lt: startDate }
    });
    
    const userGrowth = previousPeriodUsers > 0 ? 
      ((totalUsers - previousPeriodUsers) / previousPeriodUsers * 100) : 0;

    res.json({
      success: true,
      overview: {
        totalUsers,
        activeUsers,
        totalQuizzes,
        totalEarnings,
        userGrowth: Math.round(userGrowth * 100) / 100,
        quizCompletions
      },
      userStats,
      quizStats,
      earningsStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

// Get all transactions with filtering
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '', type = '' } = req.query;
    
    const Transaction = require('../models/Transaction');
    
    let query = {};
    
    if (search) {
      // Search in user name, email, or transaction reference
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      query.$or = [
        { userId: { $in: users.map(u => u._id) } },
        { reference: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    const transactions = await Transaction.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Transaction.countDocuments(query);
    
    // Get transaction stats
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          completedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          }
        }
      }
    ]);
    
    // Get today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          todayTransactions: { $sum: 1 },
          todayAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const transactionStats = {
      ...stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        pendingAmount: 0,
        completedAmount: 0
      },
      ...todayStats[0] || {
        todayTransactions: 0,
        todayAmount: 0
      }
    };
    
    res.json({
      success: true,
      transactions,
      stats: transactionStats,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message
    });
  }
};

// Export transactions
exports.exportTransactions = async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    
    const transactions = await Transaction.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    // Create CSV content
    const csvHeader = 'Date,User Name,User Email,Type,Amount,Status,Description,Reference\n';
    const csvContent = transactions.map(t => 
      `${t.createdAt.toISOString()},${t.userId.name},${t.userId.email},${t.type},${t.amount},${t.status},"${t.description}",${t.reference || ''}`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csvHeader + csvContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting transactions',
      error: error.message
    });
  }
};

// Get app settings
exports.getSettings = async (req, res) => {
  try {
    // For now, return default settings
    // In a real app, you'd store these in a database
    const settings = {
      general: {
        appName: 'TBG Quiz App',
        appDescription: 'Earn money by playing quizzes',
        supportEmail: 'support@tbgquiz.com',
        maintenanceMode: false,
        registrationEnabled: true
      },
      quiz: {
        defaultTimeLimit: 30,
        maxQuestionsPerQuiz: 20,
        minQuestionsPerQuiz: 5,
        defaultReward: 1.0,
        enableDailyQuiz: true
      },
      notifications: {
        enablePushNotifications: true,
        enableEmailNotifications: true,
        welcomeMessageEnabled: true,
        welcomeMessage: 'Welcome to TBG Quiz! Start earning by playing quizzes.'
      },
      payments: {
        minimumWithdrawal: 10.0,
        withdrawalFee: 0.5,
        referralBonus: 5.0,
        enableReferrals: true
      },
      security: {
        sessionTimeout: 24,
        maxLoginAttempts: 5,
        enableTwoFactor: false,
        passwordMinLength: 8
      }
    };
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
};

// Update app settings
exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    // In a real app, you'd save these to a database
    // For now, just return success
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
};