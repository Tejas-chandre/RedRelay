import { apiRequest, authenticatedOptions } from "./apiClient";

const TOKEN_KEY = "redrelay_access_token";

export function getAuthToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}

export async function registerUser(formData) {
    return apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(formData),
    });
}

export async function loginUser(formData) {
    const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
    });

    if (typeof result.token !== "string" || !result.token) {
        throw new Error("The login response did not include an authenticated session. Please contact support.");
    }

    sessionStorage.setItem(TOKEN_KEY, result.token);
    return result;
}

export async function getProfile() {
    return apiRequest("/auth/me", authenticatedOptions());
}

export async function updateProfile(data) {
    return apiRequest("/auth/profile", authenticatedOptions({
        method: "PUT",
        body: JSON.stringify(data),
    }));
}
