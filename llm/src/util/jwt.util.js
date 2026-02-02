// src/jwtutil/jwt.util.js
const jwt = require("jsonwebtoken");

function validateToken(token) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("missing JWT_SECRET");
    }

    try {
        const decoded = jwt.verify(token, secret, {
            algorithms: ["HS256"],
        });

        return decoded; // this is your Claim
    } catch (err) {
        throw new Error(err.message || "invalid token");
    }
}

module.exports = {
    validateToken,
};
