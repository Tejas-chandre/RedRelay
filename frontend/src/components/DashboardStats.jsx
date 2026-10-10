import { PulseIcon, BloodDropIcon, AlertIcon, DroneIcon, RefreshIcon, CrossIcon, CheckIcon } from "./Icons";

export function DashboardStats({
  hospitals,
  transfers,
  onFilterCritical,
  onResetData,
  activeFilter,
  currentUser,
}) {
  const totalHospitals = hospitals.length;
  const totalUnits = hospitals.reduce((sum, h) => sum + h.totalUnits, 0);
  const criticalCount = hospitals.filter((h) => h.state === "Critical").length;
  const activeTransfersCount = transfers.length;

  // Calculate O- negative emergency reserve across all facilities
  const universalODonorTotal = hospitals.reduce(
    (sum, h) => sum + (h.bloodStock["O-"] || 0),
    0
  );

  const isHospital = currentUser?.role === "hospital";
  const isBloodBank = currentUser?.role === "blood_bank";

  return (
    <div className="dashboard-stats-wrapper">
      {/* Role-Specific Dashboard Header */}
      <div className="dashboard-stats-header">
        <div className="section-title-wrap">
          {isHospital ? (
            <>
              <span className="section-eyebrow eyebrow-hospital">
                🏥 HOSPITAL CLINICAL & SURGICAL COMMAND
              </span>
              <h2 className="section-heading">
                Trauma & Emergency Deficit Dashboard
              </h2>
              <p className="section-subtext">
                Facility: <strong>{currentUser.facility}</strong> • Triage Director: <strong>{currentUser.name}</strong>. Real-time patient surgical demand and inbound transfer corridor monitoring.
              </p>
            </>
          ) : isBloodBank ? (
            <>
              <span className="section-eyebrow eyebrow-bloodbank">
                🩸 REGIONAL BLOOD BANK & DEPOT COMMAND
              </span>
              <h2 className="section-heading">
                Storage, Cold-Chain & Fleet Operations
              </h2>
              <p className="section-subtext">
                Depot: <strong>{currentUser.facility}</strong> • Director: <strong>{currentUser.name}</strong>. Centralized blood stock allocation, temperature telemetry, and UAV dispatch corridors.
              </p>
            </>
          ) : (
            <>
              <span className="section-eyebrow">COMMAND TELEMETRY</span>
              <h2 className="section-heading">Network Overview</h2>
              <p className="section-subtext">
                Continuous real-time synchronization across connected blood banks and emergency trauma centers.
              </p>
            </>
          )}
        </div>

        <div className="stats-header-controls">
          <div className="telemetry-pill">
            <span className="live-dot-green"></span>
            <span>Mesh Synced • 120ms Latency</span>
          </div>

          <button
            type="button"
            className="btn-refresh-telemetry"
            onClick={onResetData}
            title="Reset telemetry & simulation state to baseline"
          >
            <RefreshIcon size={15} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Role Permissions & Operational Badge */}
      {currentUser && (
        <div className={`role-permissions-banner ${isHospital ? "hospital-banner" : "bloodbank-banner"}`}>
          <div className="permissions-left">
            <span className="permissions-role-tag">
              {isHospital ? "🏥 HOSPITAL ROLE ACTIVE" : "🩸 BLOOD BANK ROLE ACTIVE"}
            </span>
            <span className="permissions-desc">
              {isHospital
                ? "Authorized: Emergency shortage declaration, triage deficit requisitions, and inbound drone tracking."
                : "Authorized: Cold-chain vault telemetry, UAV SkyCorridor launch clearance, and inter-hospital stock balancing."}
            </span>
          </div>
          <div className="permissions-facility-pill">
            <span className="facility-dot"></span>
            <span>{currentUser.facility}</span>
          </div>
        </div>
      )}

      {/* Dynamic Role-Based Stats Grid */}
      <div className="stats-grid">
        {/* Card 1: Facility Status */}
        <div className="stat-card-enhanced">
          <div className="stat-card-top">
            <div className={`stat-icon-badge ${isHospital ? "red-pulse" : "blue"}`}>
              {isHospital ? <CrossIcon size={20} /> : <PulseIcon size={20} />}
            </div>
            <span className="stat-meta">
              {isHospital ? "Trauma Bays Active" : "Depot Network Status"}
            </span>
          </div>
          <div className="stat-body">
            <span className="stat-title">
              {isHospital ? "Hospital Readiness" : "Connected Facilities"}
            </span>
            <div className="stat-value-row">
              <span className="stat-number">
                {isHospital ? "Level-1" : totalHospitals}
              </span>
              <span className="stat-unit">
                {isHospital ? "Trauma Ready" : "Hubs Online"}
              </span>
            </div>
            <div className="stat-footer-bar">
              <div className="stat-tag-pill">
                {isHospital ? "ER Surgical Bay" : "Nashik Trauma Grid"}
              </div>
              <span className="stat-subdetail">
                {isHospital ? "24/7 Rapid Intake" : "100% telemetry uptime"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Blood Units Availability */}
        <div className="stat-card-enhanced">
          <div className="stat-card-top">
            <div className="stat-icon-badge purple">
              <BloodDropIcon size={20} />
            </div>
            <span className="stat-meta">
              {isBloodBank ? "Vault Cold-Chain: +4°C" : "Reserve Status"}
            </span>
          </div>
          <div className="stat-body">
            <span className="stat-title">
              {isBloodBank ? "Central Depot Reserves" : "Available Blood Units"}
            </span>
            <div className="stat-value-row">
              <span className="stat-number">{totalUnits}</span>
              <span className="stat-unit">Units Total</span>
            </div>
            <div className="stat-footer-bar">
              <span className="stat-highlight-pill coral">
                O- Reserve: {universalODonorTotal} units
              </span>
              <span className="stat-subdetail">
                {isBloodBank ? "RFID Cold-Chain Monitored" : "Universal emergency pool"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Deficit Alerts */}
        <div
          className={`stat-card-enhanced alert-interactive ${
            activeFilter === "Critical" ? "active-filter-border" : ""
          }`}
          onClick={onFilterCritical}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onFilterCritical();
            }
          }}
          title="Click to filter hospital list by Critical alerts"
        >
          <div className="stat-card-top">
            <div className="stat-icon-badge red-pulse">
              <AlertIcon size={20} />
            </div>
            <span className="stat-badge-danger">
              {criticalCount > 0 ? "ACTION REQUIRED" : "ALL RESOLVED"}
            </span>
          </div>
          <div className="stat-body">
            <span className="stat-title">
              {isHospital ? "Immediate Hospital Deficits" : "Critical Grid Shortages"}
            </span>
            <div className="stat-value-row">
              <span className="stat-number text-danger">{criticalCount}</span>
              <span className="stat-unit text-danger">Alerts</span>
            </div>
            <div className="stat-footer-bar">
              <span className="stat-link-action">
                {activeFilter === "Critical"
                  ? "Showing critical ✕"
                  : isHospital
                  ? "Request Emergency Stock →"
                  : "Dispatch Supply →"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Transfer Corridors / Fleet */}
        <div className="stat-card-enhanced">
          <div className="stat-card-top">
            <div className="stat-icon-badge emerald">
              <DroneIcon size={20} />
            </div>
            <span className="stat-badge-active">
              {isBloodBank ? "UAV FLEET READY" : `${activeTransfersCount} IN TRANSIT`}
            </span>
          </div>
          <div className="stat-body">
            <span className="stat-title">
              {isBloodBank ? "Active Drone Corridors" : "Inbound Mesh Transfers"}
            </span>
            <div className="stat-value-row">
              <span className="stat-number">{activeTransfersCount}</span>
              <span className="stat-unit">
                {isBloodBank ? "UAV Flight Paths" : "Inbound Corridors"}
              </span>
            </div>
            <div className="stat-footer-bar">
              <span className="stat-subdetail">
                {transfers[0]
                  ? `Next Delivery: ~${transfers[0].etaMinutes}m (${transfers[0].to})`
                  : "Corridors standing by"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Transfer Corridors List */}
      {transfers.length > 0 && (
        <div className="transfers-mini-banner">
          <div className="transfer-banner-label">
            <DroneIcon size={16} />
            <span>
              {isHospital
                ? "INBOUND EMERGENCY CORRIDORS:"
                : isBloodBank
                ? "DEPOT ACTIVE UAV FLIGHT CORRIDORS:"
                : "LIVE IN-TRANSIT CORRIDORS:"}
            </span>
          </div>
          <div className="transfer-chips-list">
            {transfers.map((t) => (
              <div key={t.id} className="transfer-chip">
                <span className="chip-badge">{t.bloodType}</span>
                <span className="chip-route">
                  {t.from} → <strong>{t.to}</strong>
                </span>
                <span className="chip-units">({t.units} units)</span>
                <span className="chip-eta">ETA {t.etaMinutes}m</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
