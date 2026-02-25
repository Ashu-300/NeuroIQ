/**
 * WebSocket handler for live webcam proctoring
 */
const WebSocket = require('ws');
const examService = require('../services/examService');
const proctoringService = require('../services/proctoringService');
const logger = require('../config/logger');

// Active connections: sessionId -> ws
const activeConnections = new Map();

/**
 * Setup WebSocket server on HTTP server
 */
function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server, path: '/ws/proctor' });

    wss.on('connection', async (ws, req) => {
        // Extract session_id from URL path
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathParts = url.pathname.split('/');
        const sessionId = pathParts[pathParts.length - 1] || url.searchParams.get('session_id');

        if (!sessionId || sessionId === 'proctor') {
            logger.warning('WebSocket connection attempted without session_id');
            ws.close(4004, 'Session ID required');
            return;
        }

        // Verify session exists
        const session = await examService.getExamSession(sessionId);
        if (!session) {
            logger.warning(`WebSocket connection: session not found: ${sessionId}`);
            ws.close(4004, 'Session not found');
            return;
        }

        // Store connection
        activeConnections.set(sessionId, ws);
        logger.info(`Proctoring WebSocket connected: ${sessionId}`);

        // Handle messages
        ws.on('message', async (data) => {
            try {
                const payload = JSON.parse(data.toString());
                await handleProctoringFrame(ws, sessionId, payload);
            } catch (err) {
                logger.error(`WebSocket message error: ${err.message}`);
                ws.send(JSON.stringify({
                    status: 'error',
                    message: 'Invalid JSON payload',
                }));
            }
        });

        // Handle close
        ws.on('close', () => {
            activeConnections.delete(sessionId);
            proctoringService.removeEngine(sessionId);
            logger.info(`Proctoring WebSocket disconnected: ${sessionId}`);
        });

        // Handle error
        ws.on('error', (err) => {
            logger.error(`WebSocket error for session ${sessionId}: ${err.message}`);
            activeConnections.delete(sessionId);
            proctoringService.removeEngine(sessionId);
        });
    });

    logger.info('WebSocket server setup complete');
    return wss;
}

/**
 * Handle incoming webcam frame
 */
async function handleProctoringFrame(ws, sessionId, payload) {
    try {
        const frameBase64 = payload.frame;
        const timestamp = payload.timestamp;

        if (!frameBase64) {
            ws.send(JSON.stringify({
                status: 'error',
                message: 'Missing frame data',
            }));
            return;
        }

        // Process frame for violations
        const { shouldAutoSubmit: autoSubmit, violationMessage } = 
            await proctoringService.processProctoringFrame(sessionId, frameBase64);

        // Send response
        const response = {
            status: 'ok',
            processed: true,
            auto_submit: autoSubmit,
            timestamp: timestamp,
        };

        if (violationMessage) {
            response.violation_message = violationMessage;
        }

        ws.send(JSON.stringify(response));

        // If auto-submit triggered, submit exam
        if (autoSubmit) {
            await examService.autoSubmitExam(sessionId, 'proctoring_violation');

            ws.send(JSON.stringify({
                status: 'auto_submit',
                message: 'Exam auto-submitted due to violations',
                reason: 'Max warnings exceeded',
            }));

            // Close connection
            ws.close(1000, 'Exam auto-submitted');
        }
    } catch (err) {
        logger.error(`Error processing proctoring frame: ${err.message}`);
        ws.send(JSON.stringify({
            status: 'error',
            message: `Frame processing error: ${err.message}`,
        }));
    }
}

/**
 * Get active connection for a session
 */
function getConnection(sessionId) {
    return activeConnections.get(sessionId);
}

module.exports = {
    setupWebSocket,
    handleProctoringFrame,
    getConnection,
};
