const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  options: [{
    type: String,
    required: true
  }],
  correctAnswerIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  category: {
    type: String,
    required: true,
    enum: ['general', 'science', 'history', 'sports', 'entertainment']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  reward: {
    type: Number,
    default: 10
  },
  timeLimit: {
    type: Number,
    default: 30 // seconds
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);