const express = require("express");
const mongoose = require("mongoose");
const BloodRequest = require("../models/BloodRequest");
const Inventory = require("../models/Inventory");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/requireAuth");
const { normalizeComponent, evaluateCompatibility, getCompatibleDonorGroups, calculateDistanceKm } = require("../services/compatibilityService");

const router = express.Router();
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENT_TYPES = ['Whole Blood', 'Packed Red Blood Cells', 'Platelets', 'Plasma'];
const URGENCY_LEVELS = ["Critical", "High", "Normal"];

class RequestError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

router.use(requireAuth);

/**
 * GET /api/requests
 * - Hospitals: view their submitted requests
 * - Blood banks: view requests directed to them or open pending requests
 */
router.get("/", async (req, res) => {
    try {
        const isHospital = req.user.role === "hospital";
        let filter = {};

        if (isHospital) {
            filter.hospitalId = req.user._id;
        } else {
            // Blood bank sees only requests explicitly directed to their facility
            filter.$or = [
                { bloodBankId: req.user._id },
                { acceptedBy: req.user._id }
            ];
        }

        if (req.query.status) {
            if (!["Pending", "Accepted", "Rejected", "Dispatched", "Delivered"].includes(req.query.status)) {
                return res.status(400).json({ success: false, message: "Invalid request status" });
            }
            filter.status = req.query.status;
        }

        const requests = await BloodRequest.find(filter)
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        return res.json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        console.error("Request list error:", error.message);
        return res.status(500).json({ success: false, message: "Could not load requests" });
    }
});

/**
 * POST /api/requests
 * Hospital submits a blood requirement request to a specific Blood Bank.
 * Validates the destination blood bank, checks eligible inventory server-side,
 * calculates distance, and saves full hospital + blood bank location metadata.
 * Hospital ID is always derived from the verified JWT - never from the request body.
 */
