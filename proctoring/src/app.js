const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path'); 
const examRoutes = require('./routes/examRoutes');
const proctorRoutes = require('./routes/proctorRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const { setupSocketIO } = require('./websocket/proctoring');
const { connectDB } = require('./db/mongo');
const morgan = require("morgan");

function createApp() {
    const app = express();

    connectDB();

    // Middleware
    app.use(cors({
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    app.use(express.json({ }));
    app.use(express.urlencoded({ extended: true }));

    app.use(morgan("dev"));

    
    // Routes
    app.use('/api/proctoring/exam', examRoutes);
    app.use('/api/proctoring/proctor', proctorRoutes);
    app.use('/api/proctoring/submission', submissionRoutes);

    app.get("/api/proctoring/download-agent", (req, res) => {
        const filePath = path.join(__dirname, "..", "downloads", "neuroiq-proctor.zip");

        res.download(filePath, "neuroiq-proctor.zip", (err) => {
            if (err) {
                console.error("Download error:", err);
                res.status(404).json({ error: "File not found" });
            }
        });
    });


    // Create HTTP server
    const server = http.createServer(app);

    // Setup Socket.IO
    setupSocketIO(server);

    return { app, server };
}

module.exports = { createApp };
