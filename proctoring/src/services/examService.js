/**
 * Exam management service
 */
const { v4: uuidv4 } = require('uuid');
const { ExamSession, ExamReport, Violation, ExamStatusEnum } = require('../models/exam');
const logger = require('../config/logger');

/**
 * Create a new exam session or return existing session
 */
async function createExamSession(studentId, examId) {
    // Check for submitted session first - student cannot re-attempt
    const submittedSession = await ExamSession.findOne({
        student_id: studentId,
        exam_id: examId,
        status: { $in: [ExamStatusEnum.SUBMITTED, ExamStatusEnum.AUTO_SUBMITTED] },
    });

    if (submittedSession) {
        logger.info(`Student ${studentId} already submitted exam ${examId}, session: ${submittedSession._id}`);
        return {
            session: null,
            error: 'Exam has already been submitted. You cannot attempt this exam again.',
        };
    }

    // Check for existing active session - return it
    const existingSession = await ExamSession.findOne({
        student_id: studentId,
        exam_id: examId,
        status: ExamStatusEnum.ACTIVE,
    });

    if (existingSession) {
        logger.info(`Returning existing active session ${existingSession._id} for student ${studentId} exam ${examId}`);
        return { session: existingSession, error: null };
    }

    // No session found, create a new one
    const sessionId = uuidv4();
    const session = new ExamSession({
        _id: sessionId,
        student_id: studentId,
        exam_id: examId,
        status: ExamStatusEnum.ACTIVE,
        start_time: new Date(),
    });

    await session.save();
    logger.info(`Exam session created: ${sessionId}`);

    return { session, error: null };
}

/**
 * Get an exam session by ID
 */
async function getExamSession(sessionId) {
    return await ExamSession.findById(sessionId);
}

/**
 * Get all exam sessions for a specific exam
 */
async function getSessionsByExamId(examId) {
    return await ExamSession.find({ exam_id: examId });
}

/**
 * Get student's status for a specific exam
 */
async function getStudentExamStatus(studentId, examId) {
    const session = await ExamSession.findOne({
        student_id: studentId,
        exam_id: examId,
    });

    if (!session) {
        return {
            has_session: false,
            can_attempt: true,
            message: null,
        };
    }

    if (session.status === ExamStatusEnum.SUBMITTED || session.status === ExamStatusEnum.AUTO_SUBMITTED) {
        return {
            has_session: true,
            session_id: session._id,
            status: session.status,
            start_time: session.start_time,
            can_attempt: false,
            message: 'You have already submitted this exam.',
        };
    }

    return {
        has_session: true,
        session_id: session._id,
        status: session.status,
        start_time: session.start_time,
        can_attempt: true,
        message: 'You have an active session. You will be returned to your exam.',
    };
}

/**
 * Submit an exam session
 */
async function submitExam(sessionId) {
    const session = await ExamSession.findByIdAndUpdate(
        sessionId,
        {
            status: ExamStatusEnum.SUBMITTED,
            end_time: new Date(),
        },
        { new: true }
    );

    logger.info(`Exam submitted: ${sessionId}`);

    // Save proctoring report
    await saveProctoringReport(session);

    return session;
}

/**
 * Auto-submit an exam due to violations
 */
async function autoSubmitExam(sessionId, reason = 'violation_threshold') {
    const session = await ExamSession.findByIdAndUpdate(
        sessionId,
        {
            status: ExamStatusEnum.AUTO_SUBMITTED,
            end_time: new Date(),
        },
        { new: true }
    );

    logger.warning(`Exam auto-submitted: ${sessionId}`, { reason });

    // Save proctoring report
    await saveProctoringReport(session);

    return session;
}

/**
 * Save proctoring report for a session
 */
async function saveProctoringReport(session) {
    if (!session) return null;

    // Get all violations for the session
    const violations = await Violation.find({ session_id: session._id });

    const violationData = violations.map(v => ({
        violation_id: v._id,
        violation_type: v.violation_type,
        severity: v.severity,
        timestamp: v.timestamp ? v.timestamp.toISOString() : null,
        duration_seconds: v.duration_seconds,
    }));

    const durationSeconds = session.end_time
        ? Math.floor((new Date(session.end_time) - new Date(session.start_time)) / 1000)
        : 0;

    const reportId = uuidv4();
    const report = new ExamReport({
        _id: reportId,
        session_id: session._id,
        student_id: session.student_id,
        exam_id: session.exam_id,
        start_time: session.start_time,
        end_time: session.end_time || new Date(),
        duration_seconds: durationSeconds,
        status: session.status,
        total_warnings: session.warnings,
        violations: violationData,
        identity_verified: session.identity_verified,
    });

    await report.save();
    logger.info(`Proctoring report saved for session: ${session._id}`);

    return report;
}

/**
 * Get the proctoring report for a session
 */
async function getProctoringReport(sessionId) {
    return await ExamReport.findOne({ session_id: sessionId });
}

/**
 * Get all proctoring reports for an exam
 */
async function getExamReports(examId) {
    return await ExamReport.find({ exam_id: examId });
}

/**
 * Verify identity for a session
 */
async function verifyIdentity(sessionId, snapshotBase64) {
    const result = await ExamSession.updateOne(
        { _id: sessionId },
        {
            identity_verified: true,
            identity_snapshot_base64: snapshotBase64,
        }
    );
    return result.modifiedCount > 0;
}

/**
 * Increment warnings for a session
 */
async function incrementWarnings(sessionId) {
    const session = await ExamSession.findByIdAndUpdate(
        sessionId,
        { $inc: { warnings: 1 } },
        { new: true }
    );
    return session ? session.warnings : 0;
}

module.exports = {
    createExamSession,
    getExamSession,
    getSessionsByExamId,
    getStudentExamStatus,
    submitExam,
    autoSubmitExam,
    saveProctoringReport,
    getProctoringReport,
    getExamReports,
    verifyIdentity,
    incrementWarnings,
};
