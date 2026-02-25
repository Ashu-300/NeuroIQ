/**
 * Routes for proctoring operations
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const examService = require('../services/examService');
const proctoringService = require('../services/proctoringService');
const logger = require('../config/logger');

const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /verify-identity
 * Verify student identity at exam start with single face check
 */
router.post('/verify-identity', authMiddleware, upload.single('frame'), async (req, res) => {
    try {
        const { session_id } = req.query;
        const currentUser = req.currentUser;

        if (!session_id) {
            return res.status(400).json({ detail: 'session_id is required' });
        }

        // Verify session ownership
        const session = await examService.getExamSession(session_id);
        if (!session) {
            return res.status(404).json({
                detail: `Session ${session_id} not found`,
            });
        }

        if (session.student_id !== currentUser.userId) {
            return res.status(403).json({
                detail: 'Not authorized to access this session',
            });
        }

        // Get frame from file upload
        if (!req.file) {
            return res.status(400).json({ detail: 'Frame image file is required' });
        }

        const frameBase64 = req.file.buffer.toString('base64');

        // Verify identity
        const { verified, error } = await proctoringService.verifyInitialIdentity(session_id, frameBase64);

        if (!verified) {
            logger.warning(`Identity verification failed for session ${session_id}`, {
                error,
                user_id: currentUser.userId,
            });
            return res.status(400).json({
                detail: `Identity verification failed: ${error}`,
            });
        }

        logger.info(`Identity verified for session ${session_id}`, {
            user_id: currentUser.userId,
        });

        return res.status(200).json({
            verified: true,
            message: 'Identity verification successful',
            session_id,
        });
    } catch (err) {
        logger.error(`Error verifying identity: ${err.message}`);
        return res.status(500).json({
            detail: `Failed to verify identity: ${err.message}`,
        });
    }
});

module.exports = router;
