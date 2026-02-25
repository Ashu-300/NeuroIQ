/**
 * Application configuration
 */
require('dotenv').config();

const settings = {
    SERVICE_NAME: process.env.SERVICE_NAME || 'exam',
    SERVICE_PORT: parseInt(process.env.SERVICE_PORT, 10) || 8000,
    ENV: process.env.ENV || 'development',

    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ALGORITHM: process.env.JWT_ALGORITHM || 'HS256',

    MONGO_URI: process.env.MONGO_URI,
    MONGO_DB: process.env.MONGO_DB || 'neuroiq_exam',

    FRAME_INTERVAL_SECONDS: parseFloat(process.env.FRAME_INTERVAL_SECONDS) || 2.0,
    MAX_NO_FACE_SECONDS: parseFloat(process.env.MAX_NO_FACE_SECONDS) || 3.0,
    MAX_LOOKING_AWAY_SECONDS: parseFloat(process.env.MAX_LOOKING_AWAY_SECONDS) || 3.0,
    MAX_WARNINGS: parseInt(process.env.MAX_WARNINGS, 10) || 3,

    LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
};

module.exports = settings;
