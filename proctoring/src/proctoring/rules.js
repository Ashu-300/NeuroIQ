/**
 * Violation rules engine for proctoring policy enforcement
 */
const settings = require('../config/config');
const logger = require('../config/logger');
const { ViolationTypeEnum, ViolationSeverityEnum } = require('../models/exam');

// Violation policies
const VIOLATION_POLICIES = {
    [ViolationTypeEnum.NO_FACE]: {
        maxDurationSeconds: settings.MAX_NO_FACE_SECONDS,
        severity: ViolationSeverityEnum.HIGH,
        autoSubmitOnCritical: true,
    },
    [ViolationTypeEnum.MULTIPLE_FACES]: {
        maxDurationSeconds: null, // Instant violation
        severity: ViolationSeverityEnum.CRITICAL,
        autoSubmitOnCritical: true,
    },
    [ViolationTypeEnum.LOOKING_AWAY]: {
        maxDurationSeconds: settings.MAX_LOOKING_AWAY_SECONDS,
        severity: ViolationSeverityEnum.MEDIUM,
        autoSubmitOnCritical: false,
    },
    [ViolationTypeEnum.HEAD_TURN]: {
        maxDurationSeconds: 3.0, // 3 seconds tolerance
        severity: ViolationSeverityEnum.MEDIUM,
        autoSubmitOnCritical: false,
    },
};

/**
 * Create a new rules engine instance
 */
function createRulesEngine() {
    return {
        ongoingViolations: new Map(),
        violationCount: 0,
        warningCount: 0,
    };
}

/**
 * Check if a violation should be triggered based on condition and duration
 */
function checkViolation(engine, violationType, condition, currentTime = null) {
    if (currentTime === null) {
        currentTime = new Date();
    }

    const policy = VIOLATION_POLICIES[violationType];

    if (!condition) {
        // Condition no longer present, clear from tracking
        if (engine.ongoingViolations.has(violationType)) {
            engine.ongoingViolations.delete(violationType);
        }
        return null;
    }

    // Condition is present
    if (!engine.ongoingViolations.has(violationType)) {
        // First time we're seeing this violation
        engine.ongoingViolations.set(violationType, currentTime);
        logger.info(`Started tracking violation: ${violationType}, threshold: ${policy.maxDurationSeconds}s`);

        // If instant violation (no maxDuration), trigger immediately
        if (policy.maxDurationSeconds === null) {
            return createViolation(engine, violationType, policy, 0);
        }

        return null;
    }

    // We've been tracking this violation
    const startTime = engine.ongoingViolations.get(violationType);
    const duration = (currentTime.getTime() - startTime.getTime()) / 1000;
    logger.info(`Violation ${violationType}: duration=${duration.toFixed(1)}s / threshold=${policy.maxDurationSeconds}s`);

    if (duration >= policy.maxDurationSeconds) {
        // Duration threshold exceeded, trigger violation
        engine.ongoingViolations.delete(violationType);
        logger.warning(`VIOLATION TRIGGERED: ${violationType} after ${duration.toFixed(1)}s`);
        return createViolation(engine, violationType, policy, duration);
    }

    return null;
}

/**
 * Create violation record
 */
function createViolation(engine, violationType, policy, durationSeconds) {
    engine.violationCount++;

    if (policy.severity !== ViolationSeverityEnum.CRITICAL) {
        engine.warningCount++;
    }

    const violation = {
        violation_type: violationType,
        severity: policy.severity,
        duration_seconds: durationSeconds,
        timestamp: new Date(),
    };

    logger.info(`Violation triggered: ${violationType}`, {
        severity: policy.severity,
        duration: durationSeconds,
    });

    return violation;
}

/**
 * Check if exam should be auto-submitted based on violations
 */
function shouldAutoSubmit(engine) {
    if (engine.warningCount >= settings.MAX_WARNINGS) {
        logger.warning(`Auto-submit triggered: ${engine.warningCount} warnings exceed threshold`);
        return true;
    }
    return false;
}

/**
 * Get current violation summary
 */
function getViolationSummary(engine) {
    return {
        total_violations: engine.violationCount,
        warnings: engine.warningCount,
        ongoing_violations: Array.from(engine.ongoingViolations.keys()),
    };
}

/**
 * Reset violation tracking
 */
function resetEngine(engine) {
    engine.ongoingViolations.clear();
    engine.violationCount = 0;
    engine.warningCount = 0;
}

module.exports = {
    VIOLATION_POLICIES,
    createRulesEngine,
    checkViolation,
    shouldAutoSubmit,
    getViolationSummary,
    resetEngine,
};
