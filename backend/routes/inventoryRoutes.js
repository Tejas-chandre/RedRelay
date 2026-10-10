const express = require("express");
const mongoose = require("mongoose");
const Inventory = require("../models/Inventory");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/requireAuth");
const {
    normalizeComponent,
    getCompatibleDonorGroups,
    evaluateCompatibility,
    calculateDistanceKm
} = require("../services/compatibilityService");

const router = express.Router();
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENT_TYPES = ['Whole Blood', 'Packed Red Blood Cells', 'Platelets', 'Plasma'];
const SCREENING_STATUSES = ['Approved', 'Pending', 'Rejected'];
const VERIFICATION_STATUSES = ['Verified', 'Pending', 'Rejected'];

router.use(requireAuth);

/**
 * GET /api/inventory
 * - Blood banks: view and manage only their own inventory records
 * - Hospitals: view available eligible inventory across active network
 */
router.get("/", async (req, res) => {
    try {
        const {
            bloodGroup,
            componentType,
            screeningStatus,
            verificationStatus,
            availability,
            search,
            includeDeactivated
        } = req.query;

        const isBloodBank = req.user.role === "blood_bank";

        let filter = {};

        if (isBloodBank) {
            // A Blood Bank may view and manage ONLY its own inventory
            filter.hospitalId = String(req.user._id);

            if (includeDeactivated !== "true") {
                filter.isActive = true;
            }

            if (screeningStatus && SCREENING_STATUSES.includes(screeningStatus)) {
                filter.screeningStatus = screeningStatus;
            }

            if (verificationStatus && VERIFICATION_STATUSES.includes(verificationStatus)) {
                filter.verificationStatus = verificationStatus;
            }

            if (availability === "available") {
                filter.status = "Available";
                filter.units = { $gt: 0 };
                filter.expiryDate = { $gt: new Date() };
                filter.screeningStatus = "Approved";
                filter.verificationStatus = "Verified";
            } else if (availability === "quarantined") {
                filter.$or = [
                    { status: "Quarantined" },
                    { screeningStatus: { $ne: "Approved" } },
                    { verificationStatus: { $ne: "Verified" } }
                ];
            } else if (availability === "expired") {
                filter.expiryDate = { $lte: new Date() };
            } else if (availability === "low") {
                filter.units = { $gt: 0, $lt: 10 };
            }
        } else {
            // Hospitals see only active, non-expired, tested, verified stock
            const now = new Date();
            filter = {
                facilityType: "bloodbank",
                isActive: true,
                status: "Available",
                units: { $gt: 0 },
                expiryDate: { $gt: now },
                screeningStatus: "Approved",
                verificationStatus: "Verified"
            };
        }

        if (bloodGroup && BLOOD_GROUPS.includes(bloodGroup)) {
            filter.bloodGroup = bloodGroup;
        }

        if (componentType) {
            filter.componentType = normalizeComponent(componentType);
        }

        if (search && typeof search === "string" && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { bagId: regex },
                { storageLocation: regex },
                { city: regex },
                { facilityName: regex }
            ];
        }

        const records = await Inventory.find(filter)
            .sort({ expiryDate: 1, createdAt: -1 })
            .limit(500)
            .lean();

        // Attach dynamic virtual calculations
        const now = new Date();
        const recordsWithComputed = records.map((r) => {
            const daysLeft = r.expiryDate ? Math.ceil((new Date(r.expiryDate) - now) / (1000 * 3600 * 24)) : 0;
            const isExpired = daysLeft <= 0;
            const isSafe = r.screeningStatus === "Approved" && r.verificationStatus === "Verified";
            const isEligible = r.isActive && !isExpired && isSafe && Number(r.units) > 0 && r.status === "Available";

            return {
                ...r,
                daysLeft,
                isExpired,
                isEligible
            };
        });

        return res.json({
            success: true,
            count: recordsWithComputed.length,
            data: recordsWithComputed
        });
    } catch (error) {
        console.error("Inventory list error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load inventory records" });
    }
});

/**
 * GET or POST /api/inventory/search-nearby
 * Hospital searches nearby blood banks based on location coordinates, required blood group, component, units, and radius.
 */
