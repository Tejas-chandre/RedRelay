import { useEffect, useMemo, useRef, useState } from "react";
import { getInventory, searchNearbyBlood } from "../services/inventoryService";
import {
    createBloodRequest,
    getBloodRequests,
    deliverBloodRequest,
    runOptimization,
    confirmManifest
} from "../services/requestService";
import FacilityProfileEditor from "../components/FacilityProfileEditor";
import "./HospitalDashboard.css";

const BLOOD_GROUPS = [
    "A+", "A-", "B+", "B-",
    "AB+", "AB-", "O+", "O-",
];

const COMPONENT_TYPES = [
    "Whole Blood",
    "Packed Red Blood Cells",
    "Platelets",
    "Plasma",
];

const NAV_ITEMS = [
    { id: "dashboard", icon: "⌂", label: "Overview" },
    { id: "optimizer", icon: "⚡", label: "MILP Mesh Optimizer" },
    { id: "nearby", icon: "🔍", label: "Search Blood Nearby" },
    { id: "inventory", icon: "◉", label: "Blood Inventory" },
    { id: "request", icon: "+", label: "My Blood Requests" },
    { id: "network", icon: "⌖", label: "Connected Depots" },
    { id: "profile", icon: "○", label: "Profile & Location" },
];

function displayValue(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default function HospitalDashboard({ currentUser, onLogout, onProfileUpdated }) {
    const [activePage, setActivePage] = useState("dashboard");

    // Inventory states
    const [inventory, setInventory] = useState([]);
    const [inventoryState, setInventoryState] = useState("loading");
    const [refreshing, setRefreshing] = useState(false);
    const [inventoryError, setInventoryError] = useState("");
    const [search, setSearch] = useState("");

    // Requests states
    const [requests, setRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [requestsError, setRequestsError] = useState("");
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [requestActionBusy, setRequestActionBusy] = useState("");

    // Standard Request Form states
    const [bloodGroup, setBloodGroup] = useState("O+");
    const [componentType, setComponentType] = useState("Whole Blood");
    const [units, setUnits] = useState("2");
    const [urgency, setUrgency] = useState("High");
    const [selectedTargetBank, setSelectedTargetBank] = useState(null);
    const [requestMessage, setRequestMessage] = useState("");
    const [feedback, setFeedback] = useState("");
    // Request form - hospital location fields
    const [reqHospState, setReqHospState] = useState("");
    const [reqHospDistrict, setReqHospDistrict] = useState("");
    const [reqHospCity, setReqHospCity] = useState("");
    const [reqHospPinCode, setReqHospPinCode] = useState("");
    const [reqHospAddress, setReqHospAddress] = useState("");
    const [reqHospLat, setReqHospLat] = useState("");
    const [reqHospLon, setReqHospLon] = useState("");
    const [reqSearchRadius, setReqSearchRadius] = useState("100");
    const [reqLocationNotice, setReqLocationNotice] = useState("");
    // Request form - eligible bank search
    const [reqBankSearching, setReqBankSearching] = useState(false);
    const [reqEligibleBanks, setReqEligibleBanks] = useState(null); // null = not searched yet
    const [reqBankSearchError, setReqBankSearchError] = useState("");

    // Nearby Search states
    const [searchGroup, setSearchGroup] = useState("O+");
    const [searchComponent, setSearchComponent] = useState("Whole Blood");
    const [searchUnits, setSearchUnits] = useState("2");
    const [searchRadius, setSearchRadius] = useState("50");
    const [hospitalLat, setHospitalLat] = useState("");
    const [hospitalLon, setHospitalLon] = useState("");
    const [nearbySearching, setNearbySearching] = useState(false);
    const [nearbyResults, setNearbyResults] = useState(null);
    const [nearbyError, setNearbyError] = useState("");
    const [locationNotice, setLocationNotice] = useState("");

    // MILP Optimizer states
    const [optGroup, setOptGroup] = useState("O+");
    const [optComponent, setOptComponent] = useState("Whole Blood");
    const [optUnits, setOptUnits] = useState("10");
    const [optRunning, setOptRunning] = useState(false);
    const [optManifest, setOptManifest] = useState(null);
    const [optError, setOptError] = useState("");
    const [confirmingManifest, setConfirmingManifest] = useState(false);
    const [manifestSuccess, setManifestSuccess] = useState("");

    // Profile Dropdown
    const [profileOpen, setProfileOpen] = useState(false);
    const profileMenuRef = useRef(null);

    const hospitalName = displayValue(
        currentUser?.facility,
        displayValue(currentUser?.name, "Your Hospital")
    );
    const accountName = displayValue(currentUser?.name, "Hospital User");
    const accountEmail = displayValue(currentUser?.email, "Email not provided");

    // Initialize hospital location coordinates from currentUser profile
    useEffect(() => {
        if (currentUser?.location?.coordinates && currentUser.location.coordinates.length === 2) {
            setHospitalLon(String(currentUser.location.coordinates[0]));
            setHospitalLat(String(currentUser.location.coordinates[1]));
        }
    }, [currentUser]);

    async function loadInventory() {
        setRefreshing(true);
        setInventoryError("");
        try {
            const data = await getInventory();
            setInventory(Array.isArray(data) ? data : []);
            setInventoryState("ready");
        } catch (err) {
            setInventoryError(err.message || "Could not load blood inventory.");
            setInventoryState("error");
        } finally {
            setRefreshing(false);
        }
    }

    async function loadRequests() {
        setRequestsLoading(true);
        setRequestsError("");
        try {
            const data = await getBloodRequests();
            setRequests(Array.isArray(data) ? data : []);
        } catch (requestError) {
            setRequestsError(requestError.message || "Could not load blood requests.");
        } finally {
            setRequestsLoading(false);
        }
    }

    useEffect(() => {
        let isCurrent = true;
        getInventory()
            .then((data) => {
                if (isCurrent) {
                    setInventory(Array.isArray(data) ? data : []);
                    setInventoryState("ready");
                }
            })
            .catch((err) => {
                if (isCurrent) {
                    setInventoryError(err.message || "Could not load blood inventory.");
                    setInventoryState("error");
                }
            });

        getBloodRequests()
            .then((data) => {
                if (isCurrent) setRequests(Array.isArray(data) ? data : []);
            })
            .catch((requestError) => {
                if (isCurrent) setRequestsError(requestError.message || "Could not load blood requests.");
            })
            .finally(() => {
                if (isCurrent) setRequestsLoading(false);
            });

        return () => { isCurrent = false; };
    }, []);

    useEffect(() => {
        function closeOnOutsideClick(event) {
            if (!profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
        }
        function closeOnEscape(event) {
            if (event.key === "Escape") setProfileOpen(false);
        }
        document.addEventListener("pointerdown", closeOnOutsideClick);
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    // Detect browser GPS
    function detectHospitalLocation() {
        setLocationNotice("Use the address and location form in Profile & Location to detect or manually enter and confirm the facility pin.");
        setActivePage("profile");
    }

    // Execute Nearby Search
    async function handleSearchNearby(e) {
        if (e) e.preventDefault();
        setNearbyError("");

        const reqUnits = Number(searchUnits);
        if (!Number.isInteger(reqUnits) || reqUnits < 1) {
            setNearbyError("Units must be a positive whole number (minimum 1).");
            return;
        }

        const radKm = Number(searchRadius);
        if (!radKm || radKm <= 0) {
            setNearbyError("Search radius must be greater than 0 km.");
            return;
        }

        if (!hospitalLat || !hospitalLon || isNaN(Number(hospitalLat)) || isNaN(Number(hospitalLon))) {
            setNearbyError("Saved hospital coordinates are required. Use GPS or enter the facility location in Profile & Location.");
            return;
        }

        setNearbySearching(true);
        try {
            const res = await searchNearbyBlood({
                bloodGroup: searchGroup,
                componentType: searchComponent,
                units: reqUnits,
                radius: radKm
            });

            setNearbyResults(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setNearbyError(err.message || "Failed to search nearby blood banks.");
            setNearbyResults(null);
        } finally {
            setNearbySearching(false);
        }
    }

    // Execute MILP Solver Optimization
    async function handleRunOptimizer(e) {
        if (e) e.preventDefault();
        setOptError("");
        setOptManifest(null);
        setManifestSuccess("");

        const reqUnits = Number(optUnits);
        if (!Number.isInteger(reqUnits) || reqUnits < 1) {
            setOptError("Required units must be a positive whole number (minimum 1).");
            return;
        }

        if (!hospitalLat || !hospitalLon || isNaN(Number(hospitalLat)) || isNaN(Number(hospitalLon))) {
            setOptError("Saved hospital coordinates are required for distance calculations. Update Profile & Location first.");
            return;
        }

        setOptRunning(true);
        try {
            const res = await runOptimization({
                bloodGroup: optGroup,
                componentType: optComponent,
                requiredUnits: reqUnits
            });

            if (res.status !== "Optimal" || !res.success) {
                setOptError(res.message || `Solver status: ${res.status}. Demand cannot be satisfied optimally.`);
                setOptManifest(res);
            } else {
                setOptManifest(res);
            }
        } catch (err) {
            setOptError(err.message || "Failed to execute MILP optimization.");
        } finally {
            setOptRunning(false);
        }
    }

    // Confirm and Execute Transfer Manifest
    async function handleConfirmManifest() {
        if (!optManifest || !Array.isArray(optManifest.transfers) || optManifest.transfers.length === 0) {
            return;
        }

        setConfirmingManifest(true);
        setOptError("");
        setManifestSuccess("");
        try {
            const res = await confirmManifest({
                manifestId: optManifest.manifestId,
                bloodGroup: optManifest.bloodGroup,
                componentType: optManifest.componentType,
                requiredUnits: optManifest.requiredUnits,
                urgency: "Critical",
                transfers: optManifest.transfers
            });

            setManifestSuccess(res.message || "Transfer manifest confirmed and stock safely reserved across supply nodes.");
            setOptManifest(null);
            await Promise.all([loadRequests(), loadInventory()]);
        } catch (err) {
            setOptError(err.message || "Could not confirm transfer manifest.");
        } finally {
            setConfirmingManifest(false);
        }
    }

    // Submit Blood Request
    async function submitRequest(event) {
        event.preventDefault();
        const requestedUnits = Number(units);
        if (!Number.isInteger(requestedUnits) || requestedUnits < 1 || requestedUnits > 100) {
            setRequestMessage("Units must be a whole number from 1 to 100.");
            return;
        }

        setSubmittingRequest(true);
        setRequestMessage("");
        setFeedback("");
        try {
            const payload = {
                bloodGroup,
                componentType,
                units: requestedUnits,
                urgency
            };

            if (selectedTargetBank) {
                payload.bloodBankId = selectedTargetBank.bloodBankId;
                payload.bloodBankFacility = selectedTargetBank.facilityName;
            }

            const res = await createBloodRequest(payload);
            setRequestMessage(res.message || "Blood request submitted successfully.");
            setSelectedTargetBank(null);
            await loadRequests();
            setActivePage("request");
        } catch (requestError) {
            setRequestMessage(requestError.message || "The blood request was not submitted.");
        } finally {
            setSubmittingRequest(false);
        }
    }

    // Request Directly from Nearby Result
    function handleRequestFromNearby(bank) {
        setSelectedTargetBank(bank);
        setBloodGroup(searchGroup);
        setComponentType(searchComponent);
        setUnits(searchUnits);
        setRequestMessage("");
        setActivePage("request");
    }

    // Confirm Blood Delivery
    async function handleConfirmDelivery(requestId) {
        setRequestActionBusy(requestId);
        try {
            await deliverBloodRequest(requestId);
            setFeedback("Delivery confirmed. Blood units marked as delivered and received at hospital.");
            await loadRequests();
        } catch (err) {
            setFeedback(err.message || "Could not confirm delivery.");
        } finally {
            setRequestActionBusy("");
        }
    }

    function handleNavigation(page) {
        setFeedback("");
        if (page === "emergency") {
            setOptGroup("O-");
            setOptComponent("Whole Blood");
            setOptUnits("6");
            setActivePage("optimizer");
            return;
        }
        setActivePage(page);
    }

    // Filtered inventory list
    const filteredInventory = useMemo(() => {
        const term = search.trim().toLowerCase();
        return inventory.filter((item) =>
            [
                item.facilityName,
                item.bloodGroup,
                item.componentType,
                item.bagId,
                item.city
            ]
                .filter(Boolean)
                .some((val) => String(val).toLowerCase().includes(term))
        );
    }, [inventory, search]);

    const totalUnits = inventory.reduce((sum, item) => sum + (Number(item.units) || 0), 0);
    const countForGroup = (group) => inventory
        .filter((item) => item.bloodGroup === group)
        .reduce((sum, item) => sum + (Number(item.units) || 0), 0);

    const pendingRequests = requests.filter((r) => r.status === "Pending");
    const acceptedRequests = requests.filter((r) => r.status === "Accepted");
    const dispatchedRequests = requests.filter((r) => r.status === "Dispatched");

    // Render MILP Smart Redistribution Optimizer Page
    function renderOptimizer() {
        return (
            <div className="rr-section-stack">
                <section className="rr-optimizer-panel">
                    <span className="rr-eyebrow">MATHEMATICAL PROGRAMMING ENGINE</span>
                    <h2>Smart Redistribution &amp; MILP Optimizer</h2>
                    <p style={{ margin: "4px 0 0", color: "var(--rr-muted)", fontSize: "12px", lineHeight: 1.5 }}>
                        Trigger the Python Mixed-Integer Linear Programming (PuLP) solver to determine the distance-optimal blood supply allocation mesh from connected blood banks.
                    </p>

                    <form onSubmit={handleRunOptimizer} style={{ marginTop: "18px" }}>
                        <div className="rr-search-controls-grid">
                            <div className="rr-control-group">
                                <label>Emergency Blood Group</label>
                                <select value={optGroup} onChange={(e) => setOptGroup(e.target.value)}>
                                    {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>

                            <div className="rr-control-group">
                                <label>Blood Component</label>
                                <select value={optComponent} onChange={(e) => setOptComponent(e.target.value)}>
                                    {COMPONENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="rr-control-group">
                                <label>Required Blood Units (Exact)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    value={optUnits}
                                    onChange={(e) => setOptUnits(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="rr-control-group">
                                <label>Destination Trauma Center</label>
                                <input type="text" value={hospitalName} readOnly disabled />
                            </div>
                        </div>

                        {/* Location confirmation */}
                        <div style={{ marginTop: "14px", padding: "12px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                            <span style={{ fontSize: "11px", color: "#334155" }}>
                                <strong>Hospital Coordinates:</strong> {hospitalLat && hospitalLon ? `${hospitalLat}, ${hospitalLon}` : "Not set"}
                            </span>
                            <button
                                type="button"
                                className="rr-button rr-button-light"
                                style={{ padding: "4px 8px", fontSize: "10px" }}
                                onClick={detectHospitalLocation}
                            >
                                📍 Detect GPS Location
                            </button>
                        </div>

                        {optError && (
                            <div className="rr-notice rr-notice-error" style={{ marginTop: "14px" }} role="alert">
                                <strong>Optimization Notice:</strong> {optError}
                            </div>
                        )}

                        {manifestSuccess && (
                            <div className="rr-notice rr-notice-success" style={{ marginTop: "14px" }} role="status">
                                <strong>Transfer Confirmed:</strong> {manifestSuccess}
                            </div>
                        )}

                        <div style={{ marginTop: "18px" }}>
                            <button
                                type="submit"
                                className="rr-button rr-button-primary"
                                disabled={optRunning}
                                style={{ minWidth: "180px" }}
                            >
                                {optRunning ? "Running Python MILP Solver…" : "⚡ Run MILP Mesh Optimizer →"}
                            </button>
                        </div>
                    </form>
                </section>

                {/* MILP Optimization Manifest Result */}
                {optManifest && optManifest.status === "Optimal" && (
                    <section className="rr-manifest-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                            <div>
                                <span className="rr-solver-badge rr-solver-optimal">✓ MILP Optimal Solution Found</span>
                                <h3 style={{ margin: "6px 0 0", fontSize: "16px" }}>Automated Redistribution Manifest: {optManifest.manifestId}</h3>
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--rr-muted)" }}>
                                Generated: {new Date(optManifest.timestamp).toLocaleTimeString()}
                            </span>
                        </div>

                        <div className="rr-manifest-metrics-grid">
                            <div className="rr-manifest-metric">
                                <span>Demanded Units</span>
                                <strong>{optManifest.requiredUnits}</strong>
                            </div>
                            <div className="rr-manifest-metric">
                                <span>Total Allocated</span>
                                <strong style={{ color: "#15803d" }}>{optManifest.totalAllocated}</strong>
                            </div>
                            <div className="rr-manifest-metric">
                                <span>Routing Cost (km × units)</span>
                                <strong>{optManifest.totalRoutingCost}</strong>
                            </div>
                            <div className="rr-manifest-metric">
                                <span>Supplying Depots</span>
                                <strong>{optManifest.transfers.length}</strong>
                            </div>
                        </div>

                        {/* Detailed Transfers Table */}
                        <div className="rr-table-wrap" style={{ marginTop: "14px" }}>
                            <table className="rr-table">
                                <thead>
                                    <tr>
                                        <th>Origin Supply Depot</th>
                                        <th>Allocated Units</th>
                                        <th>Haversine Distance</th>
                                        <th>Est. Transport Time</th>
                                        <th>Facility Location &amp; Contact</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {optManifest.transfers.map((t, idx) => (
                                        <tr key={t.bloodBankId || idx}>
                                            <td>
                                                <strong>{t.facilityName}</strong>
                                                <small style={{ display: "block", color: "var(--rr-muted)", fontSize: "10px" }}>ID: {t.bloodBankId}</small>
                                            </td>
                                            <td>
                                                <strong style={{ fontSize: "14px", color: "#15803d" }}>{t.units} units</strong>
                                                <small style={{ display: "block", color: "var(--rr-muted)", fontSize: "10px" }}>{optManifest.bloodGroup} {optManifest.componentType}</small>
                                            </td>
                                            <td>
                                                <span className="rr-dist-pill">{t.distanceKm} km</span>
                                            </td>
                                            <td>~{t.travelTimeMins} mins</td>
                                            <td>
                                                <span>{t.address ? `${t.address}, ` : ""}{t.city || ""}</span>
                                                {t.phone && <small style={{ display: "block", color: "var(--rr-muted)", fontSize: "10px" }}>📞 {t.phone}</small>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="rr-manifest-footer-note">
                            <span>
                                🛡️ <strong>Safety Lock:</strong> Blood bank inventory remains unchanged until you confirm this transfer. On confirmation, stock is reserved atomically in MongoDB.
                            </span>
                            <button
                                className="rr-button rr-button-primary"
                                disabled={confirmingManifest}
                                onClick={handleConfirmManifest}
                            >
                                {confirmingManifest ? "Reserving stock in MongoDB…" : "✓ Confirm & Dispatch Transfers →"}
                            </button>
                        </div>
                    </section>
                )}
            </div>
        );
    }

    // Render Search Nearby Blood Page
    function renderSearchNearby() {
        return (
            <div className="rr-section-stack">
                <section className="rr-search-nearby-panel">
                    <span className="rr-eyebrow">GEOSPATIAL SUPPLY MATCHING</span>
                    <h2>Search Blood Nearby</h2>
                    <p style={{ margin: "4px 0 0", color: "var(--rr-muted)", fontSize: "12px" }}>
                        Find verified, non-expired blood stock from registered blood banks ordered by calculated distance (nearest first).
                    </p>

                    <form onSubmit={handleSearchNearby} style={{ marginTop: "16px" }}>
                        <div className="rr-search-controls-grid">
                            <div className="rr-control-group">
                                <label>Required Blood Group</label>
                                <select value={searchGroup} onChange={(e) => setSearchGroup(e.target.value)}>
                                    {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>

                            <div className="rr-control-group">
                                <label>Blood Component</label>
                                <select value={searchComponent} onChange={(e) => setSearchComponent(e.target.value)}>
                                    {COMPONENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="rr-control-group">
                                <label>Required Units</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={searchUnits}
                                    onChange={(e) => setSearchUnits(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="rr-control-group">
                                <label>Search Radius (km)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="500"
                                    value={searchRadius}
                                    onChange={(e) => setSearchRadius(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Location Inputs & GPS Detection */}
                        <div style={{ marginTop: "16px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
                                <strong style={{ fontSize: "12px", color: "var(--rr-text)" }}>Hospital Coordinates (For Distance Calculation)</strong>
                                <button
                                    type="button"
                                    className="rr-button rr-button-light"
                                    style={{ padding: "5px 10px", fontSize: "11px" }}
                                    onClick={detectHospitalLocation}
                                >
                                    📍 Detect Current GPS Location
                                </button>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div className="rr-control-group">
                                    <label>Hospital Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="e.g. 20.0059"
                                        value={hospitalLat}
                                        onChange={(e) => setHospitalLat(e.target.value)}
                                        readOnly
                                        required
                                    />
                                </div>
                                <div className="rr-control-group">
                                    <label>Hospital Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="e.g. 73.7898"
                                        value={hospitalLon}
                                        onChange={(e) => setHospitalLon(e.target.value)}
                                        readOnly
                                        required
                                    />
                                </div>
                            </div>

                            {(!hospitalLat || !hospitalLon) && (
                                <p style={{ margin: "8px 0 0", color: "#c2410c", fontSize: "11px" }}>
                                    ⚠️ Saved hospital coordinates are required. Use GPS or enter them in Profile &amp; Location.
                                </p>
                            )}

                            {locationNotice && (
                                <p style={{ margin: "8px 0 0", color: "#0369a1", fontSize: "11px" }}>
                                    {locationNotice}
                                </p>
                            )}
                        </div>

                        {nearbyError && (
                            <div className="rr-notice rr-notice-error" style={{ marginTop: "14px" }} role="alert">
                                {nearbyError}
                            </div>
                        )}

                        <div style={{ marginTop: "16px" }}>
                            <button
                                type="submit"
                                className="rr-button rr-button-primary"
                                disabled={nearbySearching}
                                style={{ minWidth: "160px" }}
                            >
                                {nearbySearching ? "Calculating distances…" : "Search Nearby Blood Banks →"}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Nearby Search Results */}
                {nearbyResults && (
                    <section className="rr-panel" style={{ marginTop: "20px" }}>
                        <div className="rr-panel-heading">
                            <div>
                                <span className="rr-eyebrow">NEAREST COMPATIBLE DEPOTS</span>
                                <h3>Search Results ({nearbyResults.length} matching blood banks within {searchRadius} km)</h3>
                                <p>Ordered by calculated geographic distance (nearest first). Excludes expired, unverified, or depleted stock.</p>
                            </div>
                        </div>

                        {nearbyResults.length === 0 ? (
                            <div className="rr-empty">
                                <h3>No matching blood banks found nearby</h3>
                                <p>No registered blood banks within {searchRadius} km currently have at least {searchUnits} units of verified, non-expired {searchGroup} {searchComponent}. Try expanding the search radius.</p>
                            </div>
                        ) : (
                            <div className="rr-nearby-results-grid">
                                {nearbyResults.map((bank) => (
                                    <div className="rr-nearby-bank-card" key={bank.bloodBankId}>
                                        <div className="rr-bank-info">
                                            <div className="rr-bank-header-row">
                                                <h3>{bank.facilityName}</h3>
                                                <span className="rr-dist-pill">📍 {bank.distanceKm} km away</span>
                                                {bank.hasIdenticalMatch ? (
                                                    <span className="rr-compat-badge rr-compat-identical">✓ Identical {bank.requestedGroup} Match</span>
                                                ) : (
                                                    <span className="rr-compat-badge rr-compat-alternative">⚠️ Alternative Compatible</span>
                                                )}
                                            </div>

                                            <div className="rr-bank-contact-row">
                                                <span>{bank.address ? `${bank.address}, ` : ""}{bank.city || "City not set"}{bank.state ? `, ${bank.state}` : ""}</span>
                                                {bank.contactPhone && <span>📞 {bank.contactPhone}</span>}
                                                {bank.contactEmail && <span>✉️ {bank.contactEmail}</span>}
                                            </div>

                                            <div className="rr-stock-availability-row">
                                                <span><strong>Eligible Stock:</strong> <span style={{ color: "#15803d", fontWeight: "700" }}>{bank.totalAvailableUnits} units</span> available</span>
                                                <span><strong>Component:</strong> {bank.requestedComponent}</span>
                                                <span><strong>Earliest Lot Expiry:</strong> {new Date(bank.earliestExpiry).toLocaleDateString()}</span>
                                                <span><strong>Last Stock Sync:</strong> {new Date(bank.lastStockUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>

                                            {bank.transfusionConfirmationRequired && (
                                                <div className="rr-compat-alert">
                                                    <strong>Transfusion Service Confirmation Required:</strong> Alternative compatible donor group requires pre-transfusion crossmatch and antibody screen confirmation.
                                                </div>
                                            )}
                                        </div>

                                        <div className="rr-bank-action-side">
                                            <button
                                                className="rr-button rr-button-primary"
                                                onClick={() => handleRequestFromNearby(bank)}
                                            >
                                                Request Blood →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        );
    }

    // Render Blood Inventory Page
    function renderInventory() {
        return (
            <section className="rr-panel">
                <div className="rr-panel-heading">
                    <div>
                        <span className="rr-eyebrow">NETWORK INVENTORY</span>
                        <h2>Blood Inventory (Connected Depots)</h2>
                        <p>Live active blood stock verified across registered depots in MongoDB.</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button
                            className="rr-button rr-button-light"
                            onClick={loadInventory}
                            disabled={refreshing}
                        >
                            {refreshing ? "Refreshing…" : "↻ Refresh Inventory"}
                        </button>
                        <button
                            className="rr-button rr-button-primary"
                            onClick={() => handleNavigation("nearby")}
                        >
                            Search Nearby Blood →
                        </button>
                    </div>
                </div>

                <input
                    className="rr-search rr-table-search"
                    placeholder="Search blood group, facility, component, or city…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {inventoryError && (
                    <div className="rr-error" role="alert">
                        <span>{inventoryError}</span>
                        <button className="rr-text-button" onClick={loadInventory} disabled={refreshing}>Try again</button>
                    </div>
                )}

                {inventoryState === "loading" && <p className="rr-empty" role="status">Loading live inventory from MongoDB…</p>}

                {inventoryState !== "loading" && filteredInventory.length === 0 && (
                    <div className="rr-empty">
                        <h3>No eligible inventory records found</h3>
                        <p>{search ? "No stock matches your search filter." : "There are currently no active, verified blood stock records in the database. Blood Banks must add stock to make it available."}</p>
                    </div>
                )}

                {inventoryState !== "loading" && filteredInventory.length > 0 && (
                    <div className="rr-table-wrap">
                        <table className="rr-table">
                            <thead>
                                <tr>
                                    <th>Blood Bank / Depot</th>
                                    <th>Blood Group</th>
                                    <th>Component</th>
                                    <th>Available Units</th>
                                    <th>Expiry Date</th>
                                    <th>Location</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInventory.map((item) => (
                                    <tr key={item._id}>
                                        <td>
                                            <strong>{item.facilityName || "Blood Bank"}</strong>
                                            {item.bagId && <small style={{ display: "block", color: "var(--rr-muted)", fontSize: "10px" }}>Lot: {item.bagId}</small>}
                                        </td>
                                        <td>
                                            <span className="rr-blood-badge">{item.bloodGroup}</span>
                                        </td>
                                        <td>{item.componentType || "Whole Blood"}</td>
                                        <td><strong>{item.units}</strong> units</td>
                                        <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}</td>
                                        <td>{item.city || "—"}</td>
                                        <td>
                                            <button
                                                className="rr-text-button"
                                                onClick={() => {
                                                    setBloodGroup(item.bloodGroup);
                                                    setComponentType(item.componentType || "Whole Blood");
                                                    setActivePage("request");
                                                }}
                                            >
                                                Request
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        );
    }

    // Render Blood Request Form & Tracking Page
    function renderRequestForm() {
        return (
            <div className="rr-section-stack">
                <section className="rr-panel rr-form-panel">
                    <span className="rr-eyebrow">TRANSFUSION REQUIREMENT</span>
                    <h2>Submit Blood Request</h2>
                    <p className="rr-muted">
                        Requesting Hospital: <strong>{hospitalName}</strong>
                        {selectedTargetBank && (
                            <span style={{ marginLeft: "12px", color: "var(--rr-red)", fontWeight: "700" }}>
                                [Target Depot: {selectedTargetBank.facilityName} ({selectedTargetBank.distanceKm} km)]
                            </span>
                        )}
                    </p>

                    <form onSubmit={submitRequest} className="rr-request-form">
                        <label>
                            Blood Group
                            <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                                {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                            </select>
                        </label>

                        <label>
                            Blood Component
                            <select value={componentType} onChange={(e) => setComponentType(e.target.value)}>
                                {COMPONENT_TYPES.map((comp) => <option key={comp} value={comp}>{comp}</option>)}
                            </select>
                        </label>

                        <label>
                            Required Units
                            <input
                                type="number"
                                min="1"
                                max="100"
                                step="1"
                                required
                                value={units}
                                onChange={(e) => setUnits(e.target.value)}
                            />
                        </label>

                        <label>
                            Urgency Level
                            <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                                <option>Critical</option>
                                <option>High</option>
                                <option>Normal</option>
                            </select>
                        </label>

                        <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", alignItems: "center" }}>
                            <button className="rr-button rr-button-primary" type="submit" disabled={submittingRequest}>
                                {submittingRequest ? "Submitting to MongoDB…" : "Submit Blood Request →"}
                            </button>
                            {selectedTargetBank && (
                                <button
                                    type="button"
                                    className="rr-button rr-button-light"
                                    onClick={() => setSelectedTargetBank(null)}
                                >
                                    Clear Depot Target
                                </button>
                            )}
                        </div>
                    </form>

                    {requestMessage && (
                        <p
                            className={`rr-notice ${requestMessage.includes("successfully") ? "rr-notice-success" : "rr-notice-error"}`}
                            role="status"
                            style={{ marginTop: "14px" }}
                        >
                            {requestMessage}
                        </p>
                    )}
                </section>

                {/* My Requests Tracking Table */}
                <section className="rr-panel">
                    <div className="rr-panel-heading">
                        <div>
                            <span className="rr-eyebrow">TRACKING QUEUE</span>
                            <h2>My Blood Requests</h2>
                            <p>Live status of transfusion requests submitted by {hospitalName}.</p>
                        </div>
                        <button className="rr-button rr-button-light" onClick={loadRequests} disabled={requestsLoading}>
                            {requestsLoading ? "Refreshing…" : "↻ Refresh"}
                        </button>
                    </div>

                    {requestsLoading ? (
                        <p className="rr-empty-inline">Loading requests from MongoDB…</p>
                    ) : requestsError ? (
                        <p className="rr-error" role="alert">{requestsError}</p>
                    ) : requests.length > 0 ? (
                        <div className="rr-table-wrap">
                            <table className="rr-table">
                                <thead>
                                    <tr>
                                        <th>Targeted / Assigned Depot</th>
                                        <th>Group &amp; Component</th>
                                        <th>Units</th>
                                        <th>Urgency</th>
                                        <th>Status</th>
                                        <th>Submitted</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map((r) => (
                                        <tr key={r._id}>
                                            <td>
                                                <strong>{r.acceptedFacility || r.bloodBankFacility || "Regional Blood Centre"}</strong>
                                                <small style={{ display: "block", color: "var(--rr-muted)", fontSize: "10px" }}>ID: {r._id}</small>
                                            </td>
                                            <td>
                                                <span className="rr-blood-badge">{r.bloodGroup}</span>
                                                <small style={{ display: "block", color: "var(--rr-muted)", fontSize: "10px" }}>{r.componentType || "Whole Blood"}</small>
                                            </td>
                                            <td><strong>{r.units}</strong></td>
                                            <td>
                                                <span className={`rr-status rr-status-${(r.urgency || "normal").toLowerCase()}`}>{r.urgency}</span>
                                            </td>
                                            <td>
                                                <span className={`rr-status rr-status-${r.status.toLowerCase()}`}>
                                                    {r.status === "Pending" ? "Pending Review" : r.status === "Accepted" ? "Accepted & Reserved" : r.status === "Dispatched" ? "In Transit" : r.status}
                                                </span>
                                            </td>
                                            <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                {r.status === "Dispatched" ? (
                                                    <button
                                                        className="rr-button rr-button-primary"
                                                        style={{ padding: "4px 8px", fontSize: "10px" }}
                                                        disabled={requestActionBusy === r._id}
                                                        onClick={() => handleConfirmDelivery(r._id)}
                                                    >
                                                        {requestActionBusy === r._id ? "Confirming…" : "✓ Confirm Delivery"}
                                                    </button>
                                                ) : r.status === "Accepted" ? (
                                                    <span style={{ fontSize: "11px", color: "#15803d" }}>Stock Reserved</span>
                                                ) : r.status === "Delivered" ? (
                                                    <span style={{ fontSize: "11px", color: "#0369a1" }}>Received ✓</span>
                                                ) : (
                                                    <span style={{ fontSize: "11px", color: "var(--rr-muted)" }}>Awaiting Bank</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="rr-empty-inline">You have no submitted requests yet. Use the form above to submit a requirement.</p>
                    )}
                </section>
            </div>
        );
    }

    // Render Connected Depots Network Page
    function renderNetwork() {
        const uniqueDepots = Array.from(
            new Set(inventory.map((i) => i.facilityName).filter(Boolean))
        );

        return (
            <div className="rr-section-stack">
                <section className="rr-page-heading">
                    <div>
                        <span className="rr-eyebrow">REGIONAL NETWORK</span>
                        <h2>Connected Blood Bank Depots</h2>
                        <p>Registered depots with active blood stock telemetry in the mesh.</p>
                    </div>
                    <button className="rr-button rr-button-primary" onClick={() => handleNavigation("nearby")}>
                        Search Nearby Blood →
                    </button>
                </section>

                {uniqueDepots.length === 0 ? (
                    <section className="rr-empty rr-panel">
                        <h3>No connected depots reporting stock</h3>
                        <p>When registered blood banks add stock to MongoDB, they will appear in this directory.</p>
                    </section>
                ) : (
                    <div className="rr-bank-grid">
                        {uniqueDepots.map((depotName) => {
                            const depotItems = inventory.filter((i) => i.facilityName === depotName);
                            const totalDepotUnits = depotItems.reduce((s, i) => s + (Number(i.units) || 0), 0);
                            const groups = Array.from(new Set(depotItems.map((i) => i.bloodGroup)));

                            return (
                                <article className="rr-bank-card" key={depotName}>
                                    <div className="rr-bank-heading">
                                        <span className="rr-bank-mark">+</span>
                                        <span className="rr-distance">{totalDepotUnits} units reported</span>
                                    </div>
                                    <h3>{depotName}</h3>
                                    <p>Reported Blood Groups</p>
                                    <div className="rr-group-tags">
                                        {groups.map((g) => <span className="rr-blood-badge" key={g}>{g}</span>)}
                                    </div>
                                    <button
                                        className="rr-button rr-button-light"
                                        style={{ marginTop: "10px" }}
                                        onClick={() => {
                                            setSearch(depotName);
                                            setActivePage("inventory");
                                        }}
                                    >
                                        View Stock Records →
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // Render Hospital Profile Page
    function renderProfile() {
        return (
            <div className="rr-section-stack">
                <section className="rr-page-heading">
                    <div>
                        <span className="rr-eyebrow">ACCOUNT</span>
                        <h2>Hospital Profile &amp; Location Settings</h2>
                        <p>Hospital identification and geospatial coordinates for nearby search.</p>
                    </div>
                </section>
                <section className="rr-panel rr-profile-panel">
                    <div className="rr-profile-hero">
                        <span className="rr-avatar rr-avatar-large">{hospitalName.charAt(0).toUpperCase()}</span>
                        <div>
                            <span className="rr-eyebrow">HOSPITAL FACILITY</span>
                            <h3>{hospitalName}</h3>
                            <p>{accountName} ({accountEmail})</p>
                        </div>
                    </div>
                    <div className="rr-profile-row"><span>Account Role</span><strong>Hospital Trauma Center</strong></div>
                    <div className="rr-profile-row"><span>Facility Name</span><strong>{hospitalName}</strong></div>
                    <div className="rr-profile-row"><span>Email</span><strong>{accountEmail}</strong></div>
                    <div className="rr-profile-row"><span>Contact Number</span><strong>{currentUser?.phone || "Not configured"}</strong></div>
                    <div className="rr-profile-row"><span>Facility Address</span><strong>{currentUser?.address || "Not configured"}</strong></div>
                    <div className="rr-profile-row"><span>District / City, State</span><strong>{[currentUser?.city, currentUser?.state].filter(Boolean).join(", ") || "Not configured"}</strong></div>
                    <div className="rr-profile-row"><span>PIN Code</span><strong>{currentUser?.pinCode || "Not configured"}</strong></div>
                    <div className="rr-profile-row">
                        <span>Configured Coordinates</span>
                        <strong>
                            {hospitalLat && hospitalLon ? `${hospitalLat}, ${hospitalLon}` : "Not configured"}
                        </strong>
                    </div>
                    {locationNotice && <p className="facility-location-message" role="status">{locationNotice}</p>}
                    <FacilityProfileEditor
                        currentUser={currentUser}
                        onSaved={onProfileUpdated}
                        variant="hospital"
                    />
                    <button className="rr-button rr-button-light" style={{ marginTop: "12px" }} onClick={() => handleNavigation("nearby")}>
                        Test Nearby Blood Search
                    </button>
                </section>
            </div>
        );
    }

    // Render Overview Dashboard
    function renderOverview() {
        return (
            <>
                <section className="rr-welcome">
                    <div className="rr-welcome-icon">+</div>
                    <div className="rr-welcome-copy">
                        <span className="rr-eyebrow">HOSPITAL COMMAND</span>
                        <h2>Good day, {hospitalName}</h2>
                        <p>Blood availability telemetry and geospatial emergency supply mesh.</p>
                    </div>
                    <div className={`rr-connection-pill rr-connection-${inventoryState}`}>
                        <span />
                        {inventoryState === "loading" ? "Connecting" : inventoryState === "error" ? "API error" : "MongoDB Synced"}
                    </div>
                </section>

                {inventoryError && (
                    <div className="rr-error rr-dashboard-error" role="alert">
                        <span>{inventoryError}</span>
                        <button className="rr-text-button" onClick={loadInventory} disabled={refreshing}>Retry</button>
                    </div>
                )}

                {/* Stat Cards */}
                <section className="rr-stats-grid">
                    <article className="rr-stat-card">
                        <span className="rr-stat-icon rr-red">◉</span>
                        <div>
                            <p>Network Stock</p>
                            <h3>{inventoryState === "loading" ? "…" : totalUnits.toLocaleString()}</h3>
                            <span>Verified units in MongoDB</span>
                        </div>
                    </article>

                    <article className="rr-stat-card">
                        <span className="rr-stat-icon rr-orange">⌁</span>
                        <div>
                            <p>Pending Requests</p>
                            <h3>{requestsLoading ? "…" : pendingRequests.length}</h3>
                            <span>Awaiting blood bank review</span>
                        </div>
                    </article>

                    <article className="rr-stat-card">
                        <span className="rr-stat-icon rr-blue">🚁</span>
                        <div>
                            <p>Dispatched Transit</p>
                            <h3>{requestsLoading ? "…" : dispatchedRequests.length}</h3>
                            <span>Blood units in transit</span>
                        </div>
                    </article>

                    <article className="rr-stat-card">
                        <span className="rr-stat-icon rr-green">✓</span>
                        <div>
                            <p>Accepted / Fulfilled</p>
                            <h3>{requestsLoading ? "…" : acceptedRequests.length}</h3>
                            <span>Reserved by blood banks</span>
                        </div>
                    </article>
                </section>

                <div className="rr-content-grid">
                    {/* Live Blood Group Grid */}
                    <section className="rr-panel">
                        <div className="rr-panel-heading">
                            <div>
                                <span className="rr-eyebrow">NETWORK AVAILABILITY</span>
                                <h2>Eligible Blood Stock</h2>
                            </div>
                            <button className="rr-button rr-button-light" onClick={loadInventory} disabled={refreshing}>
                                {refreshing ? "Refreshing…" : "↻ Refresh"}
                            </button>
                        </div>

                        {inventoryState === "loading" ? (
                            <p className="rr-empty" role="status">Loading blood group availability…</p>
                        ) : (
                            <div className="rr-blood-grid">
                                {BLOOD_GROUPS.map((group) => (
                                    <button
                                        className="rr-blood-card"
                                        key={group}
                                        onClick={() => {
                                            setSearchGroup(group);
                                            handleNavigation("nearby");
                                        }}
                                        title={`Search nearby ${group} stock`}
                                    >
                                        <span className="rr-blood-drop">+</span>
                                        <strong>{group}</strong>
                                        <span>{countForGroup(group)} units</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                            <button
                                className="rr-button rr-button-primary"
                                style={{ flex: 1 }}
                                onClick={() => handleNavigation("optimizer")}
                            >
                                ⚡ Smart Redistribution (MILP Optimizer) →
                            </button>
                            <button
                                className="rr-button rr-button-light"
                                style={{ flex: 1 }}
                                onClick={() => handleNavigation("nearby")}
                            >
                                🔍 Search Blood Nearby →
                            </button>
                        </div>
                    </section>

                    <div className="rr-side-stack">
                        {/* Emergency Quick Action */}
                        <section className="rr-emergency-card">
                            <span className="rr-emergency-icon">!</span>
                            <div>
                                <span className="rr-eyebrow">TRAUMA SURGE</span>
                                <h2>Smart Redistribution</h2>
                                <p>Run linear solver to minimize routing distance.</p>
                            </div>
                            <button
                                className="rr-button rr-button-white"
                                onClick={() => handleNavigation("emergency")}
                            >
                                ⚡ Emergency MILP Solver →
                            </button>
                        </section>

                        <section className="rr-panel rr-quick-panel">
                            <h3>Operations</h3>
                            <button onClick={() => handleNavigation("optimizer")}>
                                <span>⚡</span><span>MILP Mesh Optimizer</span><b>→</b>
                            </button>
                            <button onClick={() => handleNavigation("nearby")}>
                                <span>🔍</span><span>Search Blood Nearby</span><b>→</b>
                            </button>
                            <button onClick={() => handleNavigation("request")}>
                                <span>+</span><span>My Blood Requests</span><b>→</b>
                            </button>
                        </section>
                    </div>
                </div>

                {/* Recent Requests Table */}
                <section className="rr-panel rr-bottom-panel">
                    <div className="rr-panel-heading">
                        <div>
                            <span className="rr-eyebrow">MY REQUIREMENT LOG</span>
                            <h2>Recent Blood Requests</h2>
                        </div>
                        <button className="rr-text-button" onClick={() => handleNavigation("request")}>View all requests →</button>
                    </div>

                    {requestsLoading ? (
                        <p className="rr-empty" role="status">Loading requests…</p>
                    ) : requests.length > 0 ? (
                        <div className="rr-table-wrap">
                            <table className="rr-table">
                                <thead>
                                    <tr>
                                        <th>Target / Depot</th>
                                        <th>Group &amp; Component</th>
                                        <th>Units</th>
                                        <th>Urgency</th>
                                        <th>Status</th>
                                        <th>Submitted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.slice(0, 5).map((r) => (
                                        <tr key={r._id}>
                                            <td><strong>{r.acceptedFacility || r.bloodBankFacility || "Regional Blood Centre"}</strong></td>
                                            <td><span className="rr-blood-badge">{r.bloodGroup}</span> {r.componentType}</td>
                                            <td>{r.units}</td>
                                            <td><span className={`rr-status rr-status-${(r.urgency || "normal").toLowerCase()}`}>{r.urgency}</span></td>
                                            <td><span className={`rr-status rr-status-${r.status.toLowerCase()}`}>{r.status}</span></td>
                                            <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="rr-empty-inline">No blood requests submitted yet.</p>
                    )}
                </section>
            </>
        );
    }

    function renderPage() {
        if (activePage === "optimizer") return renderOptimizer();
        if (activePage === "nearby") return renderSearchNearby();
        if (activePage === "inventory") return renderInventory();
        if (activePage === "request") return renderRequestForm();
        if (activePage === "network") return renderNetwork();
        if (activePage === "profile") return renderProfile();
        return renderOverview();
    }

    const activeLabel = NAV_ITEMS.find((item) => item.id === activePage)?.label || "Overview";

    return (
        <div className="rr-hospital-app">
            <div className="rr-layout">
                {/* Sidebar */}
                <aside className="rr-sidebar">
                    <div className="rr-brand">
                        <span className="rr-brand-mark">+</span>
                        <div>
                            <strong>RedRelay</strong>
                            <span>Hospital Portal</span>
                        </div>
                    </div>

                    <div className="rr-sidebar-caption">WORKSPACE</div>

                    <nav className="rr-nav" aria-label="Hospital navigation">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                className={`rr-nav-item ${activePage === item.id ? "active" : ""}`}
                                onClick={() => handleNavigation(item.id)}
                                aria-current={activePage === item.id ? "page" : undefined}
                            >
                                <span className="rr-nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <button className="rr-logout" onClick={() => onLogout?.()} style={{ marginTop: "auto" }}>
                        ↪ Log Out
                    </button>
                </aside>

                {/* Main Content */}
                <main className="rr-main">
                    <header className="rr-topbar">
                        <div className="rr-mobile-brand"><span>+</span> RedRelay</div>
                        <div className="rr-topbar-title">
                            <span className="rr-topbar-overline">HOSPITAL WORKSPACE</span>
                            <strong>{activeLabel}</strong>
                        </div>
                        <div className="rr-profile-menu" ref={profileMenuRef}>
                            <button
                                className="rr-user-chip"
                                type="button"
                                onClick={() => setProfileOpen((open) => !open)}
                                aria-expanded={profileOpen}
                                aria-haspopup="menu"
                            >
                                <span className="rr-avatar">{hospitalName.charAt(0).toUpperCase()}</span>
                                <span className="rr-user-chip-copy">
                                    <strong>{hospitalName}</strong>
                                    <span>Hospital Trauma Center</span>
                                </span>
                                <span className="rr-profile-chevron" aria-hidden="true">⌄</span>
                            </button>
                            {profileOpen && (
                                <div className="rr-profile-dropdown" role="menu">
                                    <div className="rr-dropdown-heading">
                                        <span>PROFILE DETAILS</span>
                                        <strong>{accountName}</strong>
                                        <small>{accountEmail}</small>
                                    </div>
                                    <div className="rr-dropdown-detail"><span>Facility</span><strong>{hospitalName}</strong></div>
                                    <div className="rr-dropdown-detail"><span>Role</span><strong>Hospital</strong></div>
                                    <button role="menuitem" onClick={() => { setProfileOpen(false); handleNavigation("profile"); }}>Hospital Profile &amp; Location</button>
                                    <button role="menuitem" onClick={() => { setProfileOpen(false); handleNavigation("optimizer"); }}>MILP Optimizer</button>
                                    <button role="menuitem" onClick={() => { setProfileOpen(false); handleNavigation("request"); }}>My Requests</button>
                                    <button className="rr-dropdown-logout" role="menuitem" onClick={() => { setProfileOpen(false); onLogout?.(); }}>Log Out</button>
                                </div>
                            )}
                        </div>
                    </header>

                    <div className="rr-page-content">
                        {feedback && (
                            <div className="rr-feedback" role="status">
                                <span>{feedback}</span>
                                <button onClick={() => setFeedback("")} aria-label="Dismiss message">×</button>
                            </div>
                        )}
                        {renderPage()}
                        <footer className="rr-footer">
                            <span>RedRelay · Hospital Emergency Care Network</span>
                            <span>Connected to Python MILP Optimizer &amp; MongoDB Mesh</span>
                        </footer>
                    </div>
                </main>
            </div>
        </div>
    );
}
