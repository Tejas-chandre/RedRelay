import { useState } from "react";
import { MeshIcon, DroneIcon } from "./Icons";

export function NetworkMap({ hospitals, transfers, onSelectHospital }) {
  const [selectedNode, setSelectedNode] = useState(hospitals[1] || hospitals[0]); // Default to Hospital B (Critical)
  const [showFlightCorridors, setShowFlightCorridors] = useState(true);
  const [showCoverageRadius, setShowCoverageRadius] = useState(true);

  // Mesh corridor connections between hospital nodes
  const connections = [
    { from: "hosp-a", to: "hosp-b", active: true },
    { from: "hosp-a", to: "hosp-c", active: false },
    { from: "hosp-a", to: "hosp-d", active: true },
    { from: "hosp-a", to: "hosp-e", active: false },
    { from: "hosp-a", to: "hosp-f", active: false },
    { from: "hosp-c", to: "hosp-b", active: false },
    { from: "hosp-c", to: "hosp-f", active: true },
    { from: "hosp-e", to: "hosp-f", active: false },
    { from: "hosp-d", to: "hosp-e", active: false },
  ];

  const getHospitalById = (id) => hospitals.find((h) => h.id === id);

  return (
    <section className="panel-container" id="network-map">
      <div className="panel-header-custom">
        <div className="panel-header-left">
          <span className="section-eyebrow">GEO-SPATIAL GRAPH TOPOLOGY</span>
          <h2 className="panel-title">Regional Emergency Mesh Map</h2>
          <p className="panel-subtitle">
            Interactive topology showing active UAV flight corridors, ground transfer routes, and supply nodes.
          </p>
        </div>
        <div className="panel-header-right">
          <span className="demo-badge-pill">
            {transfers.length} ACTIVE CORRIDORS (DEMO)
          </span>
        </div>
      </div>

      <div className="map-interactive-layout">
        {/* SVG Mesh Canvas */}
        <div className="map-canvas-container">
          {/* Map Controls Overlay */}
          <div className="map-toolbar">
            <button
              type="button"
              className={`map-tool-btn ${showFlightCorridors ? "active" : ""}`}
              onClick={() => setShowFlightCorridors(!showFlightCorridors)}
            >
              <DroneIcon size={14} />
              <span>Sky Corridors</span>
            </button>
            <button
              type="button"
              className={`map-tool-btn ${showCoverageRadius ? "active" : ""}`}
              onClick={() => setShowCoverageRadius(!showCoverageRadius)}
            >
              <MeshIcon size={14} />
              <span>Coverage Radii</span>
            </button>
            <div className="map-legend-strip">
              <span className="legend-item"><span className="legend-dot green"></span> Healthy</span>
              <span className="legend-item"><span className="legend-dot yellow"></span> Warning</span>
              <span className="legend-item"><span className="legend-dot red"></span> Critical</span>
              <span className="legend-item"><span className="legend-line pulse"></span> In Transit</span>
            </div>
          </div>

          <svg
            className="mesh-svg-canvas"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Radial gradient for central hub */}
              <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff4760" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ff4760" stopOpacity="0" />
              </radialGradient>

              {/* Linear gradient for active corridor line */}
              <linearGradient id="activeLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4760" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background grid markings */}
            <g className="svg-grid-lines" opacity="0.15">
              <line x1="10" y1="20" x2="90" y2="20" stroke="#3b82f6" strokeWidth="0.3" strokeDasharray="1,2" />
              <line x1="10" y1="50" x2="90" y2="50" stroke="#3b82f6" strokeWidth="0.3" strokeDasharray="1,2" />
              <line x1="10" y1="80" x2="90" y2="80" stroke="#3b82f6" strokeWidth="0.3" strokeDasharray="1,2" />
              <line x1="30" y1="10" x2="30" y2="90" stroke="#3b82f6" strokeWidth="0.3" strokeDasharray="1,2" />
              <line x1="60" y1="10" x2="60" y2="90" stroke="#3b82f6" strokeWidth="0.3" strokeDasharray="1,2" />
            </g>

            {/* Coverage Radii Circles */}
            {showCoverageRadius &&
              hospitals.map((h) => (
                <circle
                  key={`radius-${h.id}`}
                  cx={h.coordinates.x}
                  cy={h.coordinates.y}
                  r={h.state === "Critical" ? 12 : 9}
                  fill="none"
                  stroke={
                    h.state === "Critical"
                      ? "#ff4760"
                      : h.state === "Warning"
                      ? "#f59e0b"
                      : "#10b981"
                  }
                  strokeWidth="0.4"
                  strokeDasharray="1,1.5"
                  opacity={h.state === "Critical" ? 0.45 : 0.25}
                  className={h.state === "Critical" ? "pulse-radius" : ""}
                />
              ))}

            {/* Mesh Connection Lines */}
            {connections.map((conn, idx) => {
              const fromH = getHospitalById(conn.from);
              const toH = getHospitalById(conn.to);
              if (!fromH || !toH) return null;

              return (
                <g key={`conn-${idx}`}>
                  <line
                    x1={fromH.coordinates.x}
                    y1={fromH.coordinates.y}
                    x2={toH.coordinates.x}
                    y2={toH.coordinates.y}
                    stroke={conn.active && showFlightCorridors ? "url(#activeLineGrad)" : "#1e2f4f"}
                    strokeWidth={conn.active ? "0.8" : "0.4"}
                    strokeDasharray={conn.active ? "2,1" : "none"}
                    className={conn.active ? "active-corridor-line" : ""}
                  />
                  {/* Moving pulse dot along active transfer routes */}
                  {conn.active && showFlightCorridors && (
                    <circle
                      r="1.2"
                      fill="#ff4760"
                      filter="url(#glow)"
                      className="flowing-uav-packet"
                    >
                      <animateMotion
                        path={`M ${fromH.coordinates.x} ${fromH.coordinates.y} L ${toH.coordinates.x} ${toH.coordinates.y}`}
                        dur="4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Hospital Nodes */}
            {hospitals.map((hospital) => {
              const isSelected = selectedNode?.id === hospital.id;
              const isCritical = hospital.state === "Critical";
              const isWarning = hospital.state === "Warning";

              let nodeColor = "#10b981"; // Healthy green
              if (isCritical) nodeColor = "#ff4760"; // Coral red
              else if (isWarning) nodeColor = "#f59e0b"; // Warning amber

              return (
                <g
                  key={`node-${hospital.id}`}
                  className="interactive-hospital-node"
                  onClick={() => setSelectedNode(hospital)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle
                      cx={hospital.coordinates.x}
                      cy={hospital.coordinates.y}
                      r="5.5"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="0.7"
                      strokeDasharray="1.5,1.5"
                      className="selection-ring-rotate"
                    />
                  )}

                  {/* Pulsing ring for critical nodes */}
                  {isCritical && (
                    <circle
                      cx={hospital.coordinates.x}
                      cy={hospital.coordinates.y}
                      r="4.5"
                      fill="none"
                      stroke="#ff4760"
                      strokeWidth="0.6"
                      opacity="0.8"
                      className="critical-node-ping"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    cx={hospital.coordinates.x}
                    cy={hospital.coordinates.y}
                    r={isSelected ? "3.2" : "2.6"}
                    fill="#111c33"
                    stroke={nodeColor}
                    strokeWidth={isSelected ? "1.2" : "0.9"}
                    filter="url(#glow)"
                  />

                  {/* Cross Icon Mark in Node */}
                  <text
                    x={hospital.coordinates.x}
                    y={hospital.coordinates.y + 0.9}
                    textAnchor="middle"
                    fill={nodeColor}
                    fontSize="2.4"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    ✚
                  </text>

                  {/* Node Label */}
                  <text
                    x={hospital.coordinates.x}
                    y={hospital.coordinates.y + (hospital.coordinates.y > 70 ? -5 : 5.8)}
                    textAnchor="middle"
                    fill={isSelected ? "#ffffff" : "#9aa9c4"}
                    fontSize="2.6"
                    fontWeight={isSelected ? "700" : "500"}
                    className="map-node-label"
                  >
                    {hospital.name}
                  </text>
                  <text
                    x={hospital.coordinates.x}
                    y={hospital.coordinates.y + (hospital.coordinates.y > 70 ? -2.4 : 8.4)}
                    textAnchor="middle"
                    fill={isCritical ? "#ff4760" : "#6f7d98"}
                    fontSize="2.0"
                    fontWeight="500"
                  >
                    {hospital.stock}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Telemetry Sidebar */}
        <div className="map-node-telemetry-panel">
          {selectedNode ? (
            <div className="node-detail-card">
              <div className="node-detail-header">
                <div className="node-icon-status">
                  <div className={`node-cross-icon ${selectedNode.state.toLowerCase()}`}>✚</div>
                  <div>
                    <h3 className="node-name">{selectedNode.name}</h3>
                    <p className="node-facility">{selectedNode.facility}</p>
                  </div>
                </div>
                <span className={`status-badge-tag ${selectedNode.state.toLowerCase()}`}>
                  {selectedNode.state}
                </span>
              </div>

              {selectedNode.alertNote && (
                <div className="node-alert-box">
                  <span>{selectedNode.alertNote}</span>
                </div>
              )}

              <div className="node-metric-rows">
                <div className="node-metric-row">
                  <span className="metric-key">Location:</span>
                  <strong className="metric-val">{selectedNode.location} ({selectedNode.zone})</strong>
                </div>
                <div className="node-metric-row">
                  <span className="metric-key">Available Units:</span>
                  <strong className="metric-val">{selectedNode.stock}</strong>
                </div>
                <div className="node-metric-row">
                  <span className="metric-key">Universal O- Negative:</span>
                  <strong className={`metric-val ${selectedNode.bloodStock["O-"] === 0 ? "text-danger" : ""}`}>
                    {selectedNode.bloodStock["O-"]} units
                  </strong>
                </div>
                <div className="node-metric-row">
                  <span className="metric-key">Hub Distance:</span>
                  <strong className="metric-val">{selectedNode.distanceKm} km from Central Hub</strong>
                </div>
                <div className="node-metric-row">
                  <span className="metric-key">Drone Relays Assigned:</span>
                  <strong className="metric-val">{selectedNode.activeDrones} UAV Units</strong>
                </div>
              </div>

              <div className="node-quick-types">
                <span className="types-title">Live Stock Distribution:</span>
                <div className="types-mini-pills">
                  {Object.entries(selectedNode.bloodStock).map(([grp, qty]) => (
                    <span key={grp} className={`type-mini-pill ${qty === 0 ? "zero" : ""}`}>
                      {grp}: <strong>{qty}</strong>
                    </span>
                  ))}
                </div>
              </div>

              <div className="node-actions-area">
                <button
                  type="button"
                  className="btn-primary-node-action"
                  onClick={() => onSelectHospital(selectedNode)}
                >
                  <DroneIcon size={15} />
                  Simulate Transfer to {selectedNode.name}
                </button>
              </div>
            </div>
          ) : (
            <div className="no-node-selected">
              <MeshIcon size={28} />
              <p>Click any hospital node on the map to inspect telemetry.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
