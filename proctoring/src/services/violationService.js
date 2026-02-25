/**
 * Violation tracking and reporting service
 */
const { Violation, ViolationSeverityEnum } = require('../models/exam');

/**
 * Get all violations for a session
 */
async function getSessionViolations(sessionId) {
    return await Violation.find({ session_id: sessionId });
}

/**
 * Count critical violations in a session
 */
async function countCriticalViolations(sessionId) {
    return await Violation.countDocuments({
        session_id: sessionId,
        severity: ViolationSeverityEnum.CRITICAL,
    });
}

module.exports = {
    getSessionViolations,
    countCriticalViolations,
};
