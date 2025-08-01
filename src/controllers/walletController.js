const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { initiatePaystackTransfer } = require('../services/paymentService');
const { sendNotification } = require('../services/notificationService');

// Get wallet balance
exports.getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('earnings points');
    
    res.json({
      success: true,
      wallet: {
        balance: user.earnings,
        points: user.points
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

// Get transaction history
exports.getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    const query = { userId: req.user._id };
    if (type) query.type = type;
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('metadata.quizResultId', 'correctAnswers totalQuestions');
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      transactions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
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

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, method, accountDetails } = req.body;
    
    // Validate minimum withdrawal amount
    if (amount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is $10'
      });
    }
    
    // Check user balance
    const user = await User.findById(req.user._id);
    if (user.earnings < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Generate reference
    const reference = `WD_${Date.now()}_${user._id.toString().slice(-6)}`;
    
    // Create withdrawal transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'withdrawal',
      amount: -amount,
      description: `Withdrawal via ${method}`,
      status: 'pending',
      reference,
      metadata: {
        withdrawalMethod: method,
        accountDetails
      }
    });
    
    await transaction.save();
    
    // Deduct amount from user balance
    user.earnings -= amount;
    await user.save();
    
    // Initiate payment via Paystack (for supported methods)
    if (method === 'bank_transfer') {
      try {
        const transferResult = await initiatePaystackTransfer({
          amount: amount * 100, // Convert to kobo
          recipient: accountDetails,
          reference
        });
        
        if (transferResult.success) {
          transaction.status = 'completed';
          await transaction.save();
        }
      } catch (paymentError) {
        console.error('Payment error:', paymentError);
        // Keep transaction as pending for manual review
      }
    }
    
    // Send notification
    await sendNotification(user._id, {
      title: 'Withdrawal Request',
      body: `Your withdrawal request of $${amount} has been submitted`,
      type: 'withdrawal',
      data: { transactionId: transaction._id }
    });
    
    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get withdrawal history
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const withdrawals = await Transaction.find({
      userId: req.user._id,
      type: 'withdrawal'
    })
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.json({
      success: true,
      withdrawals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};