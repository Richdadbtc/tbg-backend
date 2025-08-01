const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['earning', 'withdrawal', 'referral_bonus', 'quiz_reward'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  metadata: {
    quizResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizResult'
    },
    withdrawalMethod: String,
    accountDetails: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for user transaction history
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);