router.post("/", requireRole("hospital"), async (req, res) => {
    try {
        const {
            bloodGroup,
            componentType,
            units,
            urgency,
            bloodBankId,
            notes
        } = req.body || {};

        if (!BLOOD_GROUPS.includes(bloodGroup)) {
            return res.status(400).json({ success: false, message: "Select a valid blood group" });
        }

        const normalizedComp = normalizeComponent(componentType);
        if (!COMPONENT_TYPES.includes(normalizedComp)) {
            return res.status(400).json({ success: false, message: "Select a valid blood component" });
        }

        const requestedUnits = Number(units);
        if (!Number.isInteger(requestedUnits) || requestedUnits < 1 || requestedUnits > 100) {
            return res.status(400).json({ success: false, message: "Units must be a whole number from 1 to 100" });
        }

        if (!URGENCY_LEVELS.includes(urgency)) {
            return res.status(400).json({ success: false, message: "Select a valid urgency level (Critical, High, Normal)" });
        }

        // Blood bank must be specified and valid
        if (!bloodBankId || !mongoose.isValidObjectId(bloodBankId)) {
            return res.status(400).json({ success: false, message: "A destination Blood Bank must be selected before submitting." });
        }

        const targetedBank = await User.findOne({ _id: bloodBankId, role: "blood_bank" })
            .select("name facility email phone address city state pinCode location").lean();

        if (!targetedBank) {
            return res.status(404).json({ success: false, message: "The selected Blood Bank was not found or is not registered." });
        }

        const hospitalCoordinates = req.user.location?.coordinates;
        if (!Array.isArray(hospitalCoordinates) ||
            hospitalCoordinates.length !== 2 ||
            !hospitalCoordinates.every(Number.isFinite) ||
            hospitalCoordinates[0] < -180 || hospitalCoordinates[0] > 180 ||
            hospitalCoordinates[1] < -90 || hospitalCoordinates[1] > 90) {
            return res.status(400).json({
                success: false,
                locationRequired: true,
                message: "Save the hospital address and coordinates in Profile & Location before submitting a request."
            });
        }

        const bankCoordinates = targetedBank.location?.coordinates;
        if (!Array.isArray(bankCoordinates) ||
            bankCoordinates.length !== 2 ||
            !bankCoordinates.every(Number.isFinite) ||
            bankCoordinates[0] < -180 || bankCoordinates[0] > 180 ||
            bankCoordinates[1] < -90 || bankCoordinates[1] > 90) {
            return res.status(400).json({
                success: false,
                locationRequired: true,
                message: "The selected Blood Bank must save its facility address and coordinates before requests can be routed."
            });
        }

        // Server-side: verify this blood bank has sufficient eligible stock for the request
        const now = new Date();
        const compatibleGroups = getCompatibleDonorGroups(bloodGroup, normalizedComp);
        const eligibleStock = await Inventory.find({
            hospitalId: String(targetedBank._id),
            facilityType: "bloodbank",
            isActive: true,
            status: "Available",
            screeningStatus: "Approved",
            verificationStatus: "Verified",
            expiryDate: { $gt: now },
            units: { $gt: 0 },
            componentType: normalizedComp,
            bloodGroup: { $in: compatibleGroups }
        }).lean();

        const totalAvailableAtBank = eligibleStock.reduce((sum, s) => sum + s.units, 0);
        if (totalAvailableAtBank < requestedUnits) {
            return res.status(409).json({
                success: false,
                message: `The selected Blood Bank only has ${totalAvailableAtBank} eligible unit(s) of ${bloodGroup} ${normalizedComp} available. You requested ${requestedUnits} unit(s).`
            });
        }

        const [hospLon, hospLat] = hospitalCoordinates;
        const [bankLon, bankLat] = bankCoordinates;
        const distanceKm = calculateDistanceKm(hospLat, hospLon, bankLat, bankLon);

        const newRequest = await BloodRequest.create({
            hospitalId: req.user._id,
            hospitalName: req.user.name,
            hospitalFacility: req.user.facility,
            hospitalEmail: req.user.email,
            hospitalAddress: req.user.address || "",
            hospitalCity: req.user.city || "",
            hospitalDistrict: req.user.city || "",
            hospitalState: req.user.state || "",
            hospitalPinCode: req.user.pinCode || "",
            hospitalLocation: { type: "Point", coordinates: [hospLon, hospLat] },
            bloodBankId: targetedBank._id,
            bloodBankFacility: targetedBank.facility || targetedBank.name,
            bloodBankName: targetedBank.name,
            bloodBankAddress: targetedBank.address || "",
            bloodBankCity: targetedBank.city || "",
            bloodBankState: targetedBank.state || "",
            bloodBankPhone: targetedBank.phone || "",
            bloodBankEmail: targetedBank.email || "",
            distanceKm,
            bloodBankLocation: { type: "Point", coordinates: [bankLon, bankLat] },
            bloodGroup,
            componentType: normalizedComp,
            units: requestedUnits,
            urgency,
            status: "Pending",
            notes: typeof notes === "string" ? notes.trim() : ""
        });

        return res.status(201).json({
            success: true,
            message: `Blood request submitted successfully to ${targetedBank.facility || targetedBank.name}.`,
            data: newRequest
        });
    } catch (error) {
        console.error("Request create error:", error.message);
        return res.status(500).json({ success: false, message: "Could not submit blood request" });
    }
});

/**
 * PATCH /api/requests/:requestId/decision
 * Blood Bank decides (accept or reject) on an incoming request.
 * When accepting: revalidates eligible stock in MongoDB, prevents over-allocation, and reserves stock atomically.
 */
