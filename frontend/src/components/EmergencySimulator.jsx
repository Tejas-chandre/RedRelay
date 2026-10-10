import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  PulseIcon,
  CheckIcon,
  RefreshIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "./Icons";
import { DEMO_PRESET_SCENARIOS } from "../data/mockData";
import { API_BASE_URL } from "../services/apiClient";

const socket = io(new URL(API_BASE_URL).origin);

export function EmergencySimulator({
  hospitals,
  onExecuteSimulation,
  onResetSimulation,
  prefilledHospital,
}) {
  const [selectedScenarioId, setSelectedScenarioId] = useState("custom");
  const [targetHospitalId, setTargetHospitalId] = useState(
    prefilledHospital?.id || "hosp-b"
  );
  const [bloodType, setBloodType] = useState("O-");
  const [unitsRequested, setUnitsRequested] = useState(4);
  const [transportMode, setTransportMode] = useState("Autonomous Drone UAV");
  const [urgencyLevel, setUrgencyLevel] = useState("Emergency (Code Red)");

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [simulationResult, setSimulationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Set up WebSocket listeners for the real MILP solver
  useEffect(() => {
    socket.on("MANIFEST_GENERATED", (manifest) => {
      setSimulationStep(4);

      // The backend returns an array of routes. We take the primary one.
      const primaryRoute = manifest.routes[0];

      if (primaryRoute) {
        setSimulationResult({
          manifestId: manifest.manifest_id,
          routingCost: manifest.total_routing_cost,
          transfer: {
            id: manifest.manifest_id,
            bloodType: manifest.blood_group,
            units: primaryRoute.units,
            carrier: transportMode,
            etaMinutes: manifest.total_routing_cost,
            urgency: urgencyLevel,
          },
          donor: { name: primaryRoute.from, facility: "Identified Node" },
          target: { name: "Trauma Center", location: manifest.emergency_node },
          unitsTransferred: primaryRoute.units,
        });

        if (onExecuteSimulation) {
          onExecuteSimulation(primaryRoute.from, manifest.emergency_node, manifest.blood_group, primaryRoute.units, manifest);
        }
      }

      setIsSimulating(false);
    });

    socket.on("MANIFEST_FAILED", (data) => {
      setErrorMsg(data.error);
      setIsSimulating(false);
      setSimulationStep(0);
    });

    return () => {
      socket.off("MANIFEST_GENERATED");
      socket.off("MANIFEST_FAILED");
    };
  }, [transportMode, urgencyLevel, onExecuteSimulation]);

  const handleSelectPreset = (scenario) => {
    setSelectedScenarioId(scenario.id);
    setTargetHospitalId(scenario.targetHospitalId);
    setBloodType(scenario.bloodTypeNeeded);
    setUnitsRequested(scenario.unitsNeeded);
    setUrgencyLevel(scenario.severity);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationStep(1);
    setSimulationResult(null);
    setErrorMsg(null);

    // Emit the event to your real backend MILP solver!
    // Note: ensure targetHospitalId matches a real MongoDB _id from your users collection
    socket.emit("TRAUMA_SURGE", {
      hospitalId: targetHospitalId,
      required_units: unitsRequested,
      bloodGroup: bloodType,
      componentType: "Platelets" // Hardcoded for the demo, or add to your UI
    });

    // Advance UI steps purely for visual effect while waiting for backend
    setTimeout(() => setSimulationStep(2), 800);
    setTimeout(() => setSimulationStep(3), 1600);
  };

  return (
    <section className="panel-container" id="emergency-simulator">
      <div className="panel-header-custom">
        <div className="panel-header-left">
          <span className="section-eyebrow">AUTONOMOUS ORCHESTRATION</span>
          <h2 className="panel-title">MILP Emergency Transfer Simulator</h2>
          <p className="panel-subtitle">
            Simulate surge incidents to trigger the real-time Python Operations Research engine.
          </p>
        </div>
        <div className="panel-header-right">
          <span className="demo-badge-pill">LIVE MILP SOLVER</span>
        </div>
      </div>

      <div className="simulator-grid-layout">
        {/* Left Column: Preset Scenarios */}
        <div className="simulator-presets-card">
          <div className="presets-card-header">
            <SparklesIcon size={18} />
            <span className="card-title-strong">Preset Trauma Incidents</span>
          </div>
          <p className="presets-help-text">
            Select a verified simulated scenario or build a custom incident:
          </p>

          <div className="preset-buttons-list">
            {DEMO_PRESET_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                className={`preset-scenario-item ${selectedScenarioId === sc.id ? "selected" : ""
                  }`}
                onClick={() => handleSelectPreset(sc)}
              >
                <div className="preset-item-header">
                  <span className="preset-item-title">{sc.title}</span>
                  <span className="preset-severity-badge">{sc.severity}</span>
                </div>
                <p className="preset-item-desc">{sc.description}</p>
                <div className="preset-footer-meta">
                  <span className="meta-tag">Needed: {sc.unitsNeeded}u {sc.bloodTypeNeeded}</span>
                  <span className="meta-target">→ {sc.targetHospitalName}</span>
                </div>
              </button>
            ))}

            <button
              type="button"
              className={`preset-scenario-item custom-choice ${selectedScenarioId === "custom" ? "selected" : ""
                }`}
              onClick={() => setSelectedScenarioId("custom")}
            >
              <div className="preset-item-header">
                <span className="preset-item-title">Custom Emergency Incident</span>
                <span className="preset-severity-badge">Manual Parameters</span>
              </div>
              <p className="preset-item-desc">
                Configure your own target hospital, blood group deficit, volume, and dispatch mode.
              </p>
            </button>
          </div>
        </div>

        {/* Right Column: Parameters & Execution Controller */}
        <div className="simulator-controls-card">
          <div className="controls-card-header">
            <PulseIcon size={18} />
            <span className="card-title-strong">Incident Configuration</span>
          </div>

          <div className="simulator-form-grid">
            {/* Target Hospital */}
            <div className="form-field">
              <label htmlFor="target-hospital">Destination Hospital in Deficit:</label>
              <select
                id="target-hospital"
                value={targetHospitalId}
                onChange={(e) => setTargetHospitalId(e.target.value)}
                className="sim-input-select"
                disabled={isSimulating}
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.facility}
                  </option>
                ))}
              </select>
            </div>

            {/* Blood Type Deficit */}
            <div className="form-field">
              <label htmlFor="blood-type">Required Blood Product:</label>
              <select
                id="blood-type"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="sim-input-select"
                disabled={isSimulating}
              >
                <option value="O-">O- (Universal Emergency RBCs)</option>
                <option value="O+">O+ (Positive Whole Blood)</option>
                <option value="A+">A+ (Whole Blood / Packed Cells)</option>
                <option value="A-">A- (Rare Emergency Type)</option>
                <option value="B+">B+ (Whole Blood / Packed Cells)</option>
                <option value="B-">B- (Negative Type)</option>
                <option value="AB+">AB+ (Universal Plasma Recipient)</option>
                <option value="AB-">AB- (Rare Donor)</option>
              </select>
            </div>

            {/* Units Needed */}
            <div className="form-field">
              <label htmlFor="units-range">
                Units Required: <strong>{unitsRequested} units</strong>
              </label>
              <div className="range-with-badges">
                <input
                  id="units-range"
                  type="range"
                  min="1"
                  max="100"
                  value={unitsRequested}
                  onChange={(e) => setUnitsRequested(Number(e.target.value))}
                  className="sim-range-slider"
                  disabled={isSimulating}
                />
                <span className="slider-badge-val">{unitsRequested} Units</span>
              </div>
            </div>

            {/* Transport Mode */}
            <div className="form-field">
              <label htmlFor="transport-mode">Dispatch Corridor Mode:</label>
              <select
                id="transport-mode"
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className="sim-input-select"
                disabled={isSimulating}
              >
                <option value="Autonomous Drone UAV">Autonomous SkyCorridor UAV Drone (&lt; 8 min)</option>
                <option value="Green Corridor Ambulance">Police Green Corridor Ambulance (Ground)</option>
                <option value="Regional Trauma Courier">Rapid Response Van</option>
              </select>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="sim-buttons-action-row">
            <button
              type="button"
              className="btn-run-simulation"
              onClick={handleRunSimulation}
              disabled={isSimulating}
            >
              {isSimulating ? (
                <>
                  <span className="sim-spinner"></span>
                  Running MILP Optimizer...
                </>
              ) : (
                <>
                  <PulseIcon size={18} />
                  Run Emergency Simulation
                  <ArrowRightIcon size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-reset-simulation-engine"
              onClick={() => {
                setSimulationResult(null);
                setErrorMsg(null);
                if (onResetSimulation) onResetSimulation();
              }}
              disabled={isSimulating}
              title="Reset view"
            >
              <RefreshIcon size={16} />
              Reset State
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div style={{ color: 'red', marginTop: '10px', fontWeight: 'bold' }}>
              Alert: {errorMsg}
            </div>
          )}

          {/* Simulation Progress Stepper */}
          {isSimulating && (
            <div className="sim-progress-stepper">
              <div className={`step-item ${simulationStep >= 1 ? "done" : ""}`}>
                <span className="step-num">1</span>
                <span>Ingesting Telemetry</span>
              </div>
              <div className={`step-item ${simulationStep >= 2 ? "done" : ""}`}>
                <span className="step-num">2</span>
                <span>Scanning Graph Topology</span>
              </div>
              <div className={`step-item ${simulationStep >= 3 ? "done" : ""}`}>
                <span className="step-num">3</span>
                <span>Python MILP Calculating</span>
              </div>
              <div className={`step-item ${simulationStep >= 4 ? "done" : ""}`}>
                <span className="step-num">4</span>
                <span>Dispatching Fleet</span>
              </div>
            </div>
          )}

          {/* Simulation Success Output Banner */}
          {simulationResult && !isSimulating && (
            <div className="sim-result-banner">
              <div className="result-banner-top">
                <div className="result-check-badge">
                  <CheckIcon size={20} />
                </div>
                <div>
                  <h4 className="result-title">
                    MILP Transfer Successfully Orchestrated!
                  </h4>
                  <span className="result-id">
                    Transfer ID: {simulationResult.transfer.id} | {simulationResult.transfer.urgency}
                  </span>
                </div>
              </div>

              <div className="result-details-grid">
                <div className="result-cell">
                  <span className="result-label">Optimal Donor Hub:</span>
                  <strong className="result-val text-emerald">
                    {simulationResult.donor.name} (Matched via Graph)
                  </strong>
                </div>
                <div className="result-cell">
                  <span className="result-label">Deficit Recipient:</span>
                  <strong className="result-val text-coral">
                    Node ID: {simulationResult.target.location}
                  </strong>
                </div>
                <div className="result-cell">
                  <span className="result-label">Units Dispatched:</span>
                  <strong className="result-val">
                    {simulationResult.unitsTransferred} units of {simulationResult.transfer.bloodType}
                  </strong>
                </div>
                <div className="result-cell">
                  <span className="result-label">Cost/Routing Score:</span>
                  <strong className="result-val">
                    {simulationResult.routingCost} (Lowest Spoilage & Travel Matrix)
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}