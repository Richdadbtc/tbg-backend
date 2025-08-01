const User = require('../models/User');
const { sendNotification } = require('../services/notificationService');

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
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

// Update FCM token
exports.updateFCMToken = async (req, res) => {
  try {
    const { fcm_token } = req.body;
    
    await User.findByIdAndUpdate(req.user._id, {
      fcmToken: fcm_token
    });
    
    res.json({
      success: true,
      message: 'FCM token updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phoneNumber },
      { new: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
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

// Get user earnings (for dashboard)
exports.getUserEarnings = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get today's quiz count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayQuizzes = await QuizResult.countDocuments({
      userId,
      createdAt: { $gte: today }
    });
    
    // Get weekly rank (simplified)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weeklyRank = 1; // Implement proper ranking logic
    
    res.json({
      success: true,
      today_quizzes: todayQuizzes,
      weekly_rank: weeklyRank
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};