async function handleNearbySearch(req, res) {
    try {
        const params = req.method === "POST" ? req.body : req.query;
        let {
            bloodGroup,
            componentType,
            units,
            radius
        } = params || {};

        if (!BLOOD_GROUPS.includes(bloodGroup)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)."
            });
        }

        const normalizedComp = normalizeComponent(componentType);
        const requiredUnits = Number(units);
        if (!Number.isInteger(requiredUnits) || requiredUnits < 1) {
            return res.status(400).json({
                success: false,
                message: "Required units must be a positive whole number (minimum 1)."
            });
        }

        const radiusKm = Number(radius) > 0 ? Math.min(Number(radius), 1000) : 50;

        const hospitalCoordinates = req.user.location?.coordinates;
        const hasHospitalCoordinates = Array.isArray(hospitalCoordinates) &&
            hospitalCoordinates.length === 2 &&
            hospitalCoordinates.every(Number.isFinite) &&
            hospitalCoordinates[0] >= -180 && hospitalCoordinates[0] <= 180 &&
            hospitalCoordinates[1] >= -90 && hospitalCoordinates[1] <= 90;
        const hospLon = hasHospitalCoordinates ? hospitalCoordinates[0] : null;
        const hospLat = hasHospitalCoordinates ? hospitalCoordinates[1] : null;

        if (!hasHospitalCoordinates) {
            return res.status(400).json({
                success: false,
                locationRequired: true,
                message: "Saved hospital coordinates are required to calculate distance. Update your facility location first."
            });
        }

        // Determine compatible donor groups according to medical component rules
        const compatibleGroups = getCompatibleDonorGroups(bloodGroup, normalizedComp);

        // Find active, eligible stock from registered blood banks
        const now = new Date();
        const eligibleStock = await Inventory.find({
            facilityType: "bloodbank",
            isActive: true,
            status: "Available",
            units: { $gt: 0 },
            expiryDate: { $gt: now },
            screeningStatus: "Approved",
            verificationStatus: "Verified",
            componentType: normalizedComp,
            bloodGroup: { $in: compatibleGroups }
        }).sort({ expiryDate: 1 }).lean();

        // Get unique blood bank IDs
        const bankIds = [...new Set(eligibleStock.map((s) => s.hospitalId).filter(Boolean))];

        // Fetch user records of blood banks to get real coordinates and facility details
        const bloodBankUsers = await User.find({
            $or: [
                { _id: { $in: bankIds.filter((id) => mongoose.isValidObjectId(id)) } },
                { role: "blood_bank" }
            ]
        }).select("name email facility address city state pinCode phone location").lean();

        const userMap = {};
        for (const u of bloodBankUsers) {
            userMap[String(u._id)] = u;
        }

        // Group inventory by blood bank facility
        const bankMap = {};

        for (const stock of eligibleStock) {
            const bankId = stock.hospitalId;
            const userProfile = userMap[bankId] || {};

            const bankCoordinates = userProfile.location?.coordinates;
            if (!Array.isArray(bankCoordinates) ||
                bankCoordinates.length !== 2 ||
                !bankCoordinates.every(Number.isFinite) ||
                bankCoordinates[0] < -180 || bankCoordinates[0] > 180 ||
                bankCoordinates[1] < -90 || bankCoordinates[1] > 90) {
                continue;
            }
            const bankLon = bankCoordinates[0];
            const bankLat = bankCoordinates[1];

            // Calculate distance
            const distance = calculateDistanceKm(hospLat, hospLon, bankLat, bankLon);

            if (distance === null || distance > radiusKm) {
                continue;
            }

            if (!bankMap[bankId]) {
                bankMap[bankId] = {
                    bloodBankId: bankId,
                    facilityName: stock.facilityName || userProfile.facility || userProfile.name || "Regional Blood Centre",
                    distanceKm: distance,
                    address: stock.facilityAddress || userProfile.address || "",
                    city: stock.city || userProfile.city || "",
                    state: stock.state || userProfile.state || "",
                    pinCode: stock.pinCode || userProfile.pinCode || "",
                    contactPhone: stock.contactPhone || userProfile.phone || "",
                    contactEmail: stock.contactEmail || userProfile.email || "",
                    coordinates: [bankLon, bankLat],
                    requestedGroup: bloodGroup,
                    requestedComponent: normalizedComp,
                    totalAvailableUnits: 0,
                    batches: [],
                    earliestExpiry: stock.expiryDate,
                    lastStockUpdate: stock.updatedAt || stock.createdAt,
                    hasIdenticalMatch: false,
                    transfusionConfirmationRequired: false,
                    compatibilityNotices: new Set()
                };
            }

            const bank = bankMap[bankId];
            bank.totalAvailableUnits += stock.units;

            const compatEval = evaluateCompatibility(bloodGroup, stock.bloodGroup, normalizedComp);

            if (stock.bloodGroup === bloodGroup) {
                bank.hasIdenticalMatch = true;
            }
            if (compatEval.confirmationRequired) {
                bank.transfusionConfirmationRequired = true;
            }
            if (compatEval.message) {
                bank.compatibilityNotices.add(compatEval.message);
            }

            if (new Date(stock.expiryDate) < new Date(bank.earliestExpiry)) {
                bank.earliestExpiry = stock.expiryDate;
            }

            if (stock.updatedAt && new Date(stock.updatedAt) > new Date(bank.lastStockUpdate)) {
                bank.lastStockUpdate = stock.updatedAt;
            }

            bank.batches.push({
                inventoryId: stock._id,
                bagId: stock.bagId,
                bloodGroup: stock.bloodGroup,
                units: stock.units,
                expiryDate: stock.expiryDate,
                storageLocation: stock.storageLocation,
                compatibilityBadge: compatEval.badge,
                confirmationRequired: compatEval.confirmationRequired
            });
        }

        // Only show blood banks that have sufficient units (>= requiredUnits)
        const nearbyBloodBanks = Object.values(bankMap)
            .filter((bank) => bank.totalAvailableUnits >= requiredUnits)
            .map((bank) => ({
                ...bank,
                compatibilityNotices: Array.from(bank.compatibilityNotices)
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm); // Nearest first!

        return res.json({
            success: true,
            hospitalLocation: { latitude: hospLat, longitude: hospLon },
            searchCriteria: {
                bloodGroup,
                componentType: normalizedComp,
                requiredUnits,
                radiusKm
            },
            count: nearbyBloodBanks.length,
            data: nearbyBloodBanks
        });
    } catch (error) {
        console.error("Nearby blood search error:", error.message);
        return res.status(500).json({ success: false, message: "Could not execute nearby blood search" });
    }
}

