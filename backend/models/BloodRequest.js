const mongoose = require("mongoose");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENT_TYPES = ['Whole Blood', 'Packed Red Blood Cells', 'Platelets', 'Plasma'];
const REQUEST_STATUSES = ["Pending", "Accepted", "Rejected", "Dispatched", "Delivered"];

const bloodRequestSchema = new mongoose.Schema({
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    hospitalName: { type: String, required: true, trim: true },
    hospitalFacility: { type: String, required: true, trim: true },
    hospitalEmail: { type: String, required: true, lowercase: true, trim: true },
    // Hospital geographic info (saved at time of request)
    hospitalAddress: { type: String, default: "", trim: true },
    hospitalCity: { type: String, default: "", trim: true },
    hospitalDistrict: { type: String, default: "", trim: true },
    hospitalState: { type: String, default: "", trim: true },
    hospitalPinCode: { type: String, default: "", trim: true },
    hospitalLocation: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: { type: [Number] }
    },
    bloodBankId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    bloodBankFacility: { type: String, default: "", trim: true },
    bloodBankName: { type: String, default: "", trim: true },
    // Destination blood bank geographic info (saved at time of request)
    bloodBankAddress: { type: String, default: "", trim: true },
    bloodBankCity: { type: String, default: "", trim: true },
    bloodBankState: { type: String, default: "", trim: true },
    bloodBankPhone: { type: String, default: "", trim: true },
    bloodBankEmail: { type: String, default: "", trim: true },
    distanceKm: { type: Number, default: null },
    bloodBankLocation: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: { type: [Number] }
    },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    componentType: { type: String, enum: COMPONENT_TYPES, default: "Whole Blood", required: true },
    units: { type: Number, required: true, min: 1, max: 100, validate: Number.isInteger },
    urgency: { type: String, enum: ["Critical", "High", "Normal"], required: true },
    status: { type: String, enum: REQUEST_STATUSES, default: "Pending", index: true },
    transfusionConfirmationRequired: { type: Boolean, default: false },
    compatibilityNotice: { type: String, default: "" },
    notes: { type: String, default: "" },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    acceptedFacility: { type: String, default: "" },
    acceptedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedFacility: { type: String, default: "" },
    rejectedAt: { type: Date, default: null },
    dispatchedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    reservations: [{
        inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
        bagId: { type: String, default: "" },
        units: { type: Number, required: true, min: 1 }
    }]
}, { timestamps: true });

bloodRequestSchema.index({ hospitalId: 1, createdAt: -1 });
bloodRequestSchema.index({ bloodBankId: 1, createdAt: -1 });
bloodRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.BloodRequest || mongoose.model("BloodRequest", bloodRequestSchema);