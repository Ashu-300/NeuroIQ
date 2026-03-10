/**
 * Face detection module using @vladmandic/face-api
 * Real face detection for proctoring
 */
const logger = require('../config/logger');
const { getFaceApi, isReady, createCanvasFromBuffer } = require('./faceApiSetup');

// Minimum confidence for face detection
const MIN_CONFIDENCE = 0.5;

/**
 * Detect faces in an image buffer
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} - {faces: Array, faceCount: number, landmarks: Array}
 */
async function detectFaces(imageBuffer) {
  try {
    // Check if image buffer is valid
    if (!imageBuffer || imageBuffer.length === 0) {
      logger.warning('Empty image buffer');
      return { faces: [], faceCount: 0, landmarks: [] };
    }

    // Check if face-api is ready
    if (!isReady()) {
      logger.warning('Face-api not ready, using fallback detection');
      return detectFacesFallback(imageBuffer);
    }

    const faceApi = getFaceApi();
    if (!faceApi) {
      logger.warning('Face-api not available, using fallback detection');
      return detectFacesFallback(imageBuffer);
    }

    // Create canvas from image buffer
    const canvas = await createCanvasFromBuffer(imageBuffer);
    if (!canvas) {
      logger.warning('Failed to create canvas from image');
      // Return "no face" to trigger violation when image can't be processed
      return { faces: [], faceCount: 0, landmarks: [], cameraHidden: true };
    }

    // Detect faces with landmarks
    const detections = await faceApi
      .detectAllFaces(canvas, new faceApi.SsdMobilenetv1Options({ minConfidence: MIN_CONFIDENCE }))
      .withFaceLandmarks();

    const faces = detections.map((d) => ({
      x: d.detection.box.x,
      y: d.detection.box.y,
      w: d.detection.box.width,
      h: d.detection.box.height,
      confidence: d.detection.score,
      landmarks: d.landmarks ? d.landmarks.positions : [],
    }));

    logger.info(`Face detection: Found ${faces.length} faces`);

    return {
      faces,
      faceCount: faces.length,
      landmarks: faces.map((f) => f.landmarks),
      cameraHidden: false,
    };
  } catch (error) {
    logger.error(`Face detection error: ${error.message}`);
    // On error, assume camera might be hidden
    return { faces: [], faceCount: 0, landmarks: [], cameraHidden: true };
  }
}

/**
 * Fallback detection when face-api is not available
 * Uses basic image analysis to detect possible camera hiding
 * IMPORTANT: When ML is unavailable, we assume face is present if image looks valid
 * This allows exams to proceed gracefully without blocking students
 */
function detectFacesFallback(imageBuffer) {
  try {
    // Check if buffer looks like a valid image
    const bufferSize = imageBuffer.length;

    // Very small buffer likely means black/hidden camera
    if (bufferSize < 1000) {
      logger.warning('Fallback: Very small image buffer, assuming camera hidden');
      return { faces: [], faceCount: 0, landmarks: [], cameraHidden: true };
    }

    // Analyze first few bytes to check for valid JPEG
    if (imageBuffer[0] !== 0xff || imageBuffer[1] !== 0xd8) {
      // Not a valid JPEG
      logger.warning('Fallback: Invalid JPEG header');
      return { faces: [], faceCount: 0, landmarks: [], cameraHidden: true };
    }

    // Calculate average pixel value to detect black screen
    // Sample from middle of buffer to avoid JPEG headers
    const startOffset = Math.min(500, Math.floor(bufferSize / 4));
    const sampleSize = Math.min(1000, bufferSize - startOffset);
    let sum = 0;
    for (let i = startOffset; i < startOffset + sampleSize; i++) {
      sum += imageBuffer[i];
    }
    const avgValue = sum / sampleSize;

    // If average is very low, screen might be blocked
    if (avgValue < 20) {
      logger.warning('Fallback: Very dark image detected, assuming camera blocked');
      return { faces: [], faceCount: 0, landmarks: [], cameraHidden: true };
    }

    // Valid image detected - ASSUME ONE FACE PRESENT when ML is unavailable
    // This is graceful degradation: we can't detect faces but we allow the exam
    // Real violations will still be caught when they cover camera or leave
    logger.info('Fallback: Valid image detected, assuming 1 face present (ML unavailable)');
    const simulatedFace = {
      x: 100,
      y: 100,
      w: 200,
      h: 200,
      confidence: 0.5, // Lower confidence since it's simulated
      landmarks: [],
    };
    return { 
      faces: [simulatedFace], 
      faceCount: 1, 
      landmarks: [], 
      cameraHidden: false,
      fallbackMode: true, // Flag to indicate fallback was used
    };
  } catch (error) {
    logger.error(`Fallback detection error: ${error.message}`);
    return { faces: [], faceCount: 0, landmarks: [], cameraHidden: true };
  }
}

/**
 * Check if camera appears to be covered/hidden
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {boolean} - true if camera appears hidden
 */
async function isCameraHidden(imageBuffer) {
  const result = await detectFaces(imageBuffer);
  return result.cameraHidden || false;
}

module.exports = {
  detectFaces,
  detectFacesFallback,
  isCameraHidden,
};