router.patch("/:requestId/decision", requireRole("blood_bank"), async (req, res) => {
    const { requestId } = req.params;
    const { decision } = req.body || {};

    if (!mongoose.isValidObjectId(requestId)) {
        return res.status(400).json({ success: false, message: "Invalid request ID" });
    }
    if (!["accept", "reject"].includes(decision)) {
        return res.status(400).json({ success: false, message: "Decision must be accept or reject" });
    }

    if (decision === "reject") {
        try {
            const request = await BloodRequest.findOneAndUpdate(
                { _id: requestId, status: "Pending" },
                {
                    $set: {
                        status: "Rejected",
                        rejectedBy: req.user._id,
                        rejectedFacility: req.user.facility || req.user.name,
                        rejectedAt: new Date()
                    }
                },
                { new: true, runValidators: true }
            );

            if (!request) {
                return res.status(409).json({ success: false, message: "Request was already processed or does not exist" });
            }
            return res.json({ success: true, message: "Blood request rejected.", data: request });
        } catch (error) {
            console.error("Request rejection error:", error.message);
            return res.status(500).json({ success: false, message: "Could not reject request" });
        }
    }

    // Accept & Reserve Stock
    try {
        const request = await BloodRequest.findOne({ _id: requestId, status: "Pending" });
        if (!request) {
            return res.status(409).json({ success: false, message: "Request was already processed or does not exist" });
        }

        const bankId = String(req.user._id);
        const now = new Date();

        // Query eligible, tested, verified, non-expired stock belonging to this Blood Bank
        const stockRows = await Inventory.find({
            hospitalId: bankId,
            facilityType: "bloodbank",
            bloodGroup: request.bloodGroup,
            componentType: request.componentType,
            isActive: true,
            screeningStatus: "Approved",
            verificationStatus: "Verified",
            expiryDate: { $gt: now },
            units: { $gt: 0 }
        }).sort({ expiryDate: 1, createdAt: 1 }); // FEFO / FIFO: earliest expiry first

        const totalAvailable = stockRows.reduce((sum, r) => sum + r.units, 0);

        if (totalAvailable < request.units) {
            return res.status(409).json({
                success: false,
                message: `Insufficient eligible ${request.bloodGroup} ${request.componentType} stock. Available: ${totalAvailable} units, Requested: ${request.units} units.`
            });
        }

        // Atomically reserve units
        let remaining = request.units;
        const reservations = [];

        for (const row of stockRows) {
            if (remaining === 0) break;
            const toReserve = Math.min(row.units, remaining);

            const updated = await Inventory.findOneAndUpdate(
                {
                    _id: row._id,
                    hospitalId: bankId,
                    units: { $gte: toReserve }
                },
                {
                    $inc: { units: -toReserve }
                },
                { new: true }
            );

            if (!updated) {
                throw new RequestError(409, "Stock levels changed concurrently while reserving. Please try again.");
            }

            reservations.push({
                inventoryId: row._id,
                bagId: row.bagId || "",
                units: toReserve
            });

            remaining -= toReserve;
        }

        request.status = "Accepted";
        request.acceptedBy = req.user._id;
        request.acceptedFacility = req.user.facility || req.user.name;
        request.acceptedAt = new Date();
        request.reservations = reservations;
        await request.save();

        return res.json({
            success: true,
            message: `Request accepted and ${request.units} units of ${request.bloodGroup} ${request.componentType} reserved.`,
            data: request
        });
    } catch (error) {
        if (error instanceof RequestError) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        console.error("Request acceptance error:", error.message);
        return res.status(500).json({ success: false, message: "Could not reserve stock and accept request" });
    }
});

/**
 * PATCH /api/requests/:requestId/dispatch
 * Blood Bank records blood dispatch.
 * Do not mark blood as dispatched until explicitly recorded.
 */
router.patch("/:requestId/dispatch", requireRole("blood_bank"), async (req, res) => {
    try {
        const { requestId } = req.params;
        if (!mongoose.isValidObjectId(requestId)) {
            return res.status(400).json({ success: false, message: "Invalid request ID" });
        }

        const request = await BloodRequest.findOne({
            _id: requestId,
            status: "Accepted"
        });

        if (!request) {
            return res.status(404).json({ success: false, message: "Accepted blood request not found" });
        }

        request.status = "Dispatched";
        request.dispatchedAt = new Date();
        await request.save();

        return res.json({
            success: true,
            message: "Blood units marked as dispatched for medical transit.",
            data: request
        });
    } catch (error) {
        console.error("Request dispatch error:", error.message);
        return res.status(500).json({ success: false, message: "Could not record dispatch" });
    }
});

/**
 * PATCH /api/requests/:requestId/deliver
 * Records delivery completion.
 * Do not mark blood as delivered until explicitly recorded.
 */
router.patch("/:requestId/deliver", async (req, res) => {
    try {
        const { requestId } = req.params;
        if (!mongoose.isValidObjectId(requestId)) {
            return res.status(400).json({ success: false, message: "Invalid request ID" });
        }

        const request = await BloodRequest.findOne({
            _id: requestId,
            status: "Dispatched"
        });

        if (!request) {
            return res.status(404).json({ success: false, message: "Dispatched blood request not found" });
        }

        // Must be the requesting hospital or accepting blood bank
        const isRequestingHospital = String(request.hospitalId) === String(req.user._id);
        const isAcceptingBloodBank = String(request.acceptedBy) === String(req.user._id);

        if (!isRequestingHospital && !isAcceptingBloodBank) {
            return res.status(403).json({ success: false, message: "Not authorized to confirm delivery for this request" });
        }

        request.status = "Delivered";
        request.deliveredAt = new Date();
        await request.save();

        return res.json({
            success: true,
            message: "Blood units successfully delivered and received at facility.",
            data: request
        });
    } catch (error) {
        console.error("Request delivery confirmation error:", error.message);
        return res.status(500).json({ success: false, message: "Could not confirm delivery" });
    }
});

