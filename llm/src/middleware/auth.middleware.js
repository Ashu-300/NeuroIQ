// src/middleware/auth.middleware.js
const { validateToken } = require("../jwtutil/jwt.util");

function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({
            message: "Missing Authorization header",
        });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
        return res.status(401).json({
            message: "Invalid Authorization header format",
        });
    }

    const token = parts[1];

    let claims;
    try {
        claims = validateToken(token);
    } catch (err) {
        return res.status(401).json({
            message: err.message,
        });
    }

    // ✅ FIXED LOGIC (teacher OR admin allowed)
    if (claims.role !== "teacher" && claims.role !== "admin") {
        return res.status(403).json({
            message: "Not Authorized for the service",
        });
    }

    // Attach auth context (similar to Go context)
    req.auth = {
        userId: claims.id,
        email: claims.email,
        role: claims.role,
        claims,
    };

    next();
}

module.exports = authMiddleware;
