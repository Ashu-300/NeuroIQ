/**
 * Eye tracking and gaze direction detection using face landmarks
 * Analyzes eye position to detect if student is looking away
 */
const logger = require('../config/logger');

// Gaze offset threshold for looking away detection
const GAZE_THRESHOLD = 0.25;

/**
 * Calculate eye aspect ratio (EAR) for blink/eye closure detection
 * @param {Array} eye - 6 landmark points for one eye
 * @returns {number} - Eye aspect ratio
 */
function calculateEAR(eye) {
  if (!eye || eye.length < 6) return 0.3; // Default to open eye

  // Vertical eye distances
  const v1 = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2));
  const v2 = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2));

  // Horizontal eye distance
  const h = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2));

  // EAR = (v1 + v2) / (2 * h)
  const ear = (v1 + v2) / (2 * h);
  return ear;
}

/**
 * Detect if eyes are looking away from camera using face landmarks
 * @param {Buffer} imageBuffer - Image buffer (unused, for API compatibility)
 * @param {Array} landmarks - Face landmarks (68 points)
 * @param {number} threshold - Threshold for gaze direction (0-1)
 * @returns {Object} - {lookingAway: boolean, gazeData: Object|null}
 */
function detectEyesLookingAway(imageBuffer, landmarks = null, threshold = GAZE_THRESHOLD) {
  try {
    // If no landmarks provided, we can't detect gaze
    if (!landmarks || landmarks.length === 0) {
      logger.warning('No landmarks for eye tracking');
      return { lookingAway: false, gazeData: null };
    }

    // Get first face landmarks if array of arrays
    const faceLandmarks = Array.isArray(landmarks[0]) ? landmarks[0] : landmarks;

    if (faceLandmarks.length < 68) {
      logger.warning(`Insufficient landmarks for eye tracking: ${faceLandmarks.length}`);
      return { lookingAway: false, gazeData: null };
    }

    // Get left eye landmarks (36-41) and right eye landmarks (42-47)
    const leftEye = faceLandmarks.slice(36, 42);
    const rightEye = faceLandmarks.slice(42, 48);

    // Calculate eye centers
    const leftEyeCenter = {
      x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
      y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length,
    };
    const rightEyeCenter = {
      x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
      y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length,
    };

    // Get face center (nose bridge - landmark 27-30)
    const noseBridge = faceLandmarks[27];
    const noseTip = faceLandmarks[30];

    // Calculate horizontal gaze offset
    // Eyes should be roughly symmetric around nose bridge
    const avgEyeX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
    const eyeDistance = rightEyeCenter.x - leftEyeCenter.x;

    // Horizontal offset of eye centers relative to nose
    const horizontalOffset = (avgEyeX - noseBridge.x) / eyeDistance;

    // Calculate vertical gaze (are eyes looking up/down based on relative positions)
    const avgEyeY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
    const verticalOffset = (avgEyeY - noseBridge.y) / eyeDistance;

    // Calculate EAR for blink detection
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    const gazeData = {
      left_eye_center: leftEyeCenter,
      right_eye_center: rightEyeCenter,
      horizontal_gaze: Math.round(horizontalOffset * 100) / 100,
      vertical_gaze: Math.round(verticalOffset * 100) / 100,
      eye_aspect_ratio: Math.round(avgEAR * 100) / 100,
      eyes_closed: avgEAR < 0.2,
    };

    // Determine if looking away
    const lookingAway = Math.abs(horizontalOffset) > threshold || Math.abs(verticalOffset) > threshold * 2;

    if (lookingAway) {
      logger.info(`Looking away detected: horizontal=${gazeData.horizontal_gaze}, vertical=${gazeData.vertical_gaze}`);
    }

    return { lookingAway, gazeData };
  } catch (error) {
    logger.error(`Eye tracking error: ${error.message}`);
    return { lookingAway: false, gazeData: null };
  }
}

/**
 * Check if eyes are closed
 * @param {Array} landmarks - Face landmarks
 * @returns {boolean}
 */
function areEyesClosed(landmarks) {
  const result = detectEyesLookingAway(null, landmarks);
  return result.gazeData?.eyes_closed || false;
}

module.exports = {
  detectEyesLookingAway,
  areEyesClosed,
  calculateEAR,
  GAZE_THRESHOLD,
};