router.get("/search-nearby", handleNearbySearch);
router.post("/search-nearby", handleNearbySearch);

/**
 * POST /api/inventory
 * Blood Bank adds new blood stock.
 * Validates unique bagId, positive units, collection/expiry dates, screening status.
 * Derives ownership from authenticated token.
 */
router.post("/", requireRole("blood_bank"), async (req, res) => {
    try {
        const {
            bloodGroup,
            componentType,
            units,
            bagId,
            collectionDate,
            expiryDate,
            screeningStatus,
            verificationStatus,
            storageLocation,
            facilityAddress,
            city,
            state,
            pinCode,
            contactPhone,
            contactEmail,
            latitude,
            longitude,
            notes
        } = req.body || {};

        if (!BLOOD_GROUPS.includes(bloodGroup)) {
            return res.status(400).json({ success: false, message: "Select a valid blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)" });
        }

        const normalizedComp = normalizeComponent(componentType);
        if (!COMPONENT_TYPES.includes(normalizedComp)) {
            return res.status(400).json({ success: false, message: "Select a valid blood component" });
        }

        const numUnits = Number(units);
        if (!Number.isInteger(numUnits) || numUnits < 1) {
            return res.status(400).json({ success: false, message: "Units must be a positive whole number (minimum 1)" });
        }

        if (typeof bagId !== "string" || !bagId.trim()) {
            return res.status(400).json({ success: false, message: "Unique Blood Bag / Unit ID is required" });
        }
        const cleanBagId = bagId.trim().toUpperCase();

        if (!collectionDate || Number.isNaN(Date.parse(collectionDate))) {
            return res.status(400).json({ success: false, message: "Provide a valid collection/donation date" });
        }
        const collDate = new Date(collectionDate);

        if (!expiryDate || Number.isNaN(Date.parse(expiryDate))) {
            return res.status(400).json({ success: false, message: "Provide a valid expiry date" });
        }
        const expDate = new Date(expiryDate);

        if (expDate <= collDate) {
            return res.status(400).json({ success: false, message: "Expiry date must be after collection date" });
        }

        const cleanScreening = SCREENING_STATUSES.includes(screeningStatus) ? screeningStatus : "Approved";
        const cleanVerification = VERIFICATION_STATUSES.includes(verificationStatus) ? verificationStatus : "Verified";

        // Check bag ID uniqueness
        const existingBag = await Inventory.findOne({ bagId: cleanBagId });
        if (existingBag) {
            return res.status(409).json({
                success: false,
                message: `Blood Bag ID "${cleanBagId}" is already registered in the system. Each blood unit must have a unique ID.`
            });
        }

        // Resolve facility location
        let coordinates = undefined;
        if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
            coordinates = [Number(longitude), Number(latitude)];
        } else if (req.user.location && Array.isArray(req.user.location.coordinates) && req.user.location.coordinates.length === 2) {
            coordinates = req.user.location.coordinates;
        }

        // Untested stock is marked as Quarantined, not safe or available for transfusion
        const isSafe = cleanScreening === "Approved" && cleanVerification === "Verified";
        const stockStatus = isSafe ? "Available" : "Quarantined";

        const newRecord = await Inventory.create({
            hospitalId: String(req.user._id),
            facilityId: req.user._id,
            facilityName: req.user.facility || req.user.name,
            facilityType: "bloodbank",
            bloodGroup,
            componentType: normalizedComp,
            units: numUnits,
            bagId: cleanBagId,
            collectionDate: collDate,
            expiryDate: expDate,
            screeningStatus: cleanScreening,
            verificationStatus: cleanVerification,
            storageLocation: typeof storageLocation === "string" && storageLocation.trim() ? storageLocation.trim() : "Main Cold Bay",
            facilityAddress: typeof facilityAddress === "string" ? facilityAddress.trim() : req.user.address || "",
            city: typeof city === "string" ? city.trim() : req.user.city || "",
            state: typeof state === "string" ? state.trim() : req.user.state || "",
            pinCode: typeof pinCode === "string" ? pinCode.trim() : req.user.pinCode || "",
            contactPhone: typeof contactPhone === "string" ? contactPhone.trim() : req.user.phone || "",
            contactEmail: typeof contactEmail === "string" ? contactEmail.trim() : req.user.email || "",
            location: coordinates ? { type: "Point", coordinates } : undefined,
            status: stockStatus,
            isActive: true,
            notes: typeof notes === "string" ? notes.trim() : ""
        });

        return res.status(201).json({
            success: true,
            message: `Blood unit ${cleanBagId} (${numUnits} units of ${bloodGroup} ${normalizedComp}) saved successfully.`,
            data: newRecord
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "Duplicate bag ID detected. Bag IDs must be unique." });
        }
        console.error("Inventory creation error:", error.message);
        return res.status(500).json({ success: false, message: "Could not create inventory record" });
    }
});

