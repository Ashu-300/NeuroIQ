const { v4: uuidv4 } = require('uuid');
const {
    ExamSession,
    Violation,
    ProctoringReport,
    ExamStatusEnum,
} = require('../models/proctor');

const { getSessionStats, finalizeProctoring } = require('./proctoringController');

async function saveProctoringReport(session, stats) {
    const violations = await Violation.find({ session_id: session._id });
    const violationData = violations.map((v) => ({
        violation_id: v._id,
        violation_type: v.violation_type,
        severity: v.severity,
        timestamp: v.timestamp ? v.timestamp.toISOString() : null,
        duration_seconds: v.duration_seconds,
    }));

    const durationSeconds = session.end_time
        ? Math.floor((new Date(session.end_time) - new Date(session.start_time)) / 1000)
        : 0;

    const payload = {
    student_id: session.student_id,
    exam_id: session.exam_id,
    start_time: session.start_time,
    end_time: session.end_time || new Date(),
    duration_seconds: durationSeconds,
    status: session.status,
    total_warnings: session.warnings,
    violations: violationData,
    identity_verified: session.identity_verified,

    average_cheating_probability: stats.avg_probability,
    max_cheating_probability: stats.max_probability
};

    const existing = await ProctoringReport.findOne({ session_id: session._id });
    if (existing) {
        return await ProctoringReport.findOneAndUpdate(
            { session_id: session._id },
            { $set: payload },
            { new: true }
        );
    }

    return await new ProctoringReport({
        _id: uuidv4(),
        session_id: session._id,
        ...payload,
    }).save();
}

async function submitExam(req, res) {
    try {
        const { session_id } = req.body;
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
                detail: 'Not authorized to submit this exam',
            });
        }

        let updatedSession = session;
        if (session.status !== ExamStatusEnum.SUBMITTED && session.status !== ExamStatusEnum.AUTO_SUBMITTED) {
            updatedSession = await ExamSession.findByIdAndUpdate(
                session_id,
                {
                    status: ExamStatusEnum.SUBMITTED,
                    end_time: new Date(),
                },
                { new: true }
            );
        }

        const stats = getSessionStats(session_id);

        await saveProctoringReport(updatedSession, stats);

        await finalizeProctoring(session_id);

        return res.status(200).json({
            session_id: updatedSession._id,
            status: updatedSession.status,
            submitted_at: updatedSession.end_time,
            total_warnings: updatedSession.warnings,
            violations_count: updatedSession.violation_count,
        });
    } catch (err) {
        return res.status(500).json({
            detail: `Failed to submit exam: ${err.message}`,
        });
    }
}

async function getSubmissionReport(req, res) {
    try {
        const { session_id } = req.params;
        const currentUser = req.currentUser;

        const session = await ExamSession.findById(session_id);
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

        const violations = await Violation.find({ session_id });
        const violationDtos = violations.map((v) => ({
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
        return res.status(500).json({
            detail: `Failed to get exam report: ${err.message}`,
        });
    }
}

module.exports = {
    submitExam,
    getSubmissionReport,
};
