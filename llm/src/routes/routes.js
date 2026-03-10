 const express = require('express');
 const {generateTheoryQuestions , generateMCQQuestions , generateSeatingArrangement} = require('../controller/controller');
 const { evaluateTheoryAnswer, evaluateTheoryBatch } = require('../controller/evaluationController');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Question generation routes (protected)
router.post("/generate/theory/questions", authMiddleware, generateTheoryQuestions);
router.post("/generate/mcq/questions", authMiddleware, generateMCQQuestions);
router.post("/generate-seating-arrangement" , authMiddleware , generateSeatingArrangement);

// Answer evaluation routes (can be called from Answer service)
router.post("/evaluate", evaluateTheoryAnswer);
router.post("/evaluate/batch", evaluateTheoryBatch);

module.exports =  {router};
