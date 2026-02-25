/**
 * Proctoring service for violation detection and handling
 */
const { v4: uuidv4 } = require('uuid');
const { ExamSession, Violation, ViolationTypeEnum } = require('../models/exam');
const { detectFaces } = require('../proctoring/faceDetection');
const { detectEyesLookingAway } = require('../proctoring/eyeTracking');
const { estimateHeadPose } = require('../proctoring/headPose');
const { createRulesEngine, checkViolation, shouldAutoSubmit } = require('../proctoring/rules');
const { base64ToImage } = require('../utils/image');
const examService = require('./examService');
const logger = require('../config/logger');

// Store rules engines per session
const sessionEngines = new Map();

/**
 * Get or create rules engine for a session
 */
function getEngine(sessionId) {
    if (!sessionEngines.has(sessionId)) {
        sessionEngines.set(sessionId, createRulesEngine());
        logger.info(`Created new rules engine for session: ${sessionId}`);
    }
    return sessionEngines.get(sessionId);
}

/**
 * Remove rules engine for a session
 */
function removeEngine(sessionId) {
    if (sessionEngines.has(sessionId)) {
        sessionEngines.delete(sessionId);
        logger.info(`Removed rules engine for session: ${sessionId}`);
    }
}

/**
 * Verify student identity at exam start
 */
async function verifyInitialIdentity(sessionId, frameBase64) {
    const image = base64ToImage(frameBase64);
    if (image === null) {
        return { verified: false, error: 'Failed to decode frame' };
    }

    const { faces, faceCount } = detectFaces(image);

    if (faceCount === 0) {
        return { verified: false, error: 'No face detected' };
    }

    if (faceCount > 1) {
        return { verified: false, error: 'Multiple faces detected' };
    }

    // Store identity snapshot
    await examService.verifyIdentity(sessionId, frameBase64);

    logger.info(`Identity verified for session ${sessionId}`, { face_count: faceCount });

    return { verified: true, error: null };
}

/**
 * Process a frame from the webcam and check for violations
 */
async function processProctoringFrame(sessionId, frameBase64) {
    const image = base64ToImage(frameBase64);
    if (image === null) {
        logger.warning(`Failed to decode frame for session ${sessionId}`);
        return { shouldAutoSubmit: false, violationMessage: null };
    }

    const engine = getEngine(sessionId);
    const currentTime = new Date();
    const violationsDetected = [];
    let gazeData = null;
    let poseData = null;

    // Face detection check
    const { faces, faceCount } = detectFaces(image);
    logger.info(`Session ${sessionId}: Face count = ${faceCount}`);

    if (faceCount === 0) {
        logger.info(`Session ${sessionId}: No face detected, checking violation rules...`);
        const violation = checkViolation(engine, ViolationTypeEnum.NO_FACE, true, currentTime);
        if (violation) {
            logger.warning(`Session ${sessionId}: NO_FACE violation triggered!`);
            violationsDetected.push(violation);
        }
    } else if (faceCount > 1) {
        const violation = checkViolation(engine, ViolationTypeEnum.MULTIPLE_FACES, true, currentTime);
        if (violation) {
            violationsDetected.push(violation);
        }
    } else {
        // Single face detected, clear no-face violations
        checkViolation(engine, ViolationTypeEnum.NO_FACE, false, currentTime);
        checkViolation(engine, ViolationTypeEnum.MULTIPLE_FACES, false, currentTime);

        // Check eye tracking
        const eyeResult = detectEyesLookingAway(image);
        gazeData = eyeResult.gazeData;
        const violation1 = checkViolation(engine, ViolationTypeEnum.LOOKING_AWAY, eyeResult.lookingAway, currentTime);
        if (violation1) {
            violationsDetected.push(violation1);
        }

        // Check head pose
        const poseResult = estimateHeadPose(image);
        poseData = poseResult.poseData;
        const violation2 = checkViolation(engine, ViolationTypeEnum.HEAD_TURN, poseResult.headTurned, currentTime);
        if (violation2) {
            violationsDetected.push(violation2);
        }
    }

    // Persist violations
    const session = await ExamSession.findById(sessionId);
    const violationMessages = [];

    if (session) {
        for (const violationData of violationsDetected) {
            const violationId = uuidv4();
            const violation = new Violation({
                _id: violationId,
                session_id: sessionId,
                student_id: session.student_id,
                violation_type: violationData.violation_type,
                severity: violationData.severity,
                timestamp: new Date(),
                duration_seconds: violationData.duration_seconds,
                metadata: {
                    gaze_data: gazeData,
                    pose_data: poseData,
                },
            });

            await violation.save();
            logger.info(`Violation created: ${violationId}`);

            // Increment warning count
            await examService.incrementWarnings(sessionId);

            // Build violation message for frontend
            violationMessages.push(`${violationData.violation_type} detected`);
        }

        // Check if should auto-submit
        if (shouldAutoSubmit(engine)) {
            return {
                shouldAutoSubmit: true,
                violationMessage: `Auto-submit: ${engine.warningCount} warnings exceeded`,
            };
        }
    }

    // Return violation message if any violations were detected
    if (violationMessages.length > 0) {
        return {
            shouldAutoSubmit: false,
            violationMessage: violationMessages.join('; '),
        };
    }

    return { shouldAutoSubmit: false, violationMessage: null };
}

module.exports = {
    getEngine,
    removeEngine,
    verifyInitialIdentity,
    processProctoringFrame,
};
