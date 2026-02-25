/**
 * JWT authentication middleware
 * Compatible with Go auth service (HS256)
 */
const jwt = require('jsonwebtoken');
const settings = require('../config/config');

/**
 * Verify JWT token from Authorization header
 */
function verifyToken(token) {
    try {
        const payload = jwt.verify(token, settings.JWT_SECRET, {
            algorithms: [settings.JWT_ALGORITHM],
        });

        // Match Go claim names
        const userId = payload.ID;
        const role = payload.Role;
        const email = payload.Email;

        if (!userId || !role) {
            return { error: 'Invalid token: missing required claims', status: 401 };
        }

        return {
            userId,
            role,
            email,
        };
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return { error: 'Token has expired', status: 401 };
        }
        if (err.name === 'JsonWebTokenError') {
            return { error: 'Invalid token', status: 401 };
        }
        return { error: err.message, status: 401 };
    }
}

/**
 * Express middleware for protected routes
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            detail: 'Missing or invalid authorization header',
        });
    }

    const token = authHeader.substring(7);
    const result = verifyToken(token);

    if (result.error) {
        return res.status(result.status || 401).json({
            detail: result.error,
        });
    }

    req.currentUser = result;
    next();
}

module.exports = {
    verifyToken,
    authMiddleware,
};
