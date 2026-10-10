const Inventory = require('../models/Inventory');
const User = require('../models/User');
const { calculateDistanceKm, normalizeComponent, getCompatibleDonorGroups } = require('./compatibilityService');

/**
 * Approximate travel time (mins) based on distance (km).
 * Average emergency transport speed of 50 km/h.
 */
function calculateTravelTimeMins(distanceKm) {
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 10;
    const travelTimeMins = Math.round((distanceKm / 50) * 60);
    return Math.max(travelTimeMins, 5);
}

/**
 * Builds live supply nodes payload from MongoDB for the MILP Solver.
 * 
 * @param {string|ObjectId} hospitalId - Requesting hospital user ID
 * @param {string} bloodGroup - Required blood group (e.g. "O-")
 * @param {string} componentType - Component type (e.g. "Whole Blood")
 * @returns {Promise<{ supplyNodes: Object, disasterCoords: Array<number>, hospital: Object }>}
 */
async function getLiveNetworkSnapshot(hospitalId, bloodGroup, componentType) {
    const disasterHospital = await User.findById(hospitalId).select("name facility location address city phone").lean();
    if (!disasterHospital) {
        throw new Error("Requesting hospital user not found");
    }

    const disasterCoords = disasterHospital.location?.coordinates;

    if (!Array.isArray(disasterCoords) ||
        disasterCoords.length !== 2 ||
        !disasterCoords.every(Number.isFinite) ||
        disasterCoords[0] < -180 || disasterCoords[0] > 180 ||
        disasterCoords[1] < -90 || disasterCoords[1] > 90) {
        throw new Error("Hospital coordinates are required to calculate distance for the MILP optimizer. Please configure your location.");
    }

    const [hospLon, hospLat] = disasterCoords;
    const normComp = normalizeComponent(componentType);
    const compatibleGroups = getCompatibleDonorGroups(bloodGroup, normComp);
    const now = new Date();

    // Query active, non-expired, verified stock in MongoDB across the network
    const eligibleStock = await Inventory.find({
        facilityType: "bloodbank",
        isActive: true,
        status: "Available",
        units: { $gt: 0 },
        expiryDate: { $gt: now },
        screeningStatus: "Approved",
        verificationStatus: "Verified",
        bloodGroup: { $in: compatibleGroups },
        componentType: normComp,
        hospitalId: { $ne: String(hospitalId) }
    }).sort({ expiryDate: 1 }).lean();

    const bankIds = [...new Set(eligibleStock.map(item => item.hospitalId))];
    const supplyHospitals = await User.find({
        $or: [
            { _id: { $in: bankIds.filter(id => id.match(/^[0-9a-fA-F]{24}$/)) } },
            { role: "blood_bank" }
        ]
    }).select("name facility address city state phone email location").lean();

    const userMap = {};
    supplyHospitals.forEach(u => {
        userMap[String(u._id)] = u;
    });

    const supplyNodes = {};

    for (const item of eligibleStock) {
        const bankIdStr = item.hospitalId.toString();
        const userProfile = userMap[bankIdStr] || {};

        let bankLat = null;
        let bankLon = null;

        const bankCoordinates = userProfile.location?.coordinates;
        if (Array.isArray(bankCoordinates) &&
            bankCoordinates.length === 2 &&
            bankCoordinates.every(Number.isFinite) &&
            bankCoordinates[0] >= -180 && bankCoordinates[0] <= 180 &&
            bankCoordinates[1] >= -90 && bankCoordinates[1] <= 90) {
            bankLon = bankCoordinates[0];
            bankLat = bankCoordinates[1];
        }

        if (bankLat === null || bankLon === null) {
            // Cannot accurately route if supplier has no coordinates
            continue;
        }

        const distanceKm = calculateDistanceKm(hospLat, hospLon, bankLat, bankLon);
        if (distanceKm === null) continue;

        if (!supplyNodes[bankIdStr]) {
            supplyNodes[bankIdStr] = {
                available_inventory: item.units,
                distance_km: distanceKm,
                travel_time_mins: calculateTravelTimeMins(distanceKm),
                spoilage_risk_score: item.spoilageRiskScore || 2,
                facilityName: item.facilityName || userProfile.facility || userProfile.name || "Blood Bank",
                address: item.facilityAddress || userProfile.address || "",
                city: item.city || userProfile.city || "",
                phone: item.contactPhone || userProfile.phone || "",
                email: item.contactEmail || userProfile.email || "",
                bloodGroup: item.bloodGroup,
                componentType: item.componentType
            };
        } else {
            supplyNodes[bankIdStr].available_inventory += item.units;
            supplyNodes[bankIdStr].spoilage_risk_score = Math.max(
                supplyNodes[bankIdStr].spoilage_risk_score,
                item.spoilageRiskScore || 2
            );
        }
    }

    return {
        supplyNodes,
        disasterCoords,
        hospital: disasterHospital
    };
}

module.exports = {
    getLiveNetworkSnapshot,
    calculateTravelTimeMins
};