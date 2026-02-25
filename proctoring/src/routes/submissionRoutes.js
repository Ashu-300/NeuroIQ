/**
 * Routes for exam submission and reporting
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const examService = require('../services/examService');
const violationService = require('../services/violationService');
const logger = require('../config/logger');

/**
 * POST /submit
 * Submit completed exam
 */
router.post('/submit', authMiddleware, async (req, res) => {
    try {
        const { session_id } = req.body;
        const currentUser = req.currentUser;

        if (!session_id) {
            return res.status(400).json({ detail: 'session_id is required' });
        }

        // Verify session exists and belongs to user
        const session = await examService.getExamSession(session_id);

        if (!session) {
            return res.status(404).json({
                detail: `Session ${session_id} not found`,
            });
        }

        if (session.student_id !== currentUser.userId) {
            return res.status(403).json({
                detail: 'Not authorized to submit this exam',
            });
        }

        // Submit exam
        const updatedSession = await examService.submitExam(session_id);

        logger.info(`Exam submitted: ${session_id}`, {
            user_id: currentUser.userId,
        });

        return res.status(200).json({
            session_id: updatedSession._id,
            status: updatedSession.status,
            submitted_at: updatedSession.end_time,
            total_warnings: updatedSession.warnings,
            violations_count: updatedSession.violation_count,
        });
    } catch (err) {
        logger.error(`Error submitting exam: ${err.message}`);
        return res.status(500).json({
            detail: `Failed to submit exam: ${err.message}`,
        });
    }
});

/**
 * GET /report/:session_id
 * Get exam submission report with violations
 */
router.get('/report/:session_id', authMiddleware, async (req, res) => {
    try {
        const { session_id } = req.params;
        const currentUser = req.currentUser;

        // Verify session ownership
        const session = await examService.getExamSession(session_id);

        if (!session) {
            return res.status(404).json({
                detail: `Session ${session_id} not found`,
            });
        }

        if (session.student_id !== currentUser.userId) {
            return res.status(403).json({
                detail: 'Not authorized to access this report',
            });
        }

        // Get violations
        const violations = await violationService.getSessionViolations(session_id);

        // Convert violations to DTOs
        const violationDtos = violations.map(v => ({
            violation_id: v._id,
            session_id: v.session_id,
            violation_type: v.violation_type,
            severity: v.severity,
            timestamp: v.timestamp,
            description: `${v.violation_type} - ${v.severity}`,
        }));

        const durationSeconds = session.end_time
            ? Math.floor((new Date(session.end_time) - new Date(session.start_time)) / 1000)
            : 0;

        logger.info(`Exam report retrieved: ${session_id}`, {
            user_id: currentUser.userId,
        });

        return res.status(200).json({
            session_id: session._id,
            student_id: session.student_id,
            exam_id: session.exam_id,
            start_time: session.start_time,
            end_time: session.end_time,
            duration_seconds: durationSeconds,
            status: session.status,
            total_warnings: session.warnings,
            violations: violationDtos,
            identity_verified: session.identity_verified,
        });
    } catch (err) {
        logger.error(`Error getting exam report: ${err.message}`);
        return res.status(500).json({
            detail: `Failed to get exam report: ${err.message}`,
        });
    }
});

module.exports = router;
