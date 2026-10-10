import { getAuthToken } from "./authService";

const API_URL = "http://localhost:5000/api/requests";

async function requestApi(path = "", options = {}) {
    const token = getAuthToken();
    if (!token) {
        throw new Error("Your session is missing or expired. Please sign in again.");
    }

    let response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers
            }
        });
    } catch {
        throw new Error("Cannot reach the request service. Check that the backend is running.");
    }

    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("The request service returned an invalid response.");
    }

    if (!response.ok || !result.success) {
        throw new Error(result.message || `Request service failed: ${response.status}`);
    }

    return result;
}

export async function getBloodRequests(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const result = await requestApi(query);
    return Array.isArray(result.data) ? result.data : [];
}

export async function createBloodRequest(payload) {
    return requestApi("", { method: "POST", body: JSON.stringify(payload) });
}

export async function decideBloodRequest(requestId, decision) {
    return requestApi(`/${encodeURIComponent(requestId)}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ decision })
    });
}