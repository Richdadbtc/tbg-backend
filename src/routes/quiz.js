const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin'); // Add this line

// Quiz routes (all protected)
router.use(auth);

// Get quiz questions
router.get('/questions', quizController.getQuestions);
router.get('/questions/:category', quizController.getQuestionsByCategory);
router.get('/daily-quiz', quizController.getDailyQuiz);

// Submit quiz results
router.post('/submit', quizController.submitQuiz);
router.post('/submit-daily', quizController.submitDailyQuiz);

// Quiz history and stats
router.get('/history', quizController.getQuizHistory);
router.get('/stats', quizController.getQuizStats);
router.get('/result/:resultId', quizController.getQuizResult);

// Admin routes (protected with admin middleware)
router.post('/questions', admin, quizController.createQuestion);
router.put('/questions/:id', admin, quizController.updateQuestion);
router.delete('/questions/:id', admin, quizController.deleteQuestion);

module.exports = router;