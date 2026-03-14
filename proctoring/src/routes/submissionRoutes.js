const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { submitExam, getSubmissionReport } = require('../controllers/submissionController');

router.post('/submit', authMiddleware, submitExam);
router.get('/report/:session_id', authMiddleware, getSubmissionReport);

module.exports = router;
