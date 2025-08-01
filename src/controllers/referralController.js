const User = require('../models/User');
const Referral = require('../models/Referral');
const Transaction = require('../models/Transaction');
const { sendNotification } = require('../services/notificationService');

// Get referral stats
exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get referral count and total bonus
    const referralStats = await Referral.aggregate([
      { $match: { referrerId: userId } },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          totalBonus: { $sum: '$bonusAmount' },
          paidBonus: {
            $sum: {
              $cond: [{ $eq: ['$bonusPaid', true] }, '$bonusAmount', 0]
            }
          }
        }
      }
    ]);
    
    // Get referred users
    const referredUsers = await Referral.find({ referrerId: userId })
      .populate('referredUserId', 'name email createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    
    const stats = referralStats[0] || {
      totalReferrals: 0,
      totalBonus: 0,
      paidBonus: 0
    };
    
    // Get user's referral code
    const user = await User.findById(userId).select('referralCode');
    
    res.json({
      success: true,
      referralCode: user.referralCode,
      stats,
      referredUsers: referredUsers.map(ref => ({
        id: ref._id,
        user: ref.referredUserId,
        bonusAmount: ref.bonusAmount,
        bonusPaid: ref.bonusPaid,
        joinedAt: ref.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Process referral bonus (called when referred user completes first quiz)
exports.processReferralBonus = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user.referredBy) return;
    
    // Check if bonus already paid
    const existingReferral = await Referral.findOne({
      referrerId: user.referredBy,
      referredUserId: userId,
      bonusPaid: true
    });
    
    if (existingReferral) return;
    
    const bonusAmount = 5.0; // $5 referral bonus
    
    // Create or update referral record
    await Referral.findOneAndUpdate(
      {
        referrerId: user.referredBy,
        referredUserId: userId
      },
      {
        bonusAmount,
        bonusPaid: true,
        status: 'completed'
      },
      { upsert: true }
    );
    
    // Add bonus to referrer's account
    await User.findByIdAndUpdate(user.referredBy, {
      $inc: { earnings: bonusAmount }
    });
    
    // Create transaction record
    const transaction = new Transaction({
      userId: user.referredBy,
      type: 'referral_bonus',
      amount: bonusAmount,
      description: `Referral bonus for ${user.name}`,
      status: 'completed',
      metadata: {
        referredUserId: userId
      }
    });
    
    await transaction.save();
    
    // Send notification to referrer
    await sendNotification(user.referredBy, {
      title: 'Referral Bonus Earned!',
      body: `You earned $${bonusAmount} for referring ${user.name}`,
      type: 'earning',
      data: { amount: bonusAmount, referredUser: user.name }
    });
    
  } catch (error) {
    console.error('Error processing referral bonus:', error);
  }
};