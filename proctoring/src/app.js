/**
 * Express application factory and setup
 */
const express = require('express');
const cors = require('cors');
const http = require('http');
const settings = require('./config/config');
const logger = require('./config/logger');
const { connectDB, disconnectDB } = require('./db/mongo');
const examRoutes = require('./routes/examRoutes');
const proctorRoutes = require('./routes/proctorRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const { setupWebSocket } = require('./websocket/proctoring');

/**
 * Create and configure Express application
 */
function createApp() {
    const app = express();

    // Middleware
    app.use(cors({
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Routes
    app.use('/api/proctoring/exam', examRoutes);
    app.use('/api/proctoring/proctor', proctorRoutes);
    app.use('/api/proctoring/submission', submissionRoutes);

    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: settings.SERVICE_NAME,
            version: '1.0.0',
        });
    });

    // Root endpoint
    app.get('/', (req, res) => {
        res.json({
            service: settings.SERVICE_NAME,
            description: 'Online examination with AI-based proctoring',
            version: '1.0.0',
            endpoints: {
                health: '/health',
                exam: '/api/proctoring/exam',
                proctor: '/api/proctoring/proctor',
                submission: '/api/proctoring/submission',
                websocket_proctor: `ws://localhost:${settings.SERVICE_PORT}/ws/proctor/{session_id}`,
            },
        });
    });

    // Create HTTP server
    const server = http.createServer(app);

    // Setup WebSocket
    setupWebSocket(server);

    // Start server
    async function start() {
        try {
            // Connect to MongoDB
            await connectDB();

            server.listen(settings.SERVICE_PORT, () => {
                logger.info(`Starting ${settings.SERVICE_NAME} service on port ${settings.SERVICE_PORT}`);
                logger.info(`API docs available at http://localhost:${settings.SERVICE_PORT}/`);
                logger.info(`WebSocket endpoint: ws://localhost:${settings.SERVICE_PORT}/ws/proctor/{session_id}`);
            });
        } catch (error) {
            logger.error(`Failed to start server: ${error.message}`);
            process.exit(1);
        }
    }

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info(`Shutting down ${settings.SERVICE_NAME} service`);
        await disconnectDB();
        server.close(() => {
            process.exit(0);
        });
    });

    process.on('SIGINT', async () => {
        logger.info(`Shutting down ${settings.SERVICE_NAME} service`);
        await disconnectDB();
        server.close(() => {
            process.exit(0);
        });
    });

    // Start the server
    start();

    return app;
}

module.exports = { createApp };
