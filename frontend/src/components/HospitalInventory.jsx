import { useState, useMemo } from "react";
import {
  SearchIcon,
  CrossIcon,
  AlertIcon,
  DroneIcon,
  MapPinIcon,
} from "./Icons";

export function HospitalInventory({
  hospitals,
  onRequestTransfer,
  selectedFilter,
  setSelectedFilter,
  currentUser,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("urgency");
  const [expandedHospitalId, setExpandedHospitalId] = useState(null);

  // Filter and sort hospitals
  const filteredHospitals = useMemo(() => {
    return hospitals
      .filter((h) => {
        // Status filter
        if (selectedFilter !== "all" && h.state !== selectedFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = h.name.toLowerCase().includes(q);
          const matchLoc = h.location.toLowerCase().includes(q);
          const matchFac = h.facility.toLowerCase().includes(q);
          const matchZone = h.zone.toLowerCase().includes(q);
          if (!matchName && !matchLoc && !matchFac && !matchZone) {
            return false;
          }
        }

        // Blood group filter (checks if hospital has stock > 0 for this type)
        if (bloodTypeFilter !== "all") {
          const typeStock = h.bloodStock[bloodTypeFilter] || 0;
          if (typeStock <= 0) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "urgency") {
          const order = { Critical: 1, Warning: 2, Healthy: 3 };
          return order[a.state] - order[b.state];
        }
        if (sortBy === "stockAsc") {
          return a.totalUnits - b.totalUnits;
        }
        if (sortBy === "stockDesc") {
          return b.totalUnits - a.totalUnits;
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [hospitals, selectedFilter, searchQuery, bloodTypeFilter, sortBy]);

  const toggleExpand = (id) => {
    setExpandedHospitalId((prev) => (prev === id ? null : id));
  };

  const bloodGroupKeys = ["O-", "O+", "A+", "A-", "B+", "B-", "AB+", "AB-"];

  return (
    <section className="panel-container" id="hospital-network">
      {/* Header */}
      <div className="panel-header-custom">
        <div className="panel-header-left">
          <span className="section-eyebrow">FACILITY INTELLIGENCE</span>
          <h2 className="panel-title">Hospital Network & Stock Telemetry</h2>
          <p className="panel-subtitle">
            Live inventory status across connected regional blood banks and emergency rooms.
          </p>
        </div>
        <div className="panel-header-right">
          <span className="demo-badge-pill">SIMULATED DATA</span>
          <span className="facilities-count-badge">
            {filteredHospitals.length} of {hospitals.length} facilities
          </span>
        </div>
      </div>

      {/* Interactive Controls Bar: Search & Filters */}
      <div className="inventory-controls-bar">
        {/* Search */}
        <div className="search-input-wrapper">
          <SearchIcon className="search-icon" size={17} />
          <input
            type="text"
            className="search-input"
            placeholder="Search hospital name, location, or facility type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search hospitals"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="filter-chips-group">
          <span className="filter-label">Status:</span>
          {["all", "Critical", "Warning", "Healthy"].map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-chip ${selectedFilter === status ? "active" : ""} ${
                status !== "all" ? status.toLowerCase() : ""
              }`}
              onClick={() => setSelectedFilter(status)}
            >
              {status === "all" ? "All Facilities" : status}
            </button>
          ))}
        </div>

        {/* Blood Group Filter & Sort Dropdown */}
        <div className="dropdowns-group">
          <div className="select-wrap">
            <span className="select-label">Stocked Type:</span>
            <select
              value={bloodTypeFilter}
              onChange={(e) => setBloodTypeFilter(e.target.value)}
              className="custom-select"
              aria-label="Filter by blood group"
            >
              <option value="all">Any Blood Group</option>
              {bloodGroupKeys.map((bg) => (
                <option key={bg} value={bg}>
                  Has {bg} Stock
                </option>
              ))}
            </select>
          </div>

          <div className="select-wrap">
            <span className="select-label">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="custom-select"
              aria-label="Sort hospitals"
            >
              <option value="urgency">Urgency / Shortage</option>
              <option value="stockAsc">Stock: Low to High</option>
              <option value="stockDesc">Stock: High to Low</option>
              <option value="name">Hospital Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      {filteredHospitals.length === 0 ? (
        <div className="empty-results-box">
          <AlertIcon size={32} />
          <p className="empty-title">No facilities matched your filters</p>
          <p className="empty-subtitle">
            Try adjusting your search query, status filter, or selected blood group.
          </p>
          <button
            type="button"
            className="btn-reset-filters"
            onClick={() => {
              setSearchQuery("");
              setSelectedFilter("all");
              setBloodTypeFilter("all");
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="hospital-grid-interactive">
          {filteredHospitals.map((hospital) => {
            const isExpanded = expandedHospitalId === hospital.id;
            const stockPercent = Math.min(100, Math.round((hospital.totalUnits / 120) * 100));

            return (
              <article
                key={hospital.id}
                className={`hospital-card-rich ${hospital.state.toLowerCase()}-card ${
                  isExpanded ? "card-expanded" : ""
                }`}
              >
                {/* Card Top */}
                <div className="card-top-row">
                  <div className="hospital-badge-icon">
                    <CrossIcon size={18} />
                  </div>

                  <div className="hospital-title-area">
                    <div className="hospital-heading-row">
                      <h3 className="hospital-main-name">{hospital.name}</h3>
                      <span className={`status-badge-tag ${hospital.state.toLowerCase()}`}>
                        {hospital.state === "Critical" && <span className="pulsing-badge-dot" />}
                        {hospital.state}
                      </span>
                    </div>
                    <span className="hospital-facility-name">{hospital.facility}</span>
                    <div className="hospital-location-row">
                      <MapPinIcon size={13} />
                      <span>{hospital.location} • {hospital.zone}</span>
                    </div>
                  </div>
                </div>

                {/* Alert Warning Notice if Critical/Warning */}
                {hospital.alertNote && (
                  <div className="hospital-alert-notice">
                    <AlertIcon size={14} />
                    <span>{hospital.alertNote}</span>
                  </div>
                )}

                {/* Stock Level Gauge */}
                <div className="stock-level-gauge-wrap">
                  <div className="gauge-labels">
                    <span className="gauge-title">Available Blood Supply</span>
                    <strong className="gauge-value">{hospital.stock}</strong>
                  </div>
                  <div className="gauge-track">
                    <div
                      className={`gauge-bar-fill ${hospital.state.toLowerCase()}`}
                      style={{ width: `${Math.max(8, stockPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Key Blood Type Pills (Preview) */}
                <div className="blood-quick-pills">
                  <div className={`quick-pill ${hospital.bloodStock["O-"] === 0 ? "depleted" : ""}`}>
                    <span className="type-label">O-</span>
                    <span className="type-units">{hospital.bloodStock["O-"]} u</span>
                  </div>
                  <div className="quick-pill">
                    <span className="type-label">O+</span>
                    <span className="type-units">{hospital.bloodStock["O+"]} u</span>
                  </div>
                  <div className="quick-pill">
                    <span className="type-label">A+</span>
                    <span className="type-units">{hospital.bloodStock["A+"]} u</span>
                  </div>
                  <div className="quick-pill">
                    <span className="type-label">B+</span>
                    <span className="type-units">{hospital.bloodStock["B+"]} u</span>
                  </div>
                </div>

                {/* Expandable Detailed Inventory Breakdown */}
                {isExpanded && (
                  <div className="expanded-inventory-details">
                    <div className="details-header">
                      <span>Full Group Inventory Telemetry:</span>
                      <span className="details-updated">Updated {hospital.lastUpdated}</span>
                    </div>

                    <div className="blood-types-breakdown-grid">
                      {bloodGroupKeys.map((group) => {
                        const count = hospital.bloodStock[group] || 0;
                        return (
                          <div
                            key={group}
                            className={`breakdown-cell ${count === 0 ? "cell-zero" : ""}`}
                          >
                            <span className="cell-type">{group}</span>
                            <span className="cell-count">{count} units</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="supplemental-reserves-row">
                      <div className="sup-item">
                        <span>Platelets:</span>
                        <strong>{hospital.platelets} units</strong>
                      </div>
                      <div className="sup-item">
                        <span>Fresh Frozen Plasma:</span>
                        <strong>{hospital.plasma} units</strong>
                      </div>
                      <div className="sup-item">
                        <span>UAV Corridors:</span>
                        <strong>{hospital.activeDrones} assigned</strong>
                      </div>
                    </div>

                    <div className="contact-info-row">
                      <span>Emergency Dispatch Desk:</span>
                      <a href={`tel:${hospital.phone}`} className="phone-link">
                        {hospital.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Card Actions Footer */}
                <div className="card-actions-row">
                  <button
                    type="button"
                    className="btn-toggle-details"
                    onClick={() => toggleExpand(hospital.id)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? "Hide Details ▲" : "View Breakdown ▼"}
                  </button>

                  <button
                    type="button"
                    className={`btn-request-transfer ${hospital.state === "Critical" ? "urgent" : ""}`}
                    onClick={() => onRequestTransfer(hospital)}
                  >
                    <DroneIcon size={15} />
                    {currentUser?.role === "hospital"
                      ? hospital.state === "Critical"
                        ? "Request Critical Aid"
                        : "Request to Hospital"
                      : currentUser?.role === "blood_bank"
                      ? hospital.state === "Critical"
                        ? "Dispatch Aid from Depot"
                        : "Allocate Depot Stock"
                      : hospital.state === "Critical"
                      ? "Dispatch Aid"
                      : "Transfer Request"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
