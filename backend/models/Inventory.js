const mongoose = require("mongoose");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENT_TYPES = ['Whole Blood', 'Packed Red Blood Cells', 'Platelets', 'Plasma'];
const SCREENING_STATUSES = ['Approved', 'Pending', 'Rejected'];
const VERIFICATION_STATUSES = ['Verified', 'Pending', 'Rejected'];
const STOCK_STATUSES = ['Available', 'Quarantined', 'Reserved', 'Dispatched', 'Deactivated', 'Expired'];

const inventorySchema = new mongoose.Schema({
    hospitalId: { type: String, required: true, index: true },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    facilityName: { type: String, required: true, trim: true },
    facilityType: { type: String, enum: ["hospital", "bloodbank"], default: "bloodbank", required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true, index: true },
    componentType: {
        type: String,
        enum: COMPONENT_TYPES,
        required: true,
        index: true
    },
    units: { type: Number, required: true, min: 0, validate: Number.isInteger },
    bagId: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    collectionDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true,
        index: true
    },
    screeningStatus: {
        type: String,
        enum: SCREENING_STATUSES,
        default: 'Approved',
        required: true
    },
    verificationStatus: {
        type: String,
        enum: VERIFICATION_STATUSES,
        default: 'Verified',
        required: true
    },
    storageLocation: {
        type: String,
        trim: true,
        default: 'Main Cold Bay'
    },
    facilityAddress: {
        type: String,
        trim: true,
        default: ''
    },
    city: {
        type: String,
        trim: true,
        default: ''
    },
    state: {
        type: String,
        trim: true,
        default: ''
    },
    pinCode: {
        type: String,
        trim: true,
        default: ''
    },
    contactPhone: {
        type: String,
        trim: true,
        default: ''
    },
    contactEmail: {
        type: String,
        trim: true,
        default: ''
    },
    location: {
        type: new mongoose.Schema({
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: {
                type: [Number],
                required: true,
                validate: {
                    validator: (coords) => Array.isArray(coords) && coords.length === 2 && coords.every(Number.isFinite),
                    message: 'Coordinates must be [longitude, latitude]'
                }
            }
        }, { _id: false }),
        default: undefined
    },
    status: {
        type: String,
        enum: STOCK_STATUSES,
        default: 'Available',
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    notes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Ensure geospatial index on location
inventorySchema.index({ location: '2dsphere' }, { sparse: true });
inventorySchema.index({ hospitalId: 1, bloodGroup: 1, componentType: 1, isActive: 1 });
inventorySchema.index({ bagId: 1 }, { unique: true });

// Virtual field to calculate dynamic Spoilage Risk Score (1 to 10)
inventorySchema.virtual('spoilageRiskScore').get(function () {
    if (!this.expiryDate) return 2;

    const now = new Date();
    const diffInTime = this.expiryDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffInTime / (1000 * 3600 * 24));

    if (daysLeft <= 0) return 10;
    if (daysLeft <= 2) return 9;
    if (daysLeft <= 5) return 6;
    return 2;
});

// Virtual field to check if stock is safe and eligible for transfusion
inventorySchema.virtual('isEligible').get(function () {
    const notExpired = this.expiryDate && new Date(this.expiryDate) > new Date();
    const isApproved = this.screeningStatus === 'Approved';
    const isVerified = this.verificationStatus === 'Verified';
    const hasStock = Number(this.units) > 0;
    const isAvailableStatus = this.status === 'Available';
    return Boolean(this.isActive && notExpired && isApproved && isVerified && hasStock && isAvailableStatus);
});

inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

const Inventory = mongoose.models.Inventory || mongoose.model("Inventory", inventorySchema);
module.exports = Inventory;
module.exports.BloodInventory = Inventory;
module.exports.BLOOD_GROUPS = BLOOD_GROUPS;
module.exports.COMPONENT_TYPES = COMPONENT_TYPES;