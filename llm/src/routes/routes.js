 const express = require('express');
 const {generateQuestions , generateSeatingArrangement} = require('../controller/controller');

const router = express.Router();
router.post("/generate-questions", generateQuestions);
router.post("/generate-seating-arrangement" , generateSeatingArrangement)

module.exports =  {router};
