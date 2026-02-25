/**
 * Routes for exam lifecycle operations
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const examService = require('../services/examService');
const { getElapsedSeconds } = require('../utils/time');
const logger = require('../config/logger');

/**
 * GET /:exam_id/my-status
 * Check student's own status for a specific exam
 */
router.get('/:exam_id/my-status', authMiddleware, async (req, res) => {
    try {
        const { exam_id } = req.params;
        const currentUser = req.currentUser;

        const sessionStatus = await examService.getStudentExamStatus(currentUser.userId, exam_id);

        return res.status(200).json({
            exam_id,
            has_session: sessionStatus.has_session,
            session_id: sessionStatus.session_id || null,
            status: sessionStatus.status || null,
            start_time: sessionStatus.start_time || null,
            can_attempt: sessionStatus.can_attempt,
            message: sessionStatus.message || null,
        });
    } catch (err) {
        logger.error(`Error fetching student exam status: ${err.message}`, {
            exam_id: req.params.exam_id,
            user_id: req.currentUser?.userId,
        });
        return res.status(500).json({
            detail: `Failed to fetch exam status: ${err.message}`,
        });
    }
});

/**
 * POST /start
 * Start a new exam session
 */
router.post('/start', authMiddleware, async (req, res) => {
    try {
        const { exam_id } = req.body;
        const currentUser = req.currentUser;

        if (!exam_id) {
            return res.status(400).json({ detail: 'exam_id is required' });
        }

        const { session, error } = await examService.createExamSession(currentUser.userId, exam_id);

        if (error) {
            return res.status(409).json({ detail: error });
        }

        logger.info(`Exam started for student ${currentUser.userId}`, {
            exam_id,
            session_id: session._id,
        });

        return res.status(200).json({
            session_id: session._id,
            exam_id: session.exam_id,
            start_time: session.start_time,
            status: session.status,
        });
    } catch (err) {
        logger.error(`Error starting exam: ${err.message}`, {
            user_id: req.currentUser?.userId,
        });
        return res.status(500).json({
            detail: `Failed to start exam: ${err.message}`,
        });
    }
});

/**
 * GET /status
 * Get current exam session status
 */
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const { session_id } = req.query;
        const currentUser = req.currentUser;

        if (!session_id) {
            return res.status(400).json({ detail: 'session_id is required' });
        }

        const session = await examService.getExamSession(session_id);

        if (!session) {
            return res.status(404).json({
                detail: `Session ${session_id} not found`,
            });
        }

        if (session.student_id !== currentUser.userId) {
            return res.status(403).json({
                detail: 'Not authorized to access this session',
            });
        }

        const elapsed = getElapsedSeconds(session.start_time);

        return res.status(200).json({
            session_id: session._id,
            status: session.status,
            start_time: session.start_time,
            elapsed_seconds: elapsed,
            warnings: session.warnings,
        });
    } catch (err) {
        logger.error(`Error getting exam status: ${err.message}`);
        return res.status(500).json({
            detail: `Failed to get exam status: ${err.message}`,
        });
    }
});

/**
 * GET /:exam_id/students
 * Get list of students who attempted a specific exam
 */
router.get('/:exam_id/students', authMiddleware, async (req, res) => {
    try {
        const { exam_id } = req.params;
        const currentUser = req.currentUser;

        const sessions = await examService.getSessionsByExamId(exam_id);
        const reports = await examService.getExamReports(exam_id);
        const reportMap = new Map(reports.map(r => [r.session_id, r]));

        const students = sessions.map(session => ({
            session_id: session._id,
            student_id: session.student_id,
            status: session.status,
            start_time: session.start_time,
            end_time: session.end_time,
            identity_verified: session.identity_verified,
            warnings: session.warnings,
            violation_count: session.violation_count,
            has_report: reportMap.has(session._id),
        }));

        logger.info(`Fetched ${students.length} student attempts for exam ${exam_id}`, {
            exam_id,
            user_id: currentUser.userId,
        });

        return res.status(200).json({
            exam_id,
            total_students: students.length,
            students,
        });
    } catch (err) {
        logger.error(`Error fetching exam students: ${err.message}`, {
            exam_id: req.params.exam_id,
        });
        return res.status(500).json({
            detail: `Failed to fetch exam students: ${err.message}`,
        });
    }
});

/**
 * GET /:exam_id/students/reports
 * Get list of students with full proctoring reports for an exam
 */
router.get('/:exam_id/students/reports', authMiddleware, async (req, res) => {
    try {
        const { exam_id } = req.params;
        const currentUser = req.currentUser;

        const sessions = await examService.getSessionsByExamId(exam_id);
        const reports = await examService.getExamReports(exam_id);
        const reportMap = new Map(reports.map(r => [r.session_id, r]));

        const students = sessions.map(session => {
            const report = reportMap.get(session._id);

            let proctoringReport = null;
            if (report) {
                const violations = (report.violations || []).map(v => ({
                    violation_type: v.violation_type || 'unknown',
                    severity: v.severity || 'unknown',
                    timestamp: v.timestamp,
                    duration_seconds: v.duration_seconds,
                }));

                proctoringReport = {
                    session_id: report.session_id,
                    student_id: report.student_id,
                    exam_id: report.exam_id,
                    start_time: report.start_time,
                    end_time: report.end_time,
                    duration_seconds: report.duration_seconds,
                    status: report.status,
                    total_warnings: report.total_warnings,
                    violations,
                    identity_verified: report.identity_verified,
                    created_at: report.created_at,
                };
            }

            return {
                session_id: session._id,
                student_id: session.student_id,
                status: session.status,
                start_time: session.start_time,
                end_time: session.end_time,
                identity_verified: session.identity_verified,
                warnings: session.warnings,
                violation_count: session.violation_count,
                proctoring_report: proctoringReport,
            };
        });

        logger.info(`Fetched ${students.length} student attempts with reports for exam ${exam_id}`, {
            exam_id,
            user_id: currentUser.userId,
        });

        return res.status(200).json({
            exam_id,
            total_students: students.length,
            students,
        });
    } catch (err) {
        logger.error(`Error fetching exam students with reports: ${err.message}`, {
            exam_id: req.params.exam_id,
        });
        return res.status(500).json({
            detail: `Failed to fetch exam students with reports: ${err.message}`,
        });
    }
});

/**
 * GET /report/:session_id
 * Get proctoring report for a specific session
 */
router.get('/report/:session_id', authMiddleware, async (req, res) => {
    try {
        const { session_id } = req.params;

        const report = await examService.getProctoringReport(session_id);

        if (!report) {
            return res.status(404).json({
                detail: `Report not found for session ${session_id}`,
            });
        }

        const violations = (report.violations || []).map(v => ({
            violation_type: v.violation_type || 'unknown',
            severity: v.severity || 'unknown',
            timestamp: v.timestamp,
            duration_seconds: v.duration_seconds,
        }));

        return res.status(200).json({
            session_id: report.session_id,
            student_id: report.student_id,
            exam_id: report.exam_id,
            start_time: report.start_time,
            end_time: report.end_time,
            duration_seconds: report.duration_seconds,
            status: report.status,
            total_warnings: report.total_warnings,
            violations,
            identity_verified: report.identity_verified,
            created_at: report.created_at,
        });
    } catch (err) {
        logger.error(`Error fetching proctoring report: ${err.message}`, {
            session_id: req.params.session_id,
        });
        return res.status(500).json({
            detail: `Failed to fetch proctoring report: ${err.message}`,
        });
    }
});

module.exports = router;