/**
 * PUT /api/inventory/:id
 * Blood Bank edits existing inventory details.
 * Ensures item belongs to the authenticated Blood Bank.
 */
router.put("/:id", requireRole("blood_bank"), async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid inventory ID" });
        }

        const existingRecord = await Inventory.findOne({
            _id: id,
            hospitalId: String(req.user._id)
        });

        if (!existingRecord) {
            return res.status(404).json({ success: false, message: "Inventory record not found in your blood bank" });
        }

        const {
            bloodGroup,
            componentType,
            units,
            bagId,
            collectionDate,
            expiryDate,
            screeningStatus,
            verificationStatus,
            storageLocation,
            facilityAddress,
            city,
            state,
            pinCode,
            contactPhone,
            contactEmail,
            latitude,
            longitude,
            status,
            notes
        } = req.body || {};

        if (bloodGroup) {
            if (!BLOOD_GROUPS.includes(bloodGroup)) {
                return res.status(400).json({ success: false, message: "Invalid blood group" });
            }
            existingRecord.bloodGroup = bloodGroup;
        }

        if (componentType) {
            existingRecord.componentType = normalizeComponent(componentType);
        }

        if (units !== undefined) {
            const numUnits = Number(units);
            if (!Number.isInteger(numUnits) || numUnits < 0) {
                return res.status(400).json({ success: false, message: "Units must be a non-negative whole number" });
            }
            existingRecord.units = numUnits;
        }

        if (bagId && typeof bagId === "string") {
            const cleanBagId = bagId.trim().toUpperCase();
            if (cleanBagId !== existingRecord.bagId) {
                const duplicate = await Inventory.findOne({ bagId: cleanBagId, _id: { $ne: id } });
                if (duplicate) {
                    return res.status(409).json({ success: false, message: `Bag ID "${cleanBagId}" is already used by another record.` });
                }
                existingRecord.bagId = cleanBagId;
            }
        }

        if (collectionDate && !Number.isNaN(Date.parse(collectionDate))) {
            existingRecord.collectionDate = new Date(collectionDate);
        }

        if (expiryDate && !Number.isNaN(Date.parse(expiryDate))) {
            existingRecord.expiryDate = new Date(expiryDate);
        }

        if (existingRecord.expiryDate <= existingRecord.collectionDate) {
            return res.status(400).json({ success: false, message: "Expiry date must be after collection date" });
        }

        if (screeningStatus && SCREENING_STATUSES.includes(screeningStatus)) {
            existingRecord.screeningStatus = screeningStatus;
        }

        if (verificationStatus && VERIFICATION_STATUSES.includes(verificationStatus)) {
            existingRecord.verificationStatus = verificationStatus;
        }

        if (typeof storageLocation === "string") existingRecord.storageLocation = storageLocation.trim();
        if (typeof facilityAddress === "string") existingRecord.facilityAddress = facilityAddress.trim();
        if (typeof city === "string") existingRecord.city = city.trim();
        if (typeof state === "string") existingRecord.state = state.trim();
        if (typeof pinCode === "string") existingRecord.pinCode = pinCode.trim();
        if (typeof contactPhone === "string") existingRecord.contactPhone = contactPhone.trim();
        if (typeof contactEmail === "string") existingRecord.contactEmail = contactEmail.trim();
        if (typeof notes === "string") existingRecord.notes = notes.trim();

        if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
            existingRecord.location = {
                type: "Point",
                coordinates: [Number(longitude), Number(latitude)]
            };
        }

        // Revalidate safety
        const isSafe = existingRecord.screeningStatus === "Approved" && existingRecord.verificationStatus === "Verified";
        if (!isSafe) {
            existingRecord.status = "Quarantined";
        } else if (status && ["Available", "Quarantined", "Reserved", "Dispatched", "Deactivated", "Expired"].includes(status)) {
            existingRecord.status = status;
        }

        await existingRecord.save();

        return res.json({
            success: true,
            message: "Inventory record updated successfully",
            data: existingRecord
        });
    } catch (error) {
        console.error("Inventory update error:", error.message);
        return res.status(500).json({ success: false, message: "Could not update inventory record" });
    }
});

