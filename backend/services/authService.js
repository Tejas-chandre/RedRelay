
const API_URL = "http://localhost:5000/api/auth";
const TOKEN_KEY = "redrelay_access_token";

export function getAuthToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}

export async function registerUser(formData) {
    let response;

    try {
        response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
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

    if (!response.ok) {
        if (response.status >= 500) {
            throw new Error("The registration service is temporarily unavailable. Please try again shortly.");
        }

        throw new Error(result.message || "Registration failed");
    }

    return result;
}

export async function loginUser(formData) {
    let response;

    try {
        response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
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

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Email, password, or selected account role is incorrect.");
        }

        if (response.status >= 500) {
            throw new Error("The login service is temporarily unavailable. Please try again shortly.");
        }

        throw new Error(result.message || "Unable to sign in. Check the submitted details and try again.");
    }

    if (typeof result.token !== "string" || !result.token) {
        throw new Error("The login response did not include an authenticated session. Please contact support.");
    }

    sessionStorage.setItem(TOKEN_KEY, result.token);

    return result;
}
