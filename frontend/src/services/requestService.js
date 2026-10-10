import { apiRequest, authenticatedOptions } from "./apiClient";

export async function getBloodRequests(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const result = await apiRequest(`/requests${query}`, authenticatedOptions());
    if (!Array.isArray(result.data)) {
        throw new Error("The request service returned an invalid request list.");
    }
    return result.data;
}

export async function createBloodRequest(payload) {
    return apiRequest("/requests", authenticatedOptions({
        method: "POST",
        body: JSON.stringify(payload),
    }));
}

export async function decideBloodRequest(requestId, decision) {
    return apiRequest(`/requests/${encodeURIComponent(requestId)}/decision`, authenticatedOptions({
        method: "PATCH",
        body: JSON.stringify({ decision }),
    }));
}

export async function dispatchBloodRequest(requestId) {
    return apiRequest(`/requests/${encodeURIComponent(requestId)}/dispatch`, authenticatedOptions({
        method: "PATCH",
    }));
}

export async function deliverBloodRequest(requestId) {
    return apiRequest(`/requests/${encodeURIComponent(requestId)}/deliver`, authenticatedOptions({
        method: "PATCH",
    }));
}

export async function runOptimization(payload) {
    return apiRequest("/requests/optimize", authenticatedOptions({
        method: "POST",
        body: JSON.stringify(payload),
    }));
}

export async function confirmManifest(payload) {
    return apiRequest("/requests/confirm-manifest", authenticatedOptions({
        method: "POST",
        body: JSON.stringify(payload),
    }));
}
