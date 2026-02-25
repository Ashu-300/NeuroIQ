/**
 * MongoDB connection
 */
const mongoose = require('mongoose');
const settings = require('../config/config');
const logger = require('../config/logger');

async function connectDB() {
    try {
        const uri = `${settings.MONGO_URI}/${settings.MONGO_DB}`;
        await mongoose.connect(uri);
        logger.info(`MongoDB connected: ${settings.MONGO_DB}`);
    } catch (error) {
        logger.error(`MongoDB connection failed: ${error.message}`);
        throw error;
    }
}

async function disconnectDB() {
    try {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
    } catch (error) {
        logger.error(`MongoDB disconnect error: ${error.message}`);
    }
}

module.exports = {
    connectDB,
    disconnectDB,
};
