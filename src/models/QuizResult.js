const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    question: String,
    options: [String],
    correctAnswerIndex: Number,
    userAnswer: Number,
    isCorrect: Boolean,
    reward: Number
  }],
  correctAnswers: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  totalTimeSeconds: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuizResult', quizResultSchema);