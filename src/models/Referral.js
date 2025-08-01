const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bonusAmount: {
    type: Number,
    default: 5.0
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'completed'
  },
  bonusPaid: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure unique referral relationships
referralSchema.index({ referrerId: 1, referredUserId: 1 }, { unique: true });

module.exports = mongoose.model('Referral', referralSchema);