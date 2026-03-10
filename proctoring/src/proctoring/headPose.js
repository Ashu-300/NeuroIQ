/**
 * Head pose estimation from face landmarks
 * Calculates yaw, pitch, roll from 68-point face landmarks
 */
const logger = require('../config/logger');

// Thresholds for head turn detection (in degrees)
const YAW_THRESHOLD = 25;   // Left/right rotation
const PITCH_THRESHOLD = 20; // Up/down rotation

/**
 * Estimate head pose from face landmarks
 * @param {Buffer} imageBuffer - Image buffer (unused, for API compatibility)
 * @param {Array} landmarks - Array of 68 face landmark points
 * @param {number} rotationThreshold - Threshold in degrees (default: 25)
 * @returns {Object} - {headTurned: boolean, poseData: Object|null}
 */
function estimateHeadPose(imageBuffer, landmarks = null, rotationThreshold = YAW_THRESHOLD) {
  try {
    // If no landmarks provided, we can't estimate pose
    if (!landmarks || landmarks.length === 0) {
      logger.warning('No landmarks for head pose estimation');
      return { headTurned: false, poseData: null };
    }

    // Get first face landmarks if array of arrays
    const faceLandmarks = Array.isArray(landmarks[0]) ? landmarks[0] : landmarks;

    if (faceLandmarks.length < 68) {
      logger.warning(`Insufficient landmarks: ${faceLandmarks.length}`);
      return { headTurned: false, poseData: null };
    }

    // Calculate head pose from key landmarks
    // Using nose tip (30), chin (8), left eye corner (36), right eye corner (45)
    const noseTip = faceLandmarks[30];
    const chin = faceLandmarks[8];
    const leftEye = faceLandmarks[36];
    const rightEye = faceLandmarks[45];
    const leftCheek = faceLandmarks[0];
    const rightCheek = faceLandmarks[16];

    // Calculate yaw (left/right rotation)
    // Asymmetry between nose position and face edges indicates rotation
    const faceWidth = rightCheek.x - leftCheek.x;
    const noseLeftDist = noseTip.x - leftCheek.x;
    const noseRightDist = rightCheek.x - noseTip.x;
    const asymmetry = (noseLeftDist - noseRightDist) / faceWidth;
    const yaw = asymmetry * 90; // Convert to approximate degrees

    // Calculate pitch (up/down rotation)
    // Vertical distance between nose and eyes vs nose and chin
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const noseToEyes = eyeCenterY - noseTip.y;
    const noseToChin = chin.y - noseTip.y;

    // Normal ratio is approximately 0.7
    const normalRatio = 0.7;
    const actualRatio = Math.abs(noseToEyes / noseToChin);
    const pitchOffset = (actualRatio - normalRatio) * 100;
    const pitch = Math.max(-45, Math.min(45, pitchOffset));

    // Calculate roll (head tilt)
    const eyeDiffY = rightEye.y - leftEye.y;
    const eyeDiffX = rightEye.x - leftEye.x;
    const roll = Math.atan2(eyeDiffY, eyeDiffX) * (180 / Math.PI);

    const poseData = {
      yaw: Math.round(yaw * 10) / 10,
      pitch: Math.round(pitch * 10) / 10,
      roll: Math.round(roll * 10) / 10,
    };

    // Check if head is turned beyond threshold
    const headTurned = Math.abs(yaw) > rotationThreshold || Math.abs(pitch) > PITCH_THRESHOLD;

    if (headTurned) {
      logger.info(`Head turned detected: yaw=${poseData.yaw}°, pitch=${poseData.pitch}°`);
    }

    return { headTurned, poseData };
  } catch (error) {
    logger.error(`Head pose estimation error: ${error.message}`);
    return { headTurned: false, poseData: null };
  }
}

/**
 * Check if head is turned away from camera
 * @param {Array} landmarks - Face landmarks
 * @returns {boolean}
 */
function isHeadTurned(landmarks) {
  const result = estimateHeadPose(null, landmarks);
  return result.headTurned;
}

module.exports = {
  estimateHeadPose,
  isHeadTurned,
  YAW_THRESHOLD,
  PITCH_THRESHOLD,
};
