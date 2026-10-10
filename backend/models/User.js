const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["Point"],
        default: "Point"
    },
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: (coordinates) =>
                coordinates.length === 2 &&
                coordinates.every(Number.isFinite) &&
                coordinates[0] >= -180 && coordinates[0] <= 180 &&
                coordinates[1] >= -90 && coordinates[1] <= 90,
            message: "Location coordinates must be valid [longitude, latitude]"
        }
    }
}, { _id: false });

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            select: false
        },
        role: {
            type: String,
            enum: ["hospital", "blood_bank"],
            required: true
        },
        facility: {
            type: String,
            required: true,
            trim: true
        },
        title: {
            type: String,
            trim: true,
            default: ""
        },
        address: {
            type: String,
            trim: true,
            default: ""
        },
        city: {
            type: String,
            trim: true,
            default: ""
        },
        state: {
            type: String,
            trim: true,
            default: ""
        },
        pinCode: {
            type: String,
            trim: true,
            default: ""
        },
        phone: {
            type: String,
            trim: true,
            default: ""
        },
        location: { type: locationSchema, default: undefined }
    },
    { timestamps: true }
);

// Add 2dsphere index to support geospatial queries (like finding nearest hospitals)
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model("User", userSchema, 'users');