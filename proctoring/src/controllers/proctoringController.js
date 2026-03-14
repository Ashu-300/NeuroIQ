const { v4: uuidv4 } = require('uuid');
const {
    ExamSession,
    Violation,
    ProctoringReport,
    ViolationSeverityEnum,
    ViolationTypeEnum
} = require('../models/proctor');


// In-memory session tracker
const activeSessions = new Map();


function getSessionStats(session_id) {

    const tracker = activeSessions.get(session_id);

    if (!tracker) {
        return {
            avg_probability: 0,
            max_probability: 0
        };
    }

    const avg =
        tracker.count === 0
            ? 0
            : tracker.sum_probability / tracker.count;

    return {
        avg_probability: avg,
        max_probability: tracker.max_probability
    };
}


function getSeverity(prob) {
    if (prob >= 0.9) return ViolationSeverityEnum.CRITICAL;
    if (prob >= 0.8) return ViolationSeverityEnum.HIGH;
    if (prob >= 0.7) return ViolationSeverityEnum.MEDIUM;
    return ViolationSeverityEnum.LOW;
}


/**
 * Receive streaming proctoring data
 */
async function receiveProctoringData(payload) {
    try {

        const { session_id, student_id, exam_id, cheating_probability } = payload;

        if (!session_id) {
            return { status: "error", message: "session_id missing" };
        }

        let tracker = activeSessions.get(session_id);

        if (!tracker) {
            tracker = {
                session_id,
                student_id,
                exam_id,
                sum_probability: 0,
                count: 0,
                max_probability: 0,
                violations: [],
                start_time: new Date(),
            };

            activeSessions.set(session_id, tracker);
        }

        tracker.sum_probability += cheating_probability;
        tracker.count += 1;

        if (cheating_probability > tracker.max_probability) {
            tracker.max_probability = cheating_probability;
        }

        // store violation if threshold exceeded
        const threshold = 0.7;

        if (cheating_probability >= threshold) {

            const severity = getSeverity(cheating_probability);

            const violation = await new Violation({
                _id: uuidv4(),
                session_id,
                student_id,
                violation_type: ViolationTypeEnum.CHEATING_PROBABILITY,
                severity,
                cheating_probability,
                threshold,
                metadata: payload.metadata || {},
            }).save();

            tracker.violations.push(violation._id);

            await ExamSession.updateOne(
                { _id: session_id },
                {
                    $inc: {
                        violation_count: 1,
                        warnings: 1
                    }
                }
            );
        }

        return {
            status: "ok",
            session_id,
            probability: cheating_probability
        };

    } catch (err) {
        console.error("Proctoring error:", err);
        return { status: "error", message: err.message };
    }
}


/**
 * Called when socket disconnects or exam ends
 */
async function finalizeProctoring(session_id) {

    try {

        if (activeSessions.has(session_id)) {
            activeSessions.delete(session_id);
        }

        console.log(`Proctoring session finalized: ${session_id}`);

    } catch (err) {
        console.error("Finalize proctoring error:", err);
    }
}

async function getProctoringReport(req,res) {
    var {exam_id , student_id} = req.query;
    try {
        const report = await ProctoringReport.findOne({ exam_id, student_id });
        if (!report) {
            return res.status(404).json({ status: "error", message: "Report not found" });
        }
        res.json({ status: "ok", report });
    } catch (err) {
        console.error("Get report error:", err);
        res.status(500).json({ status: "error", message: err.message });
    }
}


module.exports = {
    receiveProctoringData,
    finalizeProctoring,
    getProctoringReport,
    getSessionStats
};