import { useState } from "react";
import { hasValidCoordinates } from "../utils/facilityLocation";

const LOCATION_FIELDS = [
    { key: "address", label: "Full facility address", type: "text", autoComplete: "street-address" },
    { key: "city", label: "District / City", type: "text", autoComplete: "address-level2" },
    { key: "state", label: "State", type: "text", autoComplete: "address-level1" },
    { key: "pinCode", label: "PIN code", type: "text", autoComplete: "postal-code" },
    { key: "phone", label: "Contact number", type: "tel", autoComplete: "tel" },
];

export function FacilityLocationFields({
    idPrefix,
    value,
    onChange,
    confirmed,
    onConfirmChange,
    variant = "signup",
}) {
    const [locationMessage, setLocationMessage] = useState("");
    const [locating, setLocating] = useState(false);

    function updateField(field, fieldValue) {
        onChange(field, fieldValue);
        onConfirmChange(false);
    }

    function useMyLocation() {
        setLocationMessage("");
        if (!window.isSecureContext &&
            !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
            setLocationMessage("Location access requires HTTPS or localhost. Enter the facility coordinates manually.");
            return;
        }
        if (!navigator.geolocation) {
            setLocationMessage("This browser does not support location access. Enter the facility coordinates manually.");
            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                if (!hasValidCoordinates(latitude, longitude)) {
                    setLocationMessage("The device returned invalid coordinates. Enter the facility coordinates manually.");
                    setLocating(false);
                    return;
                }

                onChange("latitude", latitude.toFixed(6));
                onChange("longitude", longitude.toFixed(6));
                onConfirmChange(false);
                setLocationMessage(
                    `GPS fix received (about ±${Math.round(position.coords.accuracy)} m). Confirm the facility pin and enter or verify the address below.`
                );
                setLocating(false);
            },
            (error) => {
                const message = error.code === error.PERMISSION_DENIED
                    ? "Location permission was denied. Allow access in browser settings or enter the facility coordinates manually."
                    : error.code === error.POSITION_UNAVAILABLE
                        ? "The device could not determine a location. Try again or enter the facility coordinates manually."
                        : error.code === error.TIMEOUT
                            ? "Location request timed out. Try again or enter the facility coordinates manually."
                            : "Could not get the device location. Enter the facility coordinates manually.";
                setLocationMessage(message);
                setLocating(false);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
    }

    return (
        <section className={`facility-location-fields facility-location-${variant}`} aria-labelledby={`${idPrefix}-location-heading`}>
            <div className="facility-location-heading">
                <div>
                    <h3 id={`${idPrefix}-location-heading`}>Facility address &amp; location</h3>
                    <p>Enter the facility’s real address and confirm its map pin.</p>
                </div>
                <button type="button" className="facility-gps-button" onClick={useMyLocation} disabled={locating}>
                    {locating ? "Finding location…" : "Use My Location"}
                </button>
            </div>

            <div className="facility-location-grid">
                {LOCATION_FIELDS.map((field) => (
                    <div className="auth-field-group" key={field.key}>
                        <label className="auth-field-label" htmlFor={`${idPrefix}-${field.key}`}>
                            {field.label} <span className="auth-required">*</span>
                        </label>
                        <input
                            id={`${idPrefix}-${field.key}`}
                            className="auth-input"
                            type={field.type}
                            autoComplete={field.autoComplete}
                            value={value[field.key] || ""}
                            onChange={(event) => updateField(field.key, event.target.value)}
                            required
                        />
                    </div>
                ))}
            </div>

            <div className="facility-location-grid">
                <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor={`${idPrefix}-latitude`}>
                        Latitude <span className="auth-required">*</span>
                    </label>
                    <input
                        id={`${idPrefix}-latitude`}
                        className="auth-input"
                        type="number"
                        min="-90"
                        max="90"
                        step="any"
                        value={value.latitude || ""}
                        onChange={(event) => updateField("latitude", event.target.value)}
                        required
                    />
                </div>
                <div className="auth-field-group">
                    <label className="auth-field-label" htmlFor={`${idPrefix}-longitude`}>
                        Longitude <span className="auth-required">*</span>
                    </label>
                    <input
                        id={`${idPrefix}-longitude`}
                        className="auth-input"
                        type="number"
                        min="-180"
                        max="180"
                        step="any"
                        value={value.longitude || ""}
                        onChange={(event) => updateField("longitude", event.target.value)}
                        required
                    />
                </div>
            </div>

            {locationMessage && <p className="facility-location-message" role="status">{locationMessage}</p>}
            <label className="facility-location-confirm">
                <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => onConfirmChange(event.target.checked)}
                    required
                />
                <span>I confirm this pin and address identify this facility.</span>
            </label>
        </section>
    );
}
