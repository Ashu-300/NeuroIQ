/**
 * Image processing utilities
 */
const logger = require('../config/logger');

/**
 * Convert base64 encoded image string to Buffer
 */
function base64ToImage(imageBase64) {
    try {
        // Remove data URL prefix if present
        let base64Data = imageBase64;
        if (imageBase64.includes(',')) {
            base64Data = imageBase64.split(',')[1];
        }

        const imageBuffer = Buffer.from(base64Data, 'base64');

        if (!imageBuffer || imageBuffer.length === 0) {
            logger.warning('Failed to decode image from base64');
            return null;
        }

        return imageBuffer;
    } catch (error) {
        logger.error(`Error converting base64 to image: ${error.message}`);
        return null;
    }
}

/**
 * Convert image buffer to base64 encoded string
 */
function imageToBase64(imageBuffer) {
    try {
        return imageBuffer.toString('base64');
    } catch (error) {
        logger.error(`Error converting image to base64: ${error.message}`);
        return null;
    }
}

module.exports = {
    base64ToImage,
    imageToBase64,
};
