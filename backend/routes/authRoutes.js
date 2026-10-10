const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/requireAuth");

const router = express.Router();

// Normalize UI role labels to the backend role values.
const normalizeRole = (role) => {
    if (typeof role !== "string") return "";

    const value = role.trim().toLowerCase().replace(/[\s-]+/g, "_");

    if (value === "hospital") return "hospital";
    if (value === "blood_bank" || value === "bloodbank") return "blood_bank";

    return value;
};

function hasValidCoordinates(latitude, longitude) {
    if (latitude === undefined || latitude === null || String(latitude).trim() === "" ||
        longitude === undefined || longitude === null || String(longitude).trim() === "") {
        return false;
    }
    const lat = Number(latitude);
    const lon = Number(longitude);
    return Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
        Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

function registrationErrorDetails(error) {
    const details = {
        name: error.name || "Error",
        message: String(error.message || "Unknown registration error")
            .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]+@/gi, "$1[REDACTED]@")
            .replace(/((?:password|token|authorization|secret)\s*:\s*["'])[^"']*(["'])/gi, "$1[REDACTED]$2")
    };

    if (error.code !== undefined) details.code = error.code;
    if (error.name === "ValidationError" && error.errors) {
        details.validation = Object.values(error.errors).map((validationError) => ({
            path: validationError.path,
            name: validationError.name,
            kind: validationError.kind
        }));
    }
    if (error.keyPattern) {
        details.duplicateFields = Object.keys(error.keyPattern);
    }

    return details;
}

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role, facility, title, address, city, state, pinCode, phone, latitude, longitude } = req.body || {};

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password ||
            typeof role !== "string" ||
            typeof facility !== "string" ||
            !facility.trim() ||
            typeof address !== "string" ||
            !address.trim() ||
            typeof city !== "string" ||
            !city.trim() ||
            typeof state !== "string" ||
            !state.trim() ||
            typeof pinCode !== "string" ||
            !pinCode.trim() ||
            typeof phone !== "string" ||
            !phone.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password, role, facility, address, district or city, state, PIN code and contact number are required"
            });
        }
        if (!hasValidCoordinates(latitude, longitude)) {
            return res.status(400).json({
                success: false,
                message: "Valid facility latitude and longitude are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedRole = normalizeRole(role);

        if (!["hospital", "blood_bank"].includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: "Database is not ready. Please try again shortly."
            });
        }

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered. Please log in."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: normalizedRole,
            facility: facility.trim(),
            title: typeof title === "string" ? title.trim() : "",
            address: typeof address === "string" ? address.trim() : "",
            city: typeof city === "string" ? city.trim() : "",
            state: typeof state === "string" ? state.trim() : "",
            pinCode: typeof pinCode === "string" ? pinCode.trim() : "",
            phone: typeof phone === "string" ? phone.trim() : "",
            location: {
                type: "Point",
                coordinates: [Number(longitude), Number(latitude)]
            }
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                role: user.role,
                facility: user.facility,
                title: user.title,
                address: user.address,
                city: user.city,
                state: user.state,
                pinCode: user.pinCode,
                phone: user.phone,
                location: user.location
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already registered. Please log in."
            });
        }

        console.error("Registration failed:", registrationErrorDetails(error));

        if (
            mongoose.connection.readyState !== 1 ||
            error.name === "MongoServerSelectionError" ||
            error.name === "MongoNetworkError"
        ) {
            return res.status(503).json({
                success: false,
                message: "Database is temporarily unavailable. Please try again shortly."
            });
        }

        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Account details are invalid. Check the submitted fields."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Account creation failed due to a server error."
        });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password, role } = req.body || {};

        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password ||
            typeof role !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Email, password and role are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedRole = normalizeRole(role);

        if (!["hospital", "blood_bank"].includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid account role"
            });
        }

        if (mongooseConnectionNotReady()) {
            return res.status(503).json({
                success: false,
                message: "Database is not ready. Please try again shortly."
            });
        }

        const user = await User.findOne({
            email: normalizedEmail
        }).select("+password");

        if (!user || normalizeRole(user.role) !== normalizedRole) {
            return res.status(401).json({
                success: false,
                message: "Email, password, or selected account role is incorrect"
            });
        }

        if (typeof user.password !== "string" || !user.password) {
            console.error("Login failed: stored password is unavailable for the account.");
            return res.status(500).json({
                success: false,
                message: "Account password configuration needs attention."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Email, password, or selected account role is incorrect"
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("Login configuration error: JWT_SECRET is missing.");

            return res.status(500).json({
                success: false,
                message: "Server authentication configuration is incomplete."
            });
        }

        const token = jwt.sign(
            {
                sub: String(user._id),
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h",
                issuer: "redrelay-api",
                audience: "redrelay-client"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                role: user.role,
                facility: user.facility,
                title: user.title,
                address: user.address,
                city: user.city,
                state: user.state,
                pinCode: user.pinCode,
                phone: user.phone,
                location: user.location
            }
        });
    } catch (error) {
        console.error("Login route failed:", error.stack || error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed due to a server error. Check the backend terminal."
        });
    }
});

// GET CURRENT USER PROFILE
router.get("/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password").lean();
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.json({
            success: true,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                role: user.role,
                facility: user.facility,
                title: user.title,
                address: user.address,
                city: user.city,
                state: user.state,
                pinCode: user.pinCode,
                phone: user.phone,
                location: user.location
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch profile" });
    }
});

// UPDATE PROFILE & COORDINATES
router.put("/profile", requireAuth, requireRole("hospital", "blood_bank"), async (req, res) => {
    try {
        const { name, facility, title, address, city, state, pinCode, phone, latitude, longitude } = req.body || {};

        if ((latitude !== undefined || longitude !== undefined) && !hasValidCoordinates(latitude, longitude)) {
            return res.status(400).json({
                success: false,
                message: "Provide both a valid latitude and longitude"
            });
        }

        const updateData = {};
        if (typeof name === "string" && name.trim()) updateData.name = name.trim();
        if (typeof facility === "string" && facility.trim()) updateData.facility = facility.trim();
        for (const [field, value] of Object.entries({ title, address, city, state, pinCode, phone })) {
            if (value !== undefined && typeof value !== "string") {
                return res.status(400).json({
                    success: false,
                    message: `${field} must be text`
                });
            }
            if (typeof value === "string") updateData[field] = value.trim();
        }

        if (latitude !== undefined && longitude !== undefined) {
            updateData.location = {
                type: "Point",
                coordinates: [Number(longitude), Number(latitude)]
            };
        }

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");
        if (!updated) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: String(updated._id),
                name: updated.name,
                email: updated.email,
                role: updated.role,
                facility: updated.facility,
                title: updated.title,
                address: updated.address,
                city: updated.city,
                state: updated.state,
                pinCode: updated.pinCode,
                phone: updated.phone,
                location: updated.location
            }
        });
    } catch (error) {
        console.error("Profile update error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to update profile" });
    }
});

// Check the existing Mongoose connection without changing its configuration.
function mongooseConnectionNotReady() {
    return mongoose.connection.readyState !== 1;
}

module.exports = router;