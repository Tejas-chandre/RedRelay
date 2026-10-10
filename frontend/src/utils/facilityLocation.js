export function hasValidCoordinates(latitude, longitude) {
    if (latitude === undefined || latitude === null || String(latitude).trim() === "" ||
        longitude === undefined || longitude === null || String(longitude).trim() === "") return false;
    const lat = Number(latitude);
    const lon = Number(longitude);
    return Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
        Number.isFinite(lon) && lon >= -180 && lon <= 180;
}
