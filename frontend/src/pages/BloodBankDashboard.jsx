import { useEffect, useMemo, useRef, useState } from "react";
import {
    getInventory,
    addInventoryRecord,
    updateInventoryRecord,
    updateInventoryQuantity,
    deactivateInventoryRecord
} from "../services/inventoryService";
import {
    getBloodRequests,
    decideBloodRequest,
    dispatchBloodRequest
} from "../services/requestService";
import FacilityProfileEditor from "../components/FacilityProfileEditor";
import "./BloodBankDashboard.css";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENT_TYPES = ["Whole Blood", "Packed Red Blood Cells", "Platelets", "Plasma"];
const LOW_STOCK_THRESHOLD = 12;

function safeText(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatDate(dateString) {
    if (!dateString) return "—";
    try {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
        return "—";
    }
}

export default function BloodBankDashboard({ currentUser, onLogout, onProfileUpdated }) {
    const [activePage, setActivePage] = useState("overview");

    // Inventory states
    const [inventory, setInventory] = useState([]);
    const [loadState, setLoadState] = useState("loading");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [noticeType, setNoticeType] = useState("success");

    // Requests states
    const [requests, setRequests] = useState([]);
    const [requestsState, setRequestsState] = useState("loading");
    const [requestError, setRequestError] = useState("");
    const [decisionBusy, setDecisionBusy] = useState("");
    const [requestNotice, setRequestNotice] = useState("");
    const [requestNoticeType, setRequestNoticeType] = useState("success");

    // Filter and search states
    const [searchTerm, setSearchTerm] = useState("");
    const [filterGroup, setFilterGroup] = useState("");
    const [filterComponent, setFilterComponent] = useState("");
    const [filterAvailability, setFilterAvailability] = useState("");
    const [filterScreening, setFilterScreening] = useState("");

    // Modal state for Add / Edit Stock
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // Form fields
    const [formGroup, setFormGroup] = useState("O+");
    const [formComponent, setFormComponent] = useState("Whole Blood");
    const [formUnits, setFormUnits] = useState("");
    const [formBagId, setFormBagId] = useState("");
    const [formCollectionDate, setFormCollectionDate] = useState("");
    const [formExpiryDate, setFormExpiryDate] = useState("");
    const [formScreening, setFormScreening] = useState("Approved");
    const [formVerification, setFormVerification] = useState("Verified");
    const [formStorageLocation, setFormStorageLocation] = useState("Main Cold Bay - Shelf 1");
    const [formAddress, setFormAddress] = useState("");
    const [formCity, setFormCity] = useState("");
    const [formStateVal, setFormStateVal] = useState("");
    const [formPinCode, setFormPinCode] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formLat, setFormLat] = useState("");
    const [formLon, setFormLon] = useState("");
    const [formNotes, setFormNotes] = useState("");

    // Quick quantity edit modal
    const [qtyModalOpen, setQtyModalOpen] = useState(false);
    const [qtyItem, setQtyItem] = useState(null);
    const [newQty, setNewQty] = useState("");
    const [qtySaving, setQtySaving] = useState(false);

    // Profile dropdown
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);

    const facility = safeText(currentUser?.facility, safeText(currentUser?.name, "Your Blood Bank"));
    const userName = safeText(currentUser?.name, "Blood Bank User");
    const email = safeText(currentUser?.email, "Email not provided");
    const bloodBankId = currentUser?.id || currentUser?._id || "BB-DEPOT";

    async function refreshInventory() {
        setLoadState("loading");
        setError("");
        try {
            const data = await getInventory();
            setInventory(Array.isArray(data) ? data : []);
            setLoadState("ready");
        } catch (loadErr) {
            setError(loadErr.message || "Could not load inventory from database.");
            setLoadState("error");
        }
    }

    async function refreshRequests() {
        setRequestsState("loading");
        setRequestError("");
        try {
            const data = await getBloodRequests();
            setRequests(Array.isArray(data) ? data : []);
            setRequestsState("ready");
        } catch (reqErr) {
            setRequestError(reqErr.message || "Could not load hospital requests.");
            setRequestsState("error");
        }
    }

    useEffect(() => {
        let active = true;
        getInventory()
            .then((data) => {
                if (active) {
                    setInventory(Array.isArray(data) ? data : []);
                    setLoadState("ready");
                }
            })
            .catch((err) => {
                if (active) {
                    setError(err.message || "Could not load inventory.");
                    setLoadState("error");
                }
            });

        getBloodRequests()
            .then((data) => {
                if (active) {
                    setRequests(Array.isArray(data) ? data : []);
                    setRequestsState("ready");
                }
            })
            .catch((err) => {
                if (active) {
                    setRequestError(err.message || "Could not load requests.");
                    setRequestsState("error");
                }
            });

        return () => { active = false; };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setProfileOpen(false);
                setModalOpen(false);
                setQtyModalOpen(false);
            }
        };
        document.addEventListener("pointerdown", handleClickOutside);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handleClickOutside);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    // Open Add Stock Modal
    function openAddModal() {
        setEditingItem(null);
        setFormError("");
        setFormGroup("O+");
        setFormComponent("Whole Blood");
        setFormUnits("");
        // Generate suggested unique Bag ID prefix
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        setFormBagId(`BB-${new Date().getFullYear()}-${randomNum}`);

        const todayStr = new Date().toISOString().split("T")[0];
        setFormCollectionDate(todayStr);

        // Default 35-day expiry for Whole Blood / PRBC
        const defaultExp = new Date();
        defaultExp.setDate(defaultExp.getDate() + 35);
        setFormExpiryDate(defaultExp.toISOString().split("T")[0]);

        setFormScreening("Approved");
        setFormVerification("Verified");
        setFormStorageLocation("Cold Storage Bay 1 - Unit 4");
        setFormAddress(currentUser?.address || "");
        setFormCity(currentUser?.city || "");
        setFormStateVal(currentUser?.state || "");
        setFormPinCode(currentUser?.pinCode || "");
        setFormPhone(currentUser?.phone || "");
        setFormEmail(currentUser?.email || "");

        if (currentUser?.location?.coordinates && currentUser.location.coordinates.length === 2) {
            setFormLon(String(currentUser.location.coordinates[0]));
            setFormLat(String(currentUser.location.coordinates[1]));
        } else {
            setFormLon("");
            setFormLat("");
        }

        setFormNotes("");
        setModalOpen(true);
    }

    // Open Edit Stock Modal
    function openEditModal(item) {
        setEditingItem(item);
        setFormError("");
        setFormGroup(item.bloodGroup || "O+");
        setFormComponent(item.componentType || "Whole Blood");
        setFormUnits(String(item.units || ""));
        setFormBagId(item.bagId || "");
        setFormCollectionDate(item.collectionDate ? new Date(item.collectionDate).toISOString().split("T")[0] : "");
        setFormExpiryDate(item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "");
        setFormScreening(item.screeningStatus || "Approved");
        setFormVerification(item.verificationStatus || "Verified");
        setFormStorageLocation(item.storageLocation || "");
        setFormAddress(item.facilityAddress || currentUser?.address || "");
        setFormCity(item.city || currentUser?.city || "");
        setFormStateVal(item.state || currentUser?.state || "");
        setFormPinCode(item.pinCode || currentUser?.pinCode || "");
        setFormPhone(item.contactPhone || currentUser?.phone || "");
        setFormEmail(item.contactEmail || currentUser?.email || "");

        if (item.location?.coordinates && item.location.coordinates.length === 2) {
            setFormLon(String(item.location.coordinates[0]));
            setFormLat(String(item.location.coordinates[1]));
        } else if (currentUser?.location?.coordinates) {
            setFormLon(String(currentUser.location.coordinates[0]));
            setFormLat(String(currentUser.location.coordinates[1]));
        } else {
            setFormLon("");
            setFormLat("");
        }

        setFormNotes(item.notes || "");
        setModalOpen(true);
    }

    // Geolocation helper
    function fillCurrentLocation() {
        if (!navigator.geolocation) {
            setFormError("Browser geolocation is not supported on this device.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormLat(pos.coords.latitude.toFixed(6));
                setFormLon(pos.coords.longitude.toFixed(6));
                setFormError("");
            },
            (err) => {
                setFormError("Could not obtain current location: " + err.message);
            }
        );
    }

    // Handle Add / Edit Submission
    async function handleStockFormSubmit(event) {
        event.preventDefault();
        setFormError("");

        const unitsNum = Number(formUnits);
        if (!Number.isInteger(unitsNum) || unitsNum < 1) {
            setFormError("Units must be a positive whole number (minimum 1).");
            return;
        }

        if (!formBagId.trim()) {
            setFormError("Please enter a unique Blood Bag / Unit ID.");
            return;
        }

        if (!formCollectionDate) {
            setFormError("Collection / donation date is required.");
            return;
        }

        if (!formExpiryDate) {
            setFormError("Expiry date is required.");
            return;
        }

        const collDate = new Date(formCollectionDate);
        const expDate = new Date(formExpiryDate);

        if (expDate <= collDate) {
            setFormError("Expiry date must be after collection date.");
            return;
        }

        setFormSaving(true);
        try {
            const payload = {
                bloodGroup: formGroup,
                componentType: formComponent,
                units: unitsNum,
                bagId: formBagId.trim().toUpperCase(),
                collectionDate: formCollectionDate,
                expiryDate: formExpiryDate,
                screeningStatus: formScreening,
                verificationStatus: formVerification,
                storageLocation: formStorageLocation.trim(),
                facilityAddress: formAddress.trim(),
                city: formCity.trim(),
                state: formStateVal.trim(),
                pinCode: formPinCode.trim(),
                contactPhone: formPhone.trim(),
                contactEmail: formEmail.trim(),
                notes: formNotes.trim()
            };

            if (formLat && formLon && !isNaN(Number(formLat)) && !isNaN(Number(formLon))) {
                payload.latitude = Number(formLat);
                payload.longitude = Number(formLon);
            }

            if (editingItem) {
                await updateInventoryRecord(editingItem._id, payload);
                setNotice(`Successfully updated inventory record ${payload.bagId}.`);
            } else {
                await addInventoryRecord(payload);
                setNotice(`Successfully added ${unitsNum} units of ${formGroup} ${formComponent} (Bag ID: ${payload.bagId}) to MongoDB.`);
            }

            setNoticeType("success");
            setModalOpen(false);
            await refreshInventory();
        } catch (err) {
            setFormError(err.message || "Failed to save stock record. Please check the inputs.");
        } finally {
            setFormSaving(false);
        }
    }

    // Quick Quantity Update
    function openQtyModal(item) {
        setQtyItem(item);
        setNewQty(String(item.units || 0));
        setQtyModalOpen(true);
    }

    async function handleQtySubmit(event) {
        event.preventDefault();
        const unitsNum = Number(newQty);
        if (!Number.isInteger(unitsNum) || unitsNum < 0) {
            alert("Quantity must be a non-negative whole number (0 or higher).");
            return;
        }

        setQtySaving(true);
        try {
            await updateInventoryQuantity(qtyItem._id, unitsNum);
            setNotice(`Updated quantity for ${qtyItem.bagId} to ${unitsNum} units.`);
            setNoticeType("success");
            setQtyModalOpen(false);
            await refreshInventory();
        } catch (err) {
            alert(err.message || "Failed to update quantity.");
        } finally {
            setQtySaving(false);
        }
    }

    // Deactivate / Remove Stock
    async function handleDeactivate(item) {
        if (!window.confirm(`Are you sure you want to deactivate stock ${item.bagId} (${item.bloodGroup} ${item.componentType})? It will no longer appear as available stock.`)) {
            return;
        }

        try {
            await deactivateInventoryRecord(item._id);
            setNotice(`Stock ${item.bagId} has been deactivated.`);
            setNoticeType("success");
            await refreshInventory();
        } catch (err) {
            setNotice(err.message || "Failed to deactivate stock.");
            setNoticeType("error");
        }
    }

    // Decide Request (Accept / Reject)
    async function handleDecideRequest(requestId, decision) {
        setDecisionBusy(requestId);
        setRequestNotice("");
        try {
            const res = await decideBloodRequest(requestId, decision);
            setRequestNoticeType("success");
            setRequestNotice(res.message || `Request ${decision}ed successfully.`);
            await Promise.all([refreshRequests(), refreshInventory()]);
        } catch (err) {
            setRequestNoticeType("error");
            setRequestNotice(err.message || "Could not process request decision.");
        } finally {
            setDecisionBusy("");
        }
    }

    // Dispatch Blood Request
    async function handleDispatch(requestId) {
        setDecisionBusy(requestId);
        setRequestNotice("");
        try {
            const res = await dispatchBloodRequest(requestId);
            setRequestNoticeType("success");
            setRequestNotice(res.message || "Blood units marked as dispatched.");
            await refreshRequests();
        } catch (err) {
            setRequestNoticeType("error");
            setRequestNotice(err.message || "Could not record blood dispatch.");
        } finally {
            setDecisionBusy("");
        }
    }

    // Filtered Inventory list
    const filteredInventory = useMemo(() => {
        return inventory.filter((item) => {
            if (filterGroup && item.bloodGroup !== filterGroup) return false;
            if (filterComponent && item.componentType !== filterComponent) return false;
            if (filterScreening && item.screeningStatus !== filterScreening) return false;

            if (filterAvailability === "available") {
                if (!item.isEligible) return false;
            } else if (filterAvailability === "quarantined") {
                if (item.screeningStatus === "Approved" && item.verificationStatus === "Verified" && item.status === "Available") return false;
            } else if (filterAvailability === "expired") {
                if (!item.isExpired) return false;
            } else if (filterAvailability === "low") {
                if (Number(item.units) <= 0 || Number(item.units) >= 10) return false;
            }

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const bag = String(item.bagId || "").toLowerCase();
                const loc = String(item.storageLocation || "").toLowerCase();
                const city = String(item.city || "").toLowerCase();
                if (!bag.includes(term) && !loc.includes(term) && !city.includes(term)) {
                    return false;
                }
            }

            return true;
        });
    }, [inventory, filterGroup, filterComponent, filterScreening, filterAvailability, searchTerm]);

    // Computed overview statistics from live MongoDB inventory
    const totalUnits = inventory.reduce((sum, item) => sum + (Number(item.units) || 0), 0);
    const eligibleUnits = inventory.filter((i) => i.isEligible).reduce((sum, item) => sum + (Number(item.units) || 0), 0);
    const lowStockCount = BLOOD_GROUPS.filter((g) => {
        const count = inventory
            .filter((i) => i.bloodGroup === g && i.isEligible)
            .reduce((sum, i) => sum + (Number(i.units) || 0), 0);
        return count < LOW_STOCK_THRESHOLD;
    }).length;

    const countGroup = (group) => {
        return inventory
            .filter((item) => item.bloodGroup === group && item.isEligible)
            .reduce((sum, item) => sum + (Number(item.units) || 0), 0);
    };

    const pendingRequests = requests.filter((r) => r.status === "Pending");
    const expiringLotsCount = inventory.filter((i) => i.daysLeft <= 5 && !i.isExpired && Number(i.units) > 0).length;

    const navigation = [
        { id: "overview", icon: "⌂", label: "Overview" },
        { id: "stock", icon: "◉", label: "Manage Stock" },
        { id: "requests", icon: "⇄", label: `Hospital Requests ${pendingRequests.length ? `(${pendingRequests.length})` : ""}` },
        { id: "expiry", icon: "◷", label: "Expiry Tracking" },
        { id: "profile", icon: "👤", label: "Profile & Depot" },
    ];

    function go(page) {
        setNotice("");
        setActivePage(page);
    }

    // Render Blood Group Availability Grid
    function renderStockGrid() {
        return (
            <div className="bb-stock-grid">
                {BLOOD_GROUPS.map((group) => {
                    const units = countGroup(group);
                    return (
                        <article
                            className={`bb-stock-card ${units < LOW_STOCK_THRESHOLD ? "bb-stock-low" : ""}`}
                            key={group}
                        >
                            <span className="bb-stock-type">{group}</span>
                            <strong>{loadState === "loading" ? "…" : units}</strong>
                            <span>eligible units</span>
                            {units < LOW_STOCK_THRESHOLD && loadState !== "loading" && <small>Low stock (&lt;{LOW_STOCK_THRESHOLD})</small>}
                        </article>
                    );
                })}
            </div>
        );
    }

    // Render Manage Stock Page
    function renderStockPage() {
        return (
            <div className="bb-section-stack">
                <section className="bb-section-heading">
                    <div>
                        <span className="bb-eyebrow">INVENTORY CONTROL</span>
                        <h2>Manage Blood Stock</h2>
                        <p>Registered inventory for {facility}. Manage unit verification, screening, and lot availability.</p>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button className="bb-button bb-button-light" onClick={refreshInventory} disabled={loadState === "loading"}>
                            {loadState === "loading" ? "Refreshing…" : "↻ Refresh"}
                        </button>
                        <button className="bb-button bb-button-primary" onClick={openAddModal}>
                            + Add Blood Inventory
                        </button>
                    </div>
                </section>

                {error && (
                    <div className="bb-error" role="alert">
                        {error} <button className="bb-link-button" onClick={refreshInventory}>Retry</button>
                    </div>
                )}

                {/* Filter & Search Bar */}
                <div className="bb-filter-bar">
                    <input
                        type="text"
                        placeholder="Search Bag ID, location, city…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
                        <option value="">All Blood Groups</option>
                        {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={filterComponent} onChange={(e) => setFilterComponent(e.target.value)}>
                        <option value="">All Components</option>
                        {COMPONENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterAvailability} onChange={(e) => setFilterAvailability(e.target.value)}>
                        <option value="">All Availability</option>
                        <option value="available">Safe &amp; Available Only</option>
                        <option value="quarantined">Quarantined / Untested</option>
                        <option value="low">Low Stock (&lt; 10 units)</option>
                        <option value="expired">Expired Lots</option>
                    </select>
                    <select value={filterScreening} onChange={(e) => setFilterScreening(e.target.value)}>
                        <option value="">All Screening</option>
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>

                {/* Stock Table */}
                <section className="bb-panel">
                    <div className="bb-panel-heading">
                        <div>
                            <h3>Saved Blood Inventory Records</h3>
                            <p>Showing {filteredInventory.length} of {inventory.length} records saved in MongoDB for this facility.</p>
                        </div>
                    </div>

                    {loadState === "loading" ? (
                        <div className="bb-state">Loading your saved inventory from MongoDB…</div>
                    ) : filteredInventory.length === 0 ? (
                        <div className="bb-state">
                            <h3>No inventory records found</h3>
                            <p>{inventory.length === 0 ? "You have no saved blood stock in the database yet. Click '+ Add Blood Inventory' above to register your first lot." : "No records match the current filter criteria."}</p>
                            {inventory.length === 0 && (
                                <button className="bb-button bb-button-primary" style={{ marginTop: "12px" }} onClick={openAddModal}>
                                    + Add Blood Inventory
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="bb-table-wrap">
                            <table className="bb-table">
                                <thead>
                                    <tr>
                                        <th>Bag / Unit ID</th>
                                        <th>Group &amp; Component</th>
                                        <th>Units</th>
                                        <th>Collection / Expiry</th>
                                        <th>Screening &amp; Verification</th>
                                        <th>Storage Location</th>
                                        <th>Transfusion Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventory.map((item) => (
                                        <tr key={item._id}>
                                            <td>
                                                <strong style={{ color: "var(--bb-ink)", letterSpacing: "0.5px" }}>{item.bagId}</strong>
                                                <small className="bb-row-subtitle">{item.facilityName || facility}</small>
                                            </td>
                                            <td>
                                                <span className="bb-blood-badge">{item.bloodGroup}</span>
                                                <small className="bb-row-subtitle">{item.componentType}</small>
                                            </td>
                                            <td>
                                                <strong style={{ fontSize: "14px", color: Number(item.units) < 10 ? "#b91c1c" : "inherit" }}>
                                                    {item.units}
                                                </strong>
                                                <button
                                                    className="bb-link-button"
                                                    style={{ display: "block", fontSize: "9px" }}
                                                    onClick={() => openQtyModal(item)}
                                                >
                                                    Edit Qty
                                                </button>
                                            </td>
                                            <td>
                                                <div>Exp: {formatDate(item.expiryDate)}</div>
                                                <small style={{ color: item.daysLeft <= 0 ? "#b91c1c" : item.daysLeft <= 5 ? "#d97706" : "var(--bb-muted)" }}>
                                                    {item.daysLeft <= 0 ? "EXPIRED" : `${item.daysLeft} days remaining`}
                                                </small>
                                            </td>
                                            <td>
                                                <div>
                                                    <span className={`bb-badge bb-badge-${(item.screeningStatus || "approved").toLowerCase()}`}>
                                                        Screen: {item.screeningStatus || "Approved"}
                                                    </span>
                                                </div>
                                                <div style={{ marginTop: "3px" }}>
                                                    <span className={`bb-badge bb-badge-${(item.verificationStatus || "verified").toLowerCase()}`}>
                                                        {item.verificationStatus || "Verified"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span>{item.storageLocation || "Cold Room"}</span>
                                                {item.city && <small className="bb-row-subtitle">{item.city}</small>}
                                            </td>
                                            <td>
                                                {item.isEligible ? (
                                                    <span className="bb-badge bb-badge-eligible">Safe &amp; Available</span>
                                                ) : item.isExpired ? (
                                                    <span className="bb-badge bb-badge-expired">Expired</span>
                                                ) : item.screeningStatus !== "Approved" || item.verificationStatus !== "Verified" ? (
                                                    <span className="bb-badge bb-badge-quarantine" title="Untested or unverified stock is not safe for transfusion">
                                                        Quarantined
                                                    </span>
                                                ) : (
                                                    <span className="bb-badge bb-badge-quarantine">{item.status || "Reserved"}</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="bb-action-buttons">
                                                    <button
                                                        className="bb-btn-sm bb-btn-sm-light"
                                                        onClick={() => openEditModal(item)}
                                                        title="Edit complete record"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="bb-btn-sm bb-btn-sm-danger"
                                                        onClick={() => handleDeactivate(item)}
                                                        title="Remove or deactivate record"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        );
    }

    // Render Hospital Requests Page
    function renderRequests() {
        return (
            <div className="bb-section-stack">
                <section className="bb-section-heading">
                    <div>
                        <span className="bb-eyebrow">INCOMING REQUIREMENTS</span>
                        <h2>Hospital Requests</h2>
                        <p>Incoming transfusion requirements submitted by hospitals in the network.</p>
                    </div>
                    <button className="bb-button bb-button-light" onClick={refreshRequests} disabled={requestsState === "loading"}>
                        {requestsState === "loading" ? "Refreshing…" : "↻ Refresh"}
                    </button>
                </section>

                {requestNotice && (
                    <div className={`bb-notice ${requestNoticeType === "error" ? "bb-notice-error" : ""}`} role={requestNoticeType === "error" ? "alert" : "status"}>
                        {requestNotice}
                        <button onClick={() => setRequestNotice("")} aria-label="Dismiss">×</button>
                    </div>
                )}

                {requestError && (
                    <div className="bb-error" role="alert">
                        <span>{requestError}</span>
                        <button className="bb-link-button" onClick={refreshRequests}>Retry</button>
                    </div>
                )}

                {requestsState === "loading" ? (
                    <section className="bb-panel bb-state">Loading incoming requests…</section>
                ) : requests.length > 0 ? (
                    <section className="bb-panel">
                        <div className="bb-table-wrap">
                            <table className="bb-table">
                                <thead>
                                    <tr>
                                        <th>Hospital Facility</th>
                                        <th>Requirement</th>
                                        <th>Units</th>
                                        <th>Urgency</th>
                                        <th>Status</th>
                                        <th>Submitted</th>
                                        <th>Action / Decision</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map((request) => (
                                        <tr key={request._id}>
                                            <td>
                                                <strong>{request.hospitalFacility}</strong>
                                                <small className="bb-row-subtitle">{request.hospitalName}</small>
                                            </td>
                                            <td>
                                                <span className="bb-blood-badge">{request.bloodGroup}</span>
                                                <small className="bb-row-subtitle">{request.componentType || "Whole Blood"}</small>
                                            </td>
                                            <td><strong>{request.units}</strong> units</td>
                                            <td>
                                                <span className={`bb-urgency bb-urgency-${(request.urgency || "normal").toLowerCase()}`}>
                                                    {request.urgency}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`bb-status bb-status-${request.status.toLowerCase()}`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td>{new Date(request.createdAt).toLocaleString()}</td>
                                            <td>
                                                {request.status === "Pending" ? (
                                                    <div className="bb-decision-actions">
                                                        <button
                                                            className="bb-button bb-button-primary"
                                                            disabled={Boolean(decisionBusy)}
                                                            onClick={() => handleDecideRequest(request._id, "accept")}
                                                        >
                                                            {decisionBusy === request._id ? "Reserving…" : "Accept & Reserve"}
                                                        </button>
                                                        <button
                                                            className="bb-button bb-button-light"
                                                            disabled={Boolean(decisionBusy)}
                                                            onClick={() => handleDecideRequest(request._id, "reject")}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : request.status === "Accepted" ? (
                                                    <div className="bb-decision-actions">
                                                        <button
                                                            className="bb-button bb-button-primary"
                                                            disabled={Boolean(decisionBusy)}
                                                            onClick={() => handleDispatch(request._id)}
                                                        >
                                                            {decisionBusy === request._id ? "Updating…" : "Dispatch Blood ↗"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <small style={{ color: "var(--bb-muted)" }}>
                                                        {request.status === "Dispatched" ? "In Transit to Hospital" : request.status === "Delivered" ? "Delivered & Confirmed" : "Rejected"}
                                                    </small>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ) : (
                    <section className="bb-panel bb-state">
                        <h3>No incoming requests</h3>
                        <p>There are no live hospital requests directed to your blood bank at this time.</p>
                    </section>
                )}
            </div>
        );
    }

    // Render Expiry Tracking Page
    function renderExpiry() {
        const expiringLots = [...inventory].sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));

        return (
            <div className="bb-section-stack">
                <section className="bb-section-heading">
                    <div>
                        <span className="bb-eyebrow">COLD-CHAIN SAFETY</span>
                        <h2>Expiry Tracking &amp; Shelf-Life Monitor</h2>
                        <p>Monitor lot expiration timelines, spoilage risk scores, and cold chain preservation.</p>
                    </div>
                    <button className="bb-button bb-button-light" onClick={refreshInventory}>↻ Refresh</button>
                </section>

                <section className="bb-panel">
                    {expiringLots.length === 0 ? (
                        <div className="bb-state">
                            <h3>No inventory to track</h3>
                            <p>Add blood stock lots to monitor their expiry dates.</p>
                        </div>
                    ) : (
                        <div className="bb-table-wrap">
                            <table className="bb-table">
                                <thead>
                                    <tr>
                                        <th>Bag ID</th>
                                        <th>Group &amp; Component</th>
                                        <th>Units</th>
                                        <th>Collection Date</th>
                                        <th>Expiry Date</th>
                                        <th>Days Left</th>
                                        <th>Spoilage Risk</th>
                                        <th>Storage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expiringLots.map((item) => (
                                        <tr key={item._id}>
                                            <td><strong>{item.bagId}</strong></td>
                                            <td>
                                                <span className="bb-blood-badge">{item.bloodGroup}</span>
                                                <small className="bb-row-subtitle">{item.componentType}</small>
                                            </td>
                                            <td>{item.units} units</td>
                                            <td>{formatDate(item.collectionDate)}</td>
                                            <td><strong>{formatDate(item.expiryDate)}</strong></td>
                                            <td>
                                                <span className={item.daysLeft <= 0 ? "bb-badge bb-badge-expired" : item.daysLeft <= 5 ? "bb-badge bb-badge-quarantine" : "bb-badge bb-badge-eligible"}>
                                                    {item.daysLeft <= 0 ? "Expired" : `${item.daysLeft} days`}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: "700", color: item.daysLeft <= 2 ? "#b91c1c" : item.daysLeft <= 5 ? "#d97706" : "#15803d" }}>
                                                    {item.daysLeft <= 0 ? "10/10 (Spoiled)" : item.daysLeft <= 2 ? "9/10 (Critical)" : item.daysLeft <= 5 ? "6/10 (Moderate)" : "2/10 (Fresh)"}
                                                </span>
                                            </td>
                                            <td>{item.storageLocation || "Cold Room"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        );
    }

    // Render Overview Page
    function renderOverview() {
        return (
            <div className="bb-overview">
                <section className="bb-welcome">
                    <div>
                        <span className="bb-eyebrow">BLOOD BANK COMMAND</span>
                        <h2>Good day, {facility}</h2>
                        <p>Real-time blood stock telemetry, verification safety, and hospital dispatch mesh.</p>
                    </div>
                    <div className={`bb-sync-pill bb-sync-${loadState}`}>
                        <span />
                        {loadState === "loading" ? "Loading inventory" : loadState === "error" ? "API error" : "MongoDB Connected"}
                    </div>
                </section>

                {error && (
                    <div className="bb-error" role="alert">
                        <span>{error}</span>
                        <button className="bb-link-button" onClick={refreshInventory}>Retry</button>
                    </div>
                )}

                {/* KPI Stat Cards */}
                <section className="bb-stat-grid">
                    <article className="bb-stat-card">
                        <span className="bb-stat-icon bb-stat-red">◉</span>
                        <div>
                            <p>Total Stock</p>
                            <strong>{loadState === "loading" ? "…" : totalUnits.toLocaleString()}</strong>
                            <small>{eligibleUnits} eligible units</small>
                        </div>
                    </article>

                    <article className="bb-stat-card">
                        <span className="bb-stat-icon bb-stat-amber">!</span>
                        <div>
                            <p>Low-stock Groups</p>
                            <strong>{loadState === "loading" ? "…" : lowStockCount}</strong>
                            <small>Below {LOW_STOCK_THRESHOLD} units</small>
                        </div>
                    </article>

                    <article className="bb-stat-card">
                        <span className="bb-stat-icon bb-stat-blue">⇄</span>
                        <div>
                            <p>Pending Requests</p>
                            <strong>{requestsState === "loading" ? "…" : pendingRequests.length}</strong>
                            <small>{requests.length} total hospital requests</small>
                        </div>
                    </article>

                    <article className="bb-stat-card">
                        <span className="bb-stat-icon bb-stat-green">◷</span>
                        <div>
                            <p>Expiring Lots (≤ 5d)</p>
                            <strong>{loadState === "loading" ? "…" : expiringLotsCount}</strong>
                            <small>Require prioritized dispatch</small>
                        </div>
                    </article>
                </section>

                <div className="bb-overview-grid">
                    <section className="bb-panel">
                        <div className="bb-panel-heading">
                            <div>
                                <span className="bb-eyebrow">LIVE TELEMETRY</span>
                                <h3>Eligible Blood Group Availability</h3>
                                <p>Safe, screened, and verified stock ready for patient transfusion.</p>
                            </div>
                            <button className="bb-button bb-button-light" onClick={refreshInventory} disabled={loadState === "loading"}>
                                ↻ Refresh
                            </button>
                        </div>
                        {loadState === "loading" ? (
                            <div className="bb-state">Loading inventory…</div>
                        ) : (
                            renderStockGrid()
                        )}
                        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                            <button className="bb-button bb-button-primary" style={{ flex: 1 }} onClick={openAddModal}>
                                + Add Blood Inventory
                            </button>
                            <button className="bb-button bb-button-light" style={{ flex: 1 }} onClick={() => go("stock")}>
                                View Full Inventory →
                            </button>
                        </div>
                    </section>

                    <section className="bb-panel bb-overview-actions">
                        <div className="bb-panel-heading">
                            <div>
                                <span className="bb-eyebrow">QUICK ACTIONS</span>
                                <h3>Facility Operations</h3>
                            </div>
                        </div>
                        <button className="bb-operation" onClick={openAddModal}>
                            <span className="bb-operation-icon">+</span>
                            <span>
                                <strong>Add Blood Inventory</strong>
                                <small>Register new blood bag with screening and verification</small>
                            </span>
                            <b>→</b>
                        </button>
                        <button className="bb-operation" onClick={() => go("requests")}>
                            <span className="bb-operation-icon">⇄</span>
                            <span>
                                <strong>Hospital Requests ({pendingRequests.length} pending)</strong>
                                <small>Review and reserve stock for trauma centers</small>
                            </span>
                            <b>→</b>
                        </button>
                        <button className="bb-operation" onClick={() => go("expiry")}>
                            <span className="bb-operation-icon">◷</span>
                            <span>
                                <strong>Expiry Tracking ({expiringLotsCount} alerts)</strong>
                                <small>Check lots approaching expiration window</small>
                            </span>
                            <b>→</b>
                        </button>
                    </section>
                </div>

                {/* Recent Incoming Requests */}
                <section className="bb-panel bb-recent-panel">
                    <div className="bb-panel-heading">
                        <div>
                            <span className="bb-eyebrow">DISPATCH QUEUE</span>
                            <h3>Recent Hospital Requests</h3>
                        </div>
                        <button className="bb-link-button" onClick={() => go("requests")}>View all requests →</button>
                    </div>
                    {requestsState === "loading" ? (
                        <p className="bb-footnote">Loading requests…</p>
                    ) : requests.length > 0 ? (
                        <div className="bb-table-wrap">
                            <table className="bb-table">
                                <thead>
                                    <tr>
                                        <th>Hospital</th>
                                        <th>Group &amp; Component</th>
                                        <th>Units</th>
                                        <th>Urgency</th>
                                        <th>Status</th>
                                        <th>Submitted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.slice(0, 4).map((r) => (
                                        <tr key={r._id}>
                                            <td><strong>{r.hospitalFacility}</strong></td>
                                            <td><span className="bb-blood-badge">{r.bloodGroup}</span> {r.componentType}</td>
                                            <td>{r.units}</td>
                                            <td><span className={`bb-urgency bb-urgency-${(r.urgency || "normal").toLowerCase()}`}>{r.urgency}</span></td>
                                            <td><span className={`bb-status bb-status-${r.status.toLowerCase()}`}>{r.status}</span></td>
                                            <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="bb-footnote">No hospital requests waiting in queue.</p>
                    )}
                </section>
            </div>
        );
    }

    // Render Profile Page
    function renderProfile() {
        return (
            <div className="bb-section-stack">
                <section className="bb-section-heading">
                    <div>
                        <span className="bb-eyebrow">DEPOT PROFILE</span>
                        <h2>Registered Blood Bank Details</h2>
                    </div>
                </section>
                <section className="bb-panel bb-profile-panel">
                    <div className="bb-profile-identity">
                        <span className="bb-avatar bb-avatar-large">{facility.charAt(0).toUpperCase()}</span>
                        <div>
                            <strong>{facility}</strong>
                            <span>{userName} ({email})</span>
                        </div>
                    </div>
                    <div className="bb-profile-field"><span>Registered Facility ID</span><strong>{bloodBankId}</strong></div>
                    <div className="bb-profile-field"><span>Facility Name</span><strong>{facility}</strong></div>
                    <div className="bb-profile-field"><span>Official Email</span><strong>{email}</strong></div>
                    <div className="bb-profile-field"><span>Contact Phone</span><strong>{currentUser?.phone || "Not configured"}</strong></div>
                    <div className="bb-profile-field"><span>Facility Address</span><strong>{currentUser?.address || "Not configured"}</strong></div>
                    <div className="bb-profile-field"><span>City / State</span><strong>{currentUser?.city ? `${currentUser.city}, ${currentUser.state || ""}` : "Not configured"}</strong></div>
                    <div className="bb-profile-field"><span>PIN Code</span><strong>{currentUser?.pinCode || "Not configured"}</strong></div>
                    <div className="bb-profile-field">
                        <span>Coordinates</span>
                        <strong>
                            {currentUser?.location?.coordinates ? `${currentUser.location.coordinates[1]}, ${currentUser.location.coordinates[0]}` : "Not set"}
                        </strong>
                    </div>
                    <FacilityProfileEditor
                        currentUser={currentUser}
                        onSaved={onProfileUpdated}
                        variant="bloodbank"
                    />
                    <button className="bb-button bb-button-primary" style={{ marginTop: "16px" }} onClick={openAddModal}>
                        + Add Stock for this Facility
                    </button>
                </section>
            </div>
        );
    }

    const content = activePage === "stock" ? renderStockPage()
        : activePage === "requests" ? renderRequests()
            : activePage === "expiry" ? renderExpiry()
                : activePage === "profile" ? renderProfile()
                    : renderOverview();

    const title = navigation.find((item) => item.id === activePage)?.label || "Blood Bank Dashboard";

    return (
        <div className="bb-app">
            {/* Sidebar Navigation */}
            <aside className="bb-sidebar">
                <div className="bb-brand">
                    <span className="bb-brand-mark">+</span>
                    <div>
                        <strong>RedRelay</strong>
                        <small>Blood Bank Depot</small>
                    </div>
                </div>
                <div className="bb-side-label">DEPOT WORKSPACE</div>
                <nav className="bb-nav" aria-label="Blood bank navigation">
                    {navigation.map((item) => (
                        <button
                            key={item.id}
                            className={`bb-nav-item ${activePage === item.id ? "bb-active" : ""}`}
                            onClick={() => go(item.id)}
                            aria-current={activePage === item.id ? "page" : undefined}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="bb-sidebar-support">
                    <span>24/7 NETWORK</span>
                    <strong>Emergency Blood Mesh</strong>
                    <p>Live inventory is synced with regional trauma hospitals.</p>
                </div>
                <button className="bb-sidebar-logout" onClick={() => onLogout?.()}>
                    ↪ Log Out
                </button>
            </aside>

            {/* Main Area */}
            <main className="bb-main">
                <header className="bb-topbar">
                    <div className="bb-topbar-title">
                        <small>BLOOD BANK WORKSPACE</small>
                        <strong>{title}</strong>
                    </div>
                    <div className="bb-profile-wrap" ref={profileRef}>
                        <button
                            className="bb-profile-trigger"
                            onClick={() => setProfileOpen((open) => !open)}
                            aria-expanded={profileOpen}
                            aria-haspopup="menu"
                        >
                            <span className="bb-avatar">{facility.charAt(0).toUpperCase()}</span>
                            <span className="bb-profile-copy">
                                <strong>{facility}</strong>
                                <small>Blood Bank</small>
                            </span>
                            <span className="bb-chevron">⌄</span>
                        </button>
                        {profileOpen && (
                            <div className="bb-profile-menu" role="menu">
                                <div className="bb-menu-identity">
                                    <span>DEPOT IDENTITY</span>
                                    <strong>{facility}</strong>
                                    <small>{email}</small>
                                </div>
                                <div className="bb-menu-row"><span>Depot ID</span><strong>{bloodBankId}</strong></div>
                                <div className="bb-menu-row"><span>Account Role</span><strong>Blood Bank</strong></div>
                                <button role="menuitem" onClick={() => { setProfileOpen(false); go("profile"); }}>Depot Profile</button>
                                <button role="menuitem" onClick={() => { setProfileOpen(false); go("stock"); }}>Inventory Records</button>
                                <button className="bb-menu-logout" role="menuitem" onClick={() => { setProfileOpen(false); onLogout?.(); }}>Log Out</button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="bb-page-content">
                    {notice && (
                        <div className={`bb-notice ${noticeType === "error" ? "bb-notice-error" : ""}`} role="status">
                            {notice}
                            <button onClick={() => setNotice("")} aria-label="Dismiss">×</button>
                        </div>
                    )}

                    {content}

                    <footer className="bb-footer">
                        <span>RedRelay · Blood Bank Management System</span>
                        <span>Connected to MongoDB Blood Inventory API</span>
                    </footer>
                </div>
            </main>

            {/* Modal: Add / Edit Blood Stock */}
            {modalOpen && (
                <div className="bb-modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="bb-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="bb-modal-header">
                            <h3>{editingItem ? `Edit Blood Stock Record: ${editingItem.bagId}` : "Add Blood Inventory"}</h3>
                            <button className="bb-modal-close" onClick={() => setModalOpen(false)} aria-label="Close modal">×</button>
                        </div>

                        <form onSubmit={handleStockFormSubmit} style={{ display: "contents" }}>
                            <div className="bb-modal-body">
                                {formError && <div className="bb-notice bb-notice-error" role="alert">{formError}</div>}

                                {/* Safety Banner */}
                                <div className={`bb-safety-notice ${formScreening === "Approved" && formVerification === "Verified" ? "bb-safety-approved" : "bb-safety-quarantined"}`}>
                                    {formScreening === "Approved" && formVerification === "Verified" ? (
                                        <strong>✓ Safety Approved: Tested and verified stock will be immediately available for hospital transfusion.</strong>
                                    ) : (
                                        <strong>⚠️ Quarantined: Untested or pending stock is flagged as ineligible and will NOT appear as available for transfusion.</strong>
                                    )}
                                </div>

                                {/* Section 1: Blood Unit Identifiers */}
                                <div className="bb-form-section">
                                    <div className="bb-form-section-title">1. Blood Specification &amp; Quantity</div>
                                    <div className="bb-form-grid-3">
                                        <div className="bb-form-group">
                                            <label>Blood Group *</label>
                                            <select value={formGroup} onChange={(e) => setFormGroup(e.target.value)} required>
                                                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>

                                        <div className="bb-form-group">
                                            <label>Component Type *</label>
                                            <select value={formComponent} onChange={(e) => setFormComponent(e.target.value)} required>
                                                {COMPONENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>

                                        <div className="bb-form-group">
                                            <label>Units / Quantity (Pints) *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={formUnits}
                                                onChange={(e) => setFormUnits(e.target.value)}
                                                placeholder="e.g. 10"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="bb-form-grid-3" style={{ marginTop: "12px" }}>
                                        <div className="bb-form-group">
                                            <label>Blood Unit / Bag ID (Unique) *</label>
                                            <input
                                                type="text"
                                                value={formBagId}
                                                onChange={(e) => setFormBagId(e.target.value)}
                                                placeholder="e.g. BB-2026-A104"
                                                required
                                            />
                                        </div>

                                        <div className="bb-form-group">
                                            <label>Donation / Collection Date *</label>
                                            <input
                                                type="date"
                                                max={new Date().toISOString().split("T")[0]}
                                                value={formCollectionDate}
                                                onChange={(e) => setFormCollectionDate(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="bb-form-group">
                                            <label>Expiry Date *</label>
                                            <input
                                                type="date"
                                                min={formCollectionDate || new Date().toISOString().split("T")[0]}
                                                value={formExpiryDate}
                                                onChange={(e) => setFormExpiryDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Laboratory Safety & Testing */}
                                <div className="bb-form-section">
                                    <div className="bb-form-section-title">2. Laboratory Safety &amp; Screening Status</div>
                                    <div className="bb-form-grid-3">
                                        <div className="bb-form-group">
                                            <label>Screening / Testing Status *</label>
                                            <select value={formScreening} onChange={(e) => setFormScreening(e.target.value)} required>
                                                <option value="Approved">Approved (Infectious Diseases Negative)</option>
                                                <option value="Pending">Pending Testing (Quarantined)</option>
                                                <option value="Rejected">Rejected (Ineligible)</option>
                                            </select>
                                        </div>

                                        <div className="bb-form-group">
                                            <label>Verification Status *</label>
                                            <select value={formVerification} onChange={(e) => setFormVerification(e.target.value)} required>
                                                <option value="Verified">Verified by Transfusion Officer</option>
                                                <option value="Pending">Pending Officer Sign-off</option>
                                                <option value="Rejected">Rejected</option>
                                            </select>
                                        </div>

                                        <div className="bb-form-group">
                                            <label>Cold-Chain Storage Location *</label>
                                            <input
                                                type="text"
                                                value={formStorageLocation}
                                                onChange={(e) => setFormStorageLocation(e.target.value)}
                                                placeholder="e.g. Cold Room Bay A - Tray 3"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Facility Location & Contact */}
                                <div className="bb-form-section">
                                    <div className="bb-form-section-title">3. Depot Facility &amp; Coordinates</div>
                                    <div className="bb-form-grid-2">
                                        <div className="bb-form-group">
                                            <label>Facility Name (From Login)</label>
                                            <input type="text" value={facility} readOnly disabled />
                                        </div>

                                        <div className="bb-form-group">
                                            <label>Registered Blood Bank ID</label>
                                            <input type="text" value={bloodBankId} readOnly disabled />
                                        </div>
                                    </div>

                                    <div className="bb-form-grid-3" style={{ marginTop: "12px" }}>
                                        <div className="bb-form-group">
                                            <label>Facility Street Address</label>
                                            <input
                                                type="text"
                                                value={formAddress}
                                                onChange={(e) => setFormAddress(e.target.value)}
                                                placeholder="e.g. 104 Civil Hospital Road"
                                            />
                                        </div>

                                        <div className="bb-form-group">
                                            <label>City</label>
                                            <input
                                                type="text"
                                                value={formCity}
                                                onChange={(e) => setFormCity(e.target.value)}
                                                placeholder="e.g. Nashik"
                                            />
                                        </div>

                                        <div className="bb-form-group">
                                            <label>State &amp; PIN Code</label>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <input
                                                    type="text"
                                                    value={formStateVal}
                                                    onChange={(e) => setFormStateVal(e.target.value)}
                                                    placeholder="State"
                                                    style={{ flex: 1 }}
                                                />
                                                <input
                                                    type="text"
                                                    value={formPinCode}
                                                    onChange={(e) => setFormPinCode(e.target.value)}
                                                    placeholder="PIN"
                                                    style={{ width: "90px" }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bb-form-grid-3" style={{ marginTop: "12px" }}>
                                        <div className="bb-form-group">
                                            <label>Contact Phone</label>
                                            <input
                                                type="tel"
                                                value={formPhone}
                                                onChange={(e) => setFormPhone(e.target.value)}
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>

                                        <div className="bb-form-group">
                                            <label>Latitude</label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={formLat}
                                                onChange={(e) => setFormLat(e.target.value)}
                                                placeholder="e.g. 20.0059"
                                            />
                                        </div>

                                        <div className="bb-form-group">
                                            <label>
                                                Longitude
                                                <button
                                                    type="button"
                                                    onClick={fillCurrentLocation}
                                                    style={{ marginLeft: "8px", background: "none", border: "none", color: "var(--bb-red)", cursor: "pointer", fontSize: "10px", fontWeight: "700" }}
                                                >
                                                    📍 Detect GPS
                                                </button>
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={formLon}
                                                onChange={(e) => setFormLon(e.target.value)}
                                                placeholder="e.g. 73.7898"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bb-modal-footer">
                                <button type="button" className="bb-button bb-button-light" onClick={() => setModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="bb-button bb-button-primary" disabled={formSaving}>
                                    {formSaving ? "Saving to MongoDB…" : editingItem ? "Update Stock Record" : "Save Blood Stock to MongoDB"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Quick Quantity Edit */}
            {qtyModalOpen && qtyItem && (
                <div className="bb-modal-overlay" onClick={() => setQtyModalOpen(false)}>
                    <div className="bb-modal" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="bb-modal-header">
                            <h3>Adjust Stock Quantity</h3>
                            <button className="bb-modal-close" onClick={() => setQtyModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleQtySubmit} style={{ display: "contents" }}>
                            <div className="bb-modal-body">
                                <p style={{ fontSize: "12px", margin: "0 0 12px", color: "var(--bb-muted)" }}>
                                    Updating units for <strong>{qtyItem.bagId}</strong> ({qtyItem.bloodGroup} {qtyItem.componentType}):
                                </p>
                                <div className="bb-form-group">
                                    <label>Available Units</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={newQty}
                                        onChange={(e) => setNewQty(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="bb-modal-footer">
                                <button type="button" className="bb-button bb-button-light" onClick={() => setQtyModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="bb-button bb-button-primary" disabled={qtySaving}>
                                    {qtySaving ? "Updating…" : "Update Quantity"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}