/**
 * PATCH /api/inventory/:id/quantity
 * Quick update quantity. Ensures item belongs to authenticated blood bank and units >= 0.
 */
router.patch("/:id/quantity", requireRole("blood_bank"), async (req, res) => {
    try {
        const { id } = req.params;
        const { units, delta } = req.body || {};

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid inventory ID" });
        }

        const item = await Inventory.findOne({
            _id: id,
            hospitalId: String(req.user._id)
        });

        if (!item) {
            return res.status(404).json({ success: false, message: "Inventory record not found in your blood bank" });
        }

        let newUnits = item.units;
        if (units !== undefined) {
            const parsed = Number(units);
            if (!Number.isInteger(parsed) || parsed < 0) {
                return res.status(400).json({ success: false, message: "Units must be a non-negative whole number" });
            }
            newUnits = parsed;
        } else if (delta !== undefined) {
            const parsedDelta = Number(delta);
            if (!Number.isInteger(parsedDelta)) {
                return res.status(400).json({ success: false, message: "Quantity delta must be an integer" });
            }
            newUnits = item.units + parsedDelta;
            if (newUnits < 0) {
                return res.status(400).json({ success: false, message: "Quantity cannot be reduced below zero" });
            }
        } else {
            return res.status(400).json({ success: false, message: "Provide units or delta to update quantity" });
        }

        item.units = newUnits;
        await item.save();

        return res.json({
            success: true,
            message: `Updated quantity to ${newUnits} units.`,
            data: item
        });
    } catch (error) {
        console.error("Quantity update error:", error.message);
        return res.status(500).json({ success: false, message: "Could not update quantity" });
    }
});

/**
 * DELETE /api/inventory/:id or PATCH /api/inventory/:id/deactivate
 * Deactivate/remove stock record. Ensures ownership.
 */
router.delete("/:id", requireRole("blood_bank"), async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid inventory ID" });
        }

        const item = await Inventory.findOne({
            _id: id,
            hospitalId: String(req.user._id)
        });

        if (!item) {
            return res.status(404).json({ success: false, message: "Inventory record not found in your blood bank" });
        }

        // Soft delete/deactivate so auditing is preserved
        item.isActive = false;
        item.status = "Deactivated";
        await item.save();

        return res.json({
            success: true,
            message: `Stock record ${item.bagId || id} deactivated successfully.`,
            data: item
        });
    } catch (error) {
        console.error("Inventory deactivate error:", error.message);
        return res.status(500).json({ success: false, message: "Could not deactivate inventory record" });
    }
});

module.exports = router;
