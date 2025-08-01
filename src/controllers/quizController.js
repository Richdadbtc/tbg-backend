const Question = require('../models/Question');
const QuizResult = require('../models/QuizResult');
const User = require('../models/User');

// Get random questions
exports.getQuestions = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const questions = await Question.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: parseInt(limit) } },
      {
        $project: {
          question: 1,
          options: 1,
          correctAnswerIndex: 1,
          category: 1,
          difficulty: 1,
          reward: 1,
          timeLimit: 1
        }
      }
    ]);

    res.json({
      success: true,
      questions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Submit quiz result
exports.submitQuizResult = async (req, res) => {
  try {
    const {
      questions,
      user_answers,
      correct_answers,
      total_earnings,
      total_points,
      start_time,
      end_time,
      total_time_seconds
    } = req.body;

    // Create quiz result
    const quizResult = new QuizResult({
      userId: req.user._id,
      questions: questions.map((q, index) => ({
        questionId: q.id,
        question: q.question,
        options: q.options,
        correctAnswerIndex: q.correct_answer_index,
        userAnswer: user_answers[index],
        isCorrect: user_answers[index] === q.correct_answer_index,
        reward: q.reward
      })),
      correctAnswers: correct_answers,
      totalQuestions: questions.length,
      totalEarnings: total_earnings,
      totalPoints: total_points,
      startTime: new Date(start_time),
      endTime: new Date(end_time),
      totalTimeSeconds: total_time_seconds
    });

    await quizResult.save();

    // Update user earnings and points
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        earnings: total_earnings,
        points: total_points
      }
    });

    res.json({
      success: true,
      message: 'Quiz result submitted successfully',
      result: quizResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get questions by category
exports.getQuestionsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;
    
    const questions = await Question.aggregate([
      { $match: { isActive: true, category: category } },
      { $sample: { size: parseInt(limit) } },
      {
        $project: {
          question: 1,
          options: 1,
          correctAnswerIndex: 1,
          category: 1,
          difficulty: 1,
          reward: 1,
          timeLimit: 1
        }
      }
    ]);

    res.json({
      success: true,
      questions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get daily quiz
exports.getDailyQuiz = async (req, res) => {
  try {
    // For now, return random questions
    const questions = await Question.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 5 } },
      {
        $project: {
          question: 1,
          options: 1,
          correctAnswerIndex: 1,
          category: 1,
          difficulty: 1,
          reward: 1,
          timeLimit: 1
        }
      }
    ]);

    res.json({
      success: true,
      questions,
      type: 'daily'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Alias for submitQuizResult
exports.submitQuiz = exports.submitQuizResult;

// Submit daily quiz (same as regular quiz for now)
exports.submitDailyQuiz = exports.submitQuizResult;

// Get quiz history
exports.getQuizHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const results = await QuizResult.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-questions'); // Exclude detailed questions for performance

    res.json({
      success: true,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get quiz stats
exports.getQuizStats = async (req, res) => {
  try {
    const stats = await QuizResult.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          totalEarnings: { $sum: '$totalEarnings' },
          totalPoints: { $sum: '$totalPoints' },
          averageScore: { $avg: { $divide: ['$correctAnswers', '$totalQuestions'] } }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalQuizzes: 0,
        totalEarnings: 0,
        totalPoints: 0,
        averageScore: 0
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

// Get specific quiz result
exports.getQuizResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    
    const result = await QuizResult.findOne({
      _id: resultId,
      userId: req.user._id
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Quiz result not found'
      });
    }

    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create question (Admin only)
exports.createQuestion = async (req, res) => {
  try {
    const question = new Question(req.body);
    await question.save();

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update question (Admin only)
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete question (Admin only)
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findByIdAndDelete(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};