const { v4: uuidv4 } = require('uuid');
const {
    ExamSession,
    ProctoringReport,
    ExamStatusEnum,
} = require('../models/proctor');
const { getElapsedSeconds } = require('../utils/time');

async function getMyStatus(req, res) {
    try {
        const { exam_id } = req.params;
        const currentUser = req.currentUser;

        const sessions = await ExamSession.find({
            student_id: currentUser.userId,
            exam_id,
        }).sort({ start_time: -1 });

        const session = sessions[0];
        if (!session) {
            return res.status(200).json({
                exam_id,
                has_session: false,
                session_id: null,
                status: null,
                start_time: null,
                can_attempt: true,
                message: null,
            });
        }

        const submittedSession = sessions.find(
            (s) => s.status === ExamStatusEnum.SUBMITTED || s.status === ExamStatusEnum.AUTO_SUBMITTED
        );

        const sessionStatus = submittedSession
            ? {
                has_session: true,
                session_id: submittedSession._id,
                status: submittedSession.status,
                start_time: submittedSession.start_time,
                can_attempt: false,
                message: 'You have already submitted this exam.',
            }
            : {
                has_session: true,
                session_id: session._id,
                status: session.status,
                start_time: session.start_time,
                can_attempt: true,
                message: 'You have an active session. You will be returned to your exam.',
            };

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
        return res.status(500).json({
            detail: `Failed to fetch exam status: ${err.message}`,
        });
    }
}

async function startExam(req, res) {
    try {
        const { exam_id } = req.body;
        const currentUser = req.currentUser;

        if (!exam_id) {
            return res.status(400).json({ detail: 'exam_id is required' });
        }

        const submittedSession = await ExamSession.findOne({
            student_id: currentUser.userId,
            exam_id,
            status: { $in: [ExamStatusEnum.SUBMITTED, ExamStatusEnum.AUTO_SUBMITTED] },
        });

        if (submittedSession) {
            return res.status(409).json({
                detail: 'Exam has already been submitted. You cannot attempt this exam again.',
            });
        }

        const existingSession = await ExamSession.findOne({
            student_id: currentUser.userId,
            exam_id,
            status: ExamStatusEnum.ACTIVE,
        });

        const session = existingSession || await new ExamSession({
            _id: uuidv4(),
            student_id: currentUser.userId,
            exam_id,
            status: ExamStatusEnum.ACTIVE,
            start_time: new Date(),
        }).save();

        return res.status(200).json({
            session_id: session._id,
            exam_id: session.exam_id,
            start_time: session.start_time,
            status: session.status,
        });
    } catch (err) {
        return res.status(500).json({
            detail: `Failed to start exam: ${err.message}`,
        });
    }
}

async function getExamStatus(req, res) {
    try {
        const { session_id } = req.query;
        const currentUser = req.currentUser;

        if (!session_id) {
            return res.status(400).json({ detail: 'session_id is required' });
        }

        const session = await ExamSession.findById(session_id);

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
        return res.status(500).json({
            detail: `Failed to get exam status: ${err.message}`,
        });
    }
}

async function getExamStudents(req, res) {
    try {
        const { exam_id } = req.params;

        const sessions = await ExamSession.find({ exam_id });
        const reports = await ProctoringReport.find({ exam_id });
        const reportMap = new Map(reports.map((r) => [r.session_id, r]));

        const students = sessions.map((session) => ({
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

        return res.status(200).json({
            exam_id,
            total_students: students.length,
            students,
        });
    } catch (err) {
        return res.status(500).json({
            detail: `Failed to fetch exam students: ${err.message}`,
        });
    }
}

async function getExamStudentsReports(req, res) {
    try {
        const { exam_id } = req.params;

        const sessions = await ExamSession.find({ exam_id });
        const reports = await ProctoringReport.find({ exam_id });
        const reportMap = new Map(reports.map((r) => [r.session_id, r]));

        const students = sessions.map((session) => {
            const report = reportMap.get(session._id);

            let proctoringReport = null;
            if (report) {
                const violations = (report.violations || []).map((v) => ({
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

        return res.status(200).json({
            exam_id,
            total_students: students.length,
            students,
        });
    } catch (err) {
        return res.status(500).json({
            detail: `Failed to fetch exam students with reports: ${err.message}`,
        });
    }
}

async function getSessionReport(req, res) {
    try {
        const { session_id } = req.params;

        const report = await ProctoringReport.findOne({ session_id });

        if (!report) {
            return res.status(404).json({
                detail: `Report not found for session ${session_id}`,
            });
        }

        const violations = (report.violations || []).map((v) => ({
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
        return res.status(500).json({
            detail: `Failed to fetch proctoring report: ${err.message}`,
        });
    }
}

module.exports = {
    getMyStatus,
    startExam,
    getExamStatus,
    getExamStudents,
    getExamStudentsReports,
    getSessionReport,
};
