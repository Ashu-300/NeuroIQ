 const express = require('express');
 const {generateTheoryQuestions , generateMCQQuestions , generateSeatingArrangement} = require('../controller/controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
router.post("/generate/theory/questions", authMiddleware, generateTheoryQuestions);
router.post("/generate/mcq/questions", authMiddleware, generateMCQQuestions);
router.post("/generate-seating-arrangement" , authMiddleware , generateSeatingArrangement)

module.exports =  {router};
