/**
 * Structured logging
 */
const settings = require('./config');

const levels = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4,
};

const logLevel = settings.LOG_LEVEL.toUpperCase();

function shouldLog(level) {
    return levels[level.toUpperCase()] >= levels[logLevel];
}

function formatLog(level, message, extra = {}) {
    const logData = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        logger: 'app',
        message,
        service: settings.SERVICE_NAME,
        ...extra,
    };
    return JSON.stringify(logData);
}

const logger = {
    debug: function(message, extra = {}) {
        if (shouldLog('DEBUG')) {
            console.log(formatLog('DEBUG', message, extra));
        }
    },
    info: function(message, extra = {}) {
        if (shouldLog('INFO')) {
            console.log(formatLog('INFO', message, extra));
        }
    },
    warning: function(message, extra = {}) {
        if (shouldLog('WARNING')) {
            console.warn(formatLog('WARNING', message, extra));
        }
    },
    warn: function(message, extra = {}) {
        this.warning(message, extra);
    },
    error: function(message, extra = {}) {
        if (shouldLog('ERROR')) {
            console.error(formatLog('ERROR', message, extra));
        }
    },
};

module.exports = logger;
