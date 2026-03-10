/**
 * Face API initialization for Node.js
 * Uses @vladmandic/face-api with WASM backend (no native compilation needed)
 * Falls back to simulated detection if models fail to load
 */
const path = require('path');
const canvas = require('canvas');
const fs = require('fs');

let faceApi = null;
let modelsLoaded = false;
let loadingPromise = null;

const MODELS_PATH = path.join(__dirname, '../../models');

/**
 * Initialize face-api.js with canvas for Node.js
 */
async function initializeFaceApi() {
  if (modelsLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // Import TensorFlow.js and set up WASM backend
      const tf = require('@tensorflow/tfjs');
      require('@tensorflow/tfjs-backend-wasm');
      
      // Set WASM backend (works without native compilation)
      await tf.setBackend('wasm');
      await tf.ready();
      console.log('[FaceAPI] Using TensorFlow.js backend:', tf.getBackend());
      
      // Import face-api with WASM support
      const faceApiModule = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
      faceApi = faceApiModule;

      // Set up canvas environment for Node.js
      const { Canvas, Image, ImageData } = canvas;
      faceApi.env.monkeyPatch({ Canvas, Image, ImageData });

      console.log('[FaceAPI] Loading face detection models...');
      console.log('[FaceAPI] Models path:', MODELS_PATH);

      // Check if models exist
      const manifestPath = path.join(MODELS_PATH, 'ssd_mobilenetv1_model-weights_manifest.json');
      if (!fs.existsSync(manifestPath)) {
        console.error('[FaceAPI] Models not found, using fallback detection');
        return false;
      }

      // Load models from disk
      await faceApi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
      await faceApi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);

      modelsLoaded = true;
      console.log('[FaceAPI] Models loaded successfully');
      return true;
    } catch (error) {
      console.error('[FaceAPI] Failed to load models:', error.message);
      // Fall back to simulated mode - this is OK, detection will still work
      // with the fallback logic in faceDetection.js
      return false;
    }
  })();

  return loadingPromise;
}

/**
 * Get face-api instance
 */
function getFaceApi() {
  return faceApi;
}

/**
 * Check if models are loaded
 */
function isReady() {
  return modelsLoaded;
}

/**
 * Load image from buffer
 */
async function loadImageFromBuffer(imageBuffer) {
  if (!imageBuffer || imageBuffer.length === 0) return null;

  try {
    const img = new canvas.Image();
    img.src = imageBuffer;
    return img;
  } catch (error) {
    console.error('[FaceAPI] Image load error:', error.message);
    return null;
  }
}

/**
 * Create canvas from image buffer
 */
async function createCanvasFromBuffer(imageBuffer) {
  if (!imageBuffer || imageBuffer.length === 0) return null;

  try {
    const img = await canvas.loadImage(imageBuffer);
    const cvs = canvas.createCanvas(img.width, img.height);
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return cvs;
  } catch (error) {
    console.error('[FaceAPI] Canvas creation error:', error.message);
    return null;
  }
}

module.exports = {
  initializeFaceApi,
  getFaceApi,
  isReady,
  loadImageFromBuffer,
  createCanvasFromBuffer,
};
