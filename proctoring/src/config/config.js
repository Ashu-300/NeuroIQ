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
    MONGO_DB: process.env.MONGO_DB || 'NeuroIQ_ProctoringDB',

    
};

module.exports = settings;
