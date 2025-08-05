const User = require('../models/User');
const QuizResult = require('../models/QuizResult');
const Question = require('../models/Question');
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
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalQuestions = await Question.countDocuments();
    const totalQuizResults = await QuizResult.countDocuments();
    
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
      data: {
        stats: {
          totalUsers,
          totalAdmins,
          totalQuestions,
          totalQuizResults
        },
        recentActivity: {
          recentUsers,
          recentQuizResults
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