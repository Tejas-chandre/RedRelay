const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    let payload;
    try {
        payload = jwt.verify(match[1], process.env.JWT_SECRET, {
            issuer: "redrelay-api",
            audience: "redrelay-client"
        });
    } catch {
        return res.status(401).json({ success: false, message: "Session expired or invalid. Please sign in again" });
    }

    try {
        const user = await User.findById(payload.sub).select("name email role facility title address city state pinCode phone location");

        if (!user) {
            return res.status(401).json({ success: false, message: "Account is no longer available" });
        }

        req.user = user;
        return next();
    } catch (error) {
        console.error("Authentication lookup error:", error.message);
        return res.status(503).json({ success: false, message: "Authentication service is temporarily unavailable" });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Your account role is not allowed to perform this action" });
        }

        return next();
    };
}

module.exports = { requireAuth, requireRole };