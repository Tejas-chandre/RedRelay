
import { useState } from "react";
import "./RoleDashboard.css";

const config = {
    hospital: {
        title: "Hospital Dashboard",
        subtitle: "Manage blood requirements and emergency requests.",
        menu: ["Overview", "Blood Inventory", "Emergency Requests", "Network Facilities", "Notifications", "Settings"],
    },
    blood_bank: {
        title: "Blood Bank Dashboard",
        subtitle: "Manage blood stock, requests and redistribution.",
        menu: ["Overview", "Blood Inventory", "Hospital Requests", "Redistribution", "Notifications", "Settings"],
    },
};

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function RoleDashboard({ role = "hospital", user, onLogout }) {
    const [page, setPage] = useState("Overview");
    const [search, setSearch] = useState("");
    const [notice, setNotice] = useState("");

    const bank = role === "blood_bank";
    const settings = config[bank ? "blood_bank" : "hospital"];

    function selectPage(item) {
        setPage(item);
        setNotice("");
    }

    return (
        <div className="rr-layout">
            <aside className="rr-sidebar">
                <div className="rr-brand">
                    <div className="rr-logo">R</div>
                    <div>
                        <strong>RedRelay</strong>
                        <small>Blood Supply Network</small>
                    </div>
                </div>

                <div className="rr-role">
                    <span className="rr-role-dot" />
                    <div>
                        <small>WORKSPACE</small>
                        <strong>{bank ? "Blood Bank" : "Hospital"}</strong>
                    </div>
                </div>

                <p className="rr-nav-label">WORKSPACE</p>

                <nav className="rr-nav">
                    {settings.menu.map((item, index) => (
                        <button
                            key={item}
                            className={page === item ? "rr-nav-item active" : "rr-nav-item"}
                            onClick={() => selectPage(item)}
                        >
                            <span className="rr-nav-icon">
                                {["◫", "▦", "⚑", "⇄", "♧", "⚙"][index]}
                            </span>
                            {item}
                            {item.includes("Requests") && (
                                <span className="rr-nav-arrow">›</span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="rr-sidebar-bottom">
                    <div className="rr-emergency">
                        <span>✚</span>
                        <strong>Every unit matters.</strong>
                        <p>Help connect blood supply to patients in need.</p>
                    </div>
                    <button className="rr-logout" onClick={onLogout}>
                        ↪ &nbsp; Sign out
                    </button>
                </div>
            </aside>

            <main className="rr-main">
                <header className="rr-topbar">
                    <div className="rr-breadcrumb">
                        <span>RedRelay</span> <span>/</span> <strong>{page}</strong>
                    </div>

                    <div className="rr-user">
                        <div className="rr-avatar">
                            {(user?.name || (bank ? "BB" : "H")).charAt(0).toUpperCase()}
                        </div>
                        <div className="rr-user-info">
                            <strong>{user?.name || (bank ? "Blood Bank" : "Hospital")}</strong>
                            <small>{bank ? "Blood Bank Account" : "Hospital Account"}</small>
                        </div>
                    </div>
                </header>

                <section className="rr-content">
                    <div className="rr-heading">
                        <div>
                            <div className="rr-eyebrow">YOUR WORKSPACE</div>
                            <h1>{page === "Overview" ? settings.title : page}</h1>
                            <p>{page === "Overview" ? settings.subtitle : `Manage and review your ${page.toLowerCase()} information.`}</p>
                        </div>
                        <div className="rr-live">
                            <span /> Connected workspace
                        </div>
                    </div>

                    {notice && <div className="rr-notice">{notice}</div>}

                    {page === "Overview" && (
                        <>
                            <div className="rr-banner">
                                <div>
                                    <span className="rr-banner-label">REDRELAY NETWORK</span>
                                    <h2>{bank ? "Your inventory. A lifeline." : "The right blood. At the right time."}</h2>
                                    <p>
                                        {bank
                                            ? "Track available stock and coordinate incoming hospital requests."
                                            : "Monitor your blood requirements and coordinate with connected blood banks."}
                                    </p>
                                </div>
                                <div className="rr-banner-symbol">✚</div>
                            </div>

                            <div className="rr-section-title">
                                <div>
                                    <h2>At a glance</h2>
                                    <p>Live metrics appear when connected data is available.</p>
                                </div>
                            </div>

                            <div className="rr-stats">
                                {[
                                    ["Blood groups", "8", "Supported groups"],
                                    ["Available units", "—", "Awaiting inventory data"],
                                    [bank ? "Incoming requests" : "Open requests", "—", "Awaiting request data"],
                                    ["Critical alerts", "—", "Awaiting alert data"],
                                ].map(([label, value, description], i) => (
                                    <div className="rr-stat" key={label}>
                                        <div className="rr-stat-top">
                                            <span>{label}</span>
                                            <span className={`rr-stat-icon rr-stat-${i}`}>{["▦", "◉", "⇄", "⚑"][i]}</span>
                                        </div>
                                        <strong className="rr-stat-value">{value}</strong>
                                        <small>{description}</small>
                                    </div>
                                ))}
                            </div>

                            <div className="rr-grid">
                                <section className="rr-panel rr-blood-panel">
                                    <div className="rr-panel-heading">
                                        <div>
                                            <h2>Blood groups</h2>
                                            <p>Inventory availability overview</p>
                                        </div>
                                        <button className="rr-text-button" onClick={() => selectPage("Blood Inventory")}>
                                            View inventory →
                                        </button>
                                    </div>
                                    <div className="rr-blood-grid">
                                        {bloodGroups.map((group, i) => (
                                            <div className="rr-blood-card" key={group}>
                                                <div className={i === 7 || i === 1 ? "rr-blood-type rr-blood-alert" : "rr-blood-type"}>
                                                    {group}
                                                </div>
                                                <strong>—</strong>
                                                <small>Units</small>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="rr-data-note">
                                        Inventory counts will display after live data integration.
                                    </p>
                                </section>

                                <section className="rr-panel rr-actions-panel">
                                    <div className="rr-panel-heading">
                                        <div>
                                            <h2>Quick actions</h2>
                                            <p>Go directly to a workspace</p>
                                        </div>
                                    </div>
                                    <button className="rr-action" onClick={() => selectPage("Blood Inventory")}>
                                        <span className="rr-action-icon">▦</span>
                                        <span><strong>Blood inventory</strong><small>Review stock information</small></span>
                                        <b>→</b>
                                    </button>
                                    <button className="rr-action" onClick={() => selectPage(bank ? "Hospital Requests" : "Emergency Requests")}>
                                        <span className="rr-action-icon rr-action-red">⚑</span>
                                        <span><strong>{bank ? "Hospital requests" : "Emergency requests"}</strong><small>Review request workspace</small></span>
                                        <b>→</b>
                                    </button>
                                    <button className="rr-action" onClick={() => selectPage("Network Facilities")}>
                                        <span className="rr-action-icon rr-action-green">⇄</span>
                                        <span><strong>Network facilities</strong><small>Open facility workspace</small></span>
                                        <b>→</b>
                                    </button>
                                </section>
                            </div>
                        </>
                    )}

                    {page === "Blood Inventory" && (
                        <section className="rr-panel">
                            <div className="rr-panel-heading">
                                <div>
                                    <h2>Blood inventory</h2>
                                    <p>Inventory records from your connected system</p>
                                </div>
                                <input
                                    className="rr-search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search blood group..."
                                    aria-label="Search blood groups"
                                />
                            </div>
                            <div className="rr-table-wrap">
                                <table className="rr-table">
                                    <thead>
                                        <tr><th>Blood group</th><th>Available units</th><th>Status</th></tr>
                                    </thead>
                                    <tbody>
                                        {bloodGroups.filter((g) => g.toLowerCase().includes(search.toLowerCase())).map((group) => (
                                            <tr key={group}>
                                                <td><span className="rr-table-blood">{group}</span></td>
                                                <td>—</td>
                                                <td><span className="rr-status">Awaiting data</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="rr-data-note">
                                This view does not invent stock quantities. Connect your existing inventory API to show actual records.
                            </p>
                        </section>
                    )}

                    {page !== "Overview" && page !== "Blood Inventory" && (
                        <section className="rr-panel rr-empty">
                            <div className="rr-empty-icon">▤</div>
                            <h2>{page}</h2>
                            <p>
                                This workspace is ready for your {page.toLowerCase()} records.
                                Live actions require the corresponding backend API.
                            </p>
                            <button className="rr-primary" onClick={() => selectPage("Overview")}>
                                Back to overview
                            </button>
                        </section>
                    )}

                    <footer className="rr-footer">
                        <span>© RedRelay · Blood Supply Network</span>
                        <span>Connected care, coordinated supply.</span>
                    </footer>
                </section>
            </main>
        </div>
    );
}
