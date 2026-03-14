const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
    getMyStatus,
    startExam,
    getExamStatus,
    getExamStudents,
    getExamStudentsReports,
    getSessionReport,
} = require('../controllers/examController');

router.get('/:exam_id/my-status', authMiddleware, getMyStatus);
router.post('/start', authMiddleware, startExam);
router.get('/status', authMiddleware, getExamStatus);
router.get('/:exam_id/students', authMiddleware, getExamStudents);
router.get('/:exam_id/students/reports', authMiddleware, getExamStudentsReports);
router.get('/report/:session_id', authMiddleware, getSessionReport);

module.exports = router;
