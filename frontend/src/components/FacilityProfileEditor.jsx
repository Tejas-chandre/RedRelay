import { useState } from "react";
import { updateProfile } from "../services/authService";
import { FacilityLocationFields } from "./FacilityLocationFields";
import { hasValidCoordinates } from "../utils/facilityLocation";

function profileValues(user) {
    const coordinates = user?.location?.coordinates;
    return {
        address: user?.address || "",
        city: user?.city || "",
        state: user?.state || "",
        pinCode: user?.pinCode || "",
        phone: user?.phone || "",
        latitude: Array.isArray(coordinates) && coordinates.length === 2 ? String(coordinates[1]) : "",
        longitude: Array.isArray(coordinates) && coordinates.length === 2 ? String(coordinates[0]) : "",
    };
}

export default function FacilityProfileEditor({ currentUser, onSaved, variant = "dashboard" }) {
    const [values, setValues] = useState(() => profileValues(currentUser));
    const [confirmed, setConfirmed] = useState(Boolean(currentUser?.location?.coordinates));
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    function updateField(field, value) {
        setValues((previous) => ({ ...previous, [field]: value }));
    }

    async function saveProfile(event) {
        event.preventDefault();
        setError("");
        setMessage("");

        for (const [field, label] of [
            ["address", "Full facility address"],
            ["city", "District / City"],
            ["state", "State"],
            ["pinCode", "PIN code"],
            ["phone", "Contact number"],
        ]) {
            if (!values[field].trim()) {
                setError(`${label} is required.`);
                return;
            }
        }
        if (!hasValidCoordinates(values.latitude, values.longitude)) {
            setError("Enter valid latitude and longitude for the facility.");
            return;
        }
        if (!confirmed) {
            setError("Confirm that the pin and address identify this facility.");
            return;
        }

        setSaving(true);
        try {
            const result = await updateProfile({
                address: values.address.trim(),
                city: values.city.trim(),
                state: values.state.trim(),
                pinCode: values.pinCode.trim(),
                phone: values.phone.trim(),
                latitude: Number(values.latitude),
                longitude: Number(values.longitude),
            });
            setValues(profileValues(result.user));
            setConfirmed(true);
            onSaved?.(result.user);
            setMessage("Facility address and location saved.");
        } catch (saveError) {
            setError(saveError.message || "Could not save facility location.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form className="facility-profile-editor" onSubmit={saveProfile}>
            <FacilityLocationFields
                idPrefix="profile"
                value={values}
                onChange={updateField}
                confirmed={confirmed}
                onConfirmChange={setConfirmed}
                variant={variant}
            />
            {error && <p className="facility-location-error" role="alert">{error}</p>}
            {message && <p className="facility-location-success" role="status">{message}</p>}
            <button className={variant === "hospital" ? "rr-button rr-button-primary" : "bb-button bb-button-primary"} type="submit" disabled={saving}>
                {saving ? "Saving facility details…" : "Save Address & Location"}
            </button>
        </form>
    );
}