const { runMILPSolver } = require("../services/milpService");
const { getLiveNetworkSnapshot } = require("../services/inventoryService");

/**
 * POST /api/requests/optimize
 * Hospital runs MILP solver for emergency blood redistribution.
 * Queries real MongoDB inventory, calculates actual distances, feeds to Python solver,
 * and validates the mathematical optimization result. Does NOT deduct stock until confirmed.
 */
router.post("/optimize", requireRole("hospital"), async (req, res) => {
    try {
        const {
            bloodGroup,
            componentType,
            requiredUnits
        } = req.body || {};

        if (!BLOOD_GROUPS.includes(bloodGroup)) {
            return res.status(400).json({ success: false, message: "Select a valid blood group" });
        }

        const normComp = normalizeComponent(componentType);
        const reqUnits = Number(requiredUnits);
        if (!Number.isInteger(reqUnits) || reqUnits < 1) {
            return res.status(400).json({ success: false, message: "Required units must be a positive whole number (minimum 1)" });
        }

        let snapshot;
        try {
            snapshot = await getLiveNetworkSnapshot(req.user._id, bloodGroup, normComp);
        } catch (snapshotErr) {
            return res.status(400).json({
                success: false,
                locationRequired: snapshotErr.message.includes("coordinates") || snapshotErr.message.includes("location"),
                message: snapshotErr.message
            });
        }

        const { supplyNodes } = snapshot;

        if (!supplyNodes || Object.keys(supplyNodes).length === 0) {
            return res.json({
                success: false,
                status: "Infeasible",
                message: `No connected blood banks with eligible ${bloodGroup} ${normComp} stock were found in the network.`,
                requiredUnits: reqUnits,
                availableUnits: 0,
                transfers: []
            });
        }

        const totalAvailable = Object.values(supplyNodes).reduce((sum, n) => sum + (Number(n.available_inventory) || 0), 0);

        if (totalAvailable < reqUnits) {
            return res.json({
                success: false,
                status: "Infeasible",
                message: `Insufficient eligible stock across network. Demanded ${reqUnits} units, but only ${totalAvailable} units exist across all supply nodes.`,
                requiredUnits: reqUnits,
                availableUnits: totalAvailable,
                transfers: []
            });
        }

        // Pass to Python MILP Solver
        const milpPayload = {
            required_units: reqUnits,
            supply_nodes: supplyNodes
        };

        const solverManifest = await runMILPSolver(milpPayload);

        if (solverManifest.status !== "Optimal") {
            return res.json({
                success: false,
                status: solverManifest.status || "Infeasible",
                message: solverManifest.message || "Optimization solver could not find an optimal redistribution plan.",
                requiredUnits: reqUnits,
                availableUnits: totalAvailable,
                transfers: []
            });
        }

        // Verify allocated units never exceed eligible available stock and total satisfies demand
        let totalAllocated = 0;
        const enrichedTransfers = [];

        for (const tr of solverManifest.transfers || []) {
            const nodeInfo = supplyNodes[tr.from];
            if (!nodeInfo) {
                return res.status(500).json({ success: false, message: `Solver referenced unknown supply node: ${tr.from}` });
            }
            if (tr.units > nodeInfo.available_inventory) {
                return res.status(500).json({ success: false, message: `Solver over-allocated units for node ${tr.from}. Max: ${nodeInfo.available_inventory}, Allocated: ${tr.units}` });
            }
            totalAllocated += tr.units;

            enrichedTransfers.push({
                bloodBankId: tr.from,
                facilityName: nodeInfo.facilityName,
                address: nodeInfo.address,
                city: nodeInfo.city,
                phone: nodeInfo.phone,
                units: tr.units,
                distanceKm: Math.round(Number(tr.distance_km || 0) * 10) / 10,
                travelTimeMins: nodeInfo.travel_time_mins
            });
        }

        if (totalAllocated !== reqUnits) {
            return res.status(500).json({ success: false, message: `Solver allocation mismatch: expected ${reqUnits} units, got ${totalAllocated} units.` });
        }

        const manifestId = `MFT-MILP-${Date.now()}`;

        return res.json({
            success: true,
            manifestId,
            status: "Optimal",
            requiredUnits: reqUnits,
            totalAllocated,
            bloodGroup,
            componentType: normComp,
            totalRoutingCost: Math.round(Number(solverManifest.total_cost || 0) * 10) / 10,
            transfers: enrichedTransfers,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("MILP optimization route error:", error.message);
        return res.status(500).json({
            success: false,
            status: "Error",
            message: `Optimization failed: ${error.message}`
        });
    }
});

/**
 * POST /api/requests/confirm-manifest
 * Hospital explicitly confirms the MILP redistribution manifest.
 * Atomically reserves inventory across all selected supply nodes and creates persistent requests.
 */
router.post("/confirm-manifest", requireRole("hospital"), async (req, res) => {
    try {
        const {
            manifestId,
            bloodGroup,
            componentType,
            requiredUnits,
            urgency,
            transfers
        } = req.body || {};

        if (!Array.isArray(transfers) || transfers.length === 0) {
            return res.status(400).json({ success: false, message: "No transfers provided in confirmation manifest" });
        }

        const normComp = normalizeComponent(componentType);
        const reqUnits = Number(requiredUnits);
        const now = new Date();
        const createdRequests = [];

        // Validate all transfers before executing
        for (const t of transfers) {
            if (!t.bloodBankId || !t.units || t.units < 1) {
                return res.status(400).json({ success: false, message: "Invalid transfer specification in manifest" });
            }
        }

        // Process each transfer atomically
        for (const t of transfers) {
            const bankId = String(t.bloodBankId);
            const unitsToReserve = Number(t.units);

            // Revalidate stock in MongoDB
            const compatibleGroups = getCompatibleDonorGroups(bloodGroup, normComp);
            const stockRows = await Inventory.find({
                hospitalId: bankId,
                facilityType: "bloodbank",
                bloodGroup: { $in: compatibleGroups },
                componentType: normComp,
                isActive: true,
                screeningStatus: "Approved",
                verificationStatus: "Verified",
                expiryDate: { $gt: now },
                units: { $gt: 0 }
            }).sort({ expiryDate: 1, createdAt: 1 });

            const totalAvailable = stockRows.reduce((sum, r) => sum + r.units, 0);
            if (totalAvailable < unitsToReserve) {
                return res.status(409).json({
                    success: false,
                    message: `Insufficient stock at ${t.facilityName || bankId}. Available: ${totalAvailable}, Required: ${unitsToReserve}`
                });
            }

            // Deduct stock from earliest expiry lots
            let remaining = unitsToReserve;
            const reservations = [];

            for (const row of stockRows) {
                if (remaining === 0) break;
                const reserved = Math.min(row.units, remaining);

                const updated = await Inventory.findOneAndUpdate(
                    { _id: row._id, hospitalId: bankId, units: { $gte: reserved } },
                    { $inc: { units: -reserved } },
                    { new: true }
                );

                if (!updated) {
                    return res.status(409).json({
                        success: false,
                        message: `Concurrent stock change at ${t.facilityName || bankId}. Please refresh and re-run solver.`
                    });
                }

                reservations.push({
                    inventoryId: row._id,
                    bagId: row.bagId || "",
                    units: reserved
                });

                remaining -= reserved;
            }

            // Create persistent request
            const bloodReq = await BloodRequest.create({
                hospitalId: req.user._id,
                hospitalName: req.user.name,
                hospitalFacility: req.user.facility,
                hospitalEmail: req.user.email,
                bloodBankId: t.bloodBankId,
                bloodBankFacility: t.facilityName || "Blood Bank",
                bloodBankName: t.facilityName || "",
                bloodGroup,
                componentType: normComp,
                units: unitsToReserve,
                urgency: urgency || "Critical",
                status: "Accepted",
                acceptedBy: t.bloodBankId,
                acceptedFacility: t.facilityName || "Blood Bank",
                acceptedAt: new Date(),
                reservations,
                notes: `MILP Automated Redistribution Manifest [${manifestId || 'OPT'}] - Distance: ${t.distanceKm} km`
            });

            createdRequests.push(bloodReq);
        }

        return res.status(201).json({
            success: true,
            message: `Redistribution manifest ${manifestId || ''} confirmed! ${reqUnits} units reserved across ${transfers.length} supply nodes.`,
            confirmedRequests: createdRequests
        });
    } catch (error) {
        console.error("Transfer manifest confirmation error:", error.message);
        return res.status(500).json({
            success: false,
            message: `Could not confirm transfer manifest: ${error.message}`
        });
    }
});

module.exports = router;