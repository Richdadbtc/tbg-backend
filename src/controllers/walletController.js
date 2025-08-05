const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { initiatePaystackTransfer } = require('../services/paymentService');
const { sendNotification } = require('../services/notificationService');

// Remove the duplicate getWalletBalance function here
// Keep only the one at the end of the file

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

// Send TBG coins to another user
exports.sendTBGCoins = async (req, res) => {
  try {
    const { phoneNumber, amount, note } = req.body;
    const senderId = req.user._id;

    // Validate input
    if (!phoneNumber || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and valid amount are required'
      });
    }

    // Find sender
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    // Check sender balance
    if (sender.tbgCoins < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient TBG coin balance'
      });
    }

    // Find recipient by phone number
    const recipient = await User.findOne({ phoneNumber });
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found. Please check the phone number.'
      });
    }

    // Prevent self-transfer
    if (sender._id.toString() === recipient._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send coins to yourself'
      });
    }

    // Generate reference
    const reference = `TBG_${Date.now()}_${sender._id.toString().slice(-6)}`;

    // Create transactions
    const senderTransaction = new Transaction({
      userId: sender._id,
      type: 'tbg_transfer_out',
      amount: -amount,
      description: `Sent ${amount} TBG to ${recipient.name} (${phoneNumber})`,
      status: 'completed',
      reference,
      metadata: {
        recipientId: recipient._id,
        recipientPhone: phoneNumber,
        recipientName: recipient.name,
        note: note || ''
      }
    });

    const recipientTransaction = new Transaction({
      userId: recipient._id,
      type: 'tbg_transfer_in',
      amount: amount,
      description: `Received ${amount} TBG from ${sender.name}`,
      status: 'completed',
      reference,
      metadata: {
        senderId: sender._id,
        senderName: sender.name,
        note: note || ''
      }
    });

    // Update balances
    sender.tbgCoins -= amount;
    recipient.tbgCoins += amount;

    // Save all changes
    await Promise.all([
      sender.save(),
      recipient.save(),
      senderTransaction.save(),
      recipientTransaction.save()
    ]);

    // Send notifications
    await Promise.all([
      sendNotification(sender._id, {
        title: 'TBG Transfer Sent',
        body: `You sent ${amount} TBG to ${recipient.name}`,
        type: 'tbg_transfer',
        data: { transactionId: senderTransaction._id }
      }),
      sendNotification(recipient._id, {
        title: 'TBG Received',
        body: `You received ${amount} TBG from ${sender.name}`,
        type: 'tbg_transfer',
        data: { transactionId: recipientTransaction._id }
      })
    ]);

    res.json({
      success: true,
      message: 'TBG coins sent successfully',
      transaction: senderTransaction,
      recipient: {
        name: recipient.name,
        phoneNumber: recipient.phoneNumber
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

// Get TBG transfer history
exports.getTBGTransferHistory = async (req, res) => {
  try {
    const transfers = await Transaction.find({
      userId: req.user._id,
      type: { $in: ['tbg_transfer_in', 'tbg_transfer_out'] }
    })
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      transfers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Find user by phone number (for transfer validation)
exports.findUserByPhone = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const user = await User.findOne({ phoneNumber }).select('name phoneNumber profilePicture');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        name: user.name,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture
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

// Update wallet balance endpoint to include TBG coins
exports.getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('earnings points tbgCoins');
    
    res.json({
      success: true,
      wallet: {
        balance: user.earnings,
        points: user.points,
        tbgCoins: user.tbgCoins || 0
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