const mongoose = require('mongoose');
const Question = require('../models/Question');
require('dotenv').config();

const sampleQuestions = [
  {
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswerIndex: 2,
    category: "general",
    difficulty: "easy",
    reward: 1.0,
    timeLimit: 15,
    createdBy: new mongoose.Types.ObjectId() // Use admin user ID
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswerIndex: 1,
    category: "science",
    difficulty: "easy",
    reward: 1.0,
    timeLimit: 15,
    createdBy: new mongoose.Types.ObjectId()
  },
  // Add more questions...
];

const seedQuestions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    await Question.deleteMany({});
    await Question.insertMany(sampleQuestions);
    
    console.log('Questions seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedQuestions();