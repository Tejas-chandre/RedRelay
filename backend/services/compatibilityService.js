/**
 * Blood Component Compatibility Rules & Geolocation Distance Calculations
 * 
 * In transfusion medicine:
 * - Whole Blood: requires identical match (has both RBC & plasma antibodies)
 * - Packed Red Blood Cells (PRBC): recipient can receive compatible RBCs. O- is universal RBC donor.
 * - Plasma: compatibility is inverse of RBC. Universal plasma donor is AB.
 * - Platelets: ABO identical preferred. Cross-group requires transfusion service confirmation.
 */

// RBC compatibility: recipient -> array of compatible donor groups
const RBC_COMPATIBILITY = {
    "O-": ["O-"],
    "O+": ["O+", "O-"],
    "A-": ["A-", "O-"],
    "A+": ["A+", "A-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "AB-": ["AB-", "A-", "B-", "O-"],
    "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"]
};

// Whole Blood compatibility: Identical ABO/Rh matching mandatory
const WHOLE_BLOOD_COMPATIBILITY = {
    "O-": ["O-"],
    "O+": ["O+"],
    "A-": ["A-"],
    "A+": ["A+"],
    "B-": ["B-"],
    "B+": ["B+"],
    "AB-": ["AB-"],
    "AB+": ["AB+"]
};

// Plasma compatibility: Universal plasma donor is AB (contains no anti-A or anti-B)
const PLASMA_COMPATIBILITY = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+", "A-", "AB-"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+", "B-", "AB-"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+", "AB-"]
};

// Platelets compatibility: Identical preferred, compatible alternative requires confirmation
const PLATELET_COMPATIBILITY = {
    "O-": ["O-", "O+", "A-", "B-", "AB-"],
    "O+": ["O+", "O-", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "O-", "AB-"],
    "A+": ["A+", "A-", "O+", "AB+"],
    "B-": ["B-", "B+", "O-", "AB-"],
    "B+": ["B+", "B-", "O+", "AB+"],
    "AB-": ["AB-", "AB+", "A-", "B-", "O-"],
    "AB+": ["AB+", "AB-", "A+", "B+", "O+"]
};

function normalizeComponent(component) {
    if (!component || typeof component !== 'string') return 'Whole Blood';
    const c = component.trim();
    if (/packed|prbc|red/i.test(c)) return 'Packed Red Blood Cells';
    if (/platelet/i.test(c)) return 'Platelets';
    if (/plasma/i.test(c)) return 'Plasma';
    return 'Whole Blood';
}

function getCompatibleDonorGroups(recipientGroup, componentType) {
    const comp = normalizeComponent(componentType);
    if (comp === 'Packed Red Blood Cells') {
        return RBC_COMPATIBILITY[recipientGroup] || [recipientGroup];
    }
    if (comp === 'Plasma') {
        return PLASMA_COMPATIBILITY[recipientGroup] || [recipientGroup];
    }
    if (comp === 'Platelets') {
        return PLATELET_COMPATIBILITY[recipientGroup] || [recipientGroup];
    }
    return WHOLE_BLOOD_COMPATIBILITY[recipientGroup] || [recipientGroup];
}

function evaluateCompatibility(recipientGroup, donorGroup, componentType) {
    const comp = normalizeComponent(componentType);
    const compatibleGroups = getCompatibleDonorGroups(recipientGroup, comp);
    const isCompatible = compatibleGroups.includes(donorGroup);
    const isIdentical = recipientGroup === donorGroup;

    if (!isCompatible) {
        return {
            compatible: false,
            identical: false,
            confirmationRequired: true,
            badge: "Incompatible",
            message: `${donorGroup} is immunologically incompatible with ${recipientGroup} for ${comp}.`
        };
    }

    if (isIdentical) {
        return {
            compatible: true,
            identical: true,
            confirmationRequired: false,
            badge: "Identical Match",
            message: `Identical ${recipientGroup} match for ${comp}. Standard pre-transfusion crossmatch.`
        };
    }

    return {
        compatible: true,
        identical: false,
        confirmationRequired: true,
        badge: "Alternative Compatible",
        message: `Alternative compatible donor group (${donorGroup} for ${recipientGroup} ${comp}). Transfusion-service verification and antibody confirmation mandatory.`
    };
}

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number|null} distance in km (rounded to 1 decimal place)
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const nLat1 = Number(lat1);
    const nLon1 = Number(lon1);
    const nLat2 = Number(lat2);
    const nLon2 = Number(lon2);

    if (!Number.isFinite(nLat1) || !Number.isFinite(nLon1) || !Number.isFinite(nLat2) || !Number.isFinite(nLon2)) {
        return null;
    }

    const R = 6371; // Earth's mean radius in km
    const dLat = (nLat2 - nLat1) * (Math.PI / 180);
    const dLon = (nLon2 - nLon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(nLat1 * (Math.PI / 180)) * Math.cos(nLat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Math.round(dist * 10) / 10;
}

module.exports = {
    normalizeComponent,
    getCompatibleDonorGroups,
    evaluateCompatibility,
    calculateDistanceKm
};
