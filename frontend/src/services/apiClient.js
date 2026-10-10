export const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

export async function apiRequest(path, options = {}) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...options.headers,
            },
        });
    } catch {
        throw new Error("Cannot reach the RedRelay API. Check that the backend is running and try again.");
    }

    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("The RedRelay API returned an invalid response. Please try again.");
    }

    if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("The RedRelay API returned an invalid response. Please try again.");
    }

    if (!response.ok || result.success === false) {
        throw new Error(result.message || `RedRelay API request failed: ${response.status}`);
    }

    return result;
}

export function authenticatedOptions(options = {}) {
    const token = sessionStorage.getItem("redrelay_access_token");
    if (!token) {
        throw new Error("Your session is missing or expired. Please sign in again.");
    }

    return {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    };
}
