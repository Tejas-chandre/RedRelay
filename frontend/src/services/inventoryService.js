import { apiRequest, authenticatedOptions } from "./apiClient";

export async function getInventory(filters = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value);
        }
    });

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const result = await apiRequest(`/inventory${queryString}`, authenticatedOptions());
    if (!Array.isArray(result.data)) {
        throw new Error("The inventory service returned an invalid inventory list.");
    }
    return result.data;
}

export async function addInventoryRecord(payload) {
    return apiRequest("/inventory", authenticatedOptions({
        method: "POST",
        body: JSON.stringify(payload),
    }));
}

export async function updateInventoryRecord(id, payload) {
    return apiRequest(`/inventory/${encodeURIComponent(id)}`, authenticatedOptions({
        method: "PUT",
        body: JSON.stringify(payload),
    }));
}

export async function updateInventoryQuantity(id, units) {
    return apiRequest(`/inventory/${encodeURIComponent(id)}/quantity`, authenticatedOptions({
        method: "PATCH",
        body: JSON.stringify({ units }),
    }));
}

export async function deactivateInventoryRecord(id) {
    return apiRequest(`/inventory/${encodeURIComponent(id)}`, authenticatedOptions({
        method: "DELETE",
    }));
}

export async function searchNearbyBlood(params) {
    return apiRequest("/inventory/search-nearby", authenticatedOptions({
        method: "POST",
        body: JSON.stringify(params),
    }));
}
