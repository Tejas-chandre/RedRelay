import { useState } from "react";
import { AlertIcon, CloseIcon, SparklesIcon, ArrowRightIcon } from "./Icons";

export function FloatingActions({ onEmergencyClick, hospitals, transfers }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [activeQuery, setActiveQuery] = useState(null);
  const [assistantReply, setAssistantReply] = useState(null);

  const totalOStock = hospitals.reduce((acc, h) => acc + (h.bloodStock["O-"] || 0), 0);
  const criticalHospitals = hospitals.filter((h) => h.state === "Critical");
  const surplusHospitals = hospitals.filter((h) => h.totalUnits > 40);

  const handleQuery = (type) => {
    setActiveQuery(type);
    if (type === "o-negative") {
      setAssistantReply(
        `Critical universal O- negative reserve stands at ${totalOStock} units across all 6 facilities. Hospital A holds the highest reserve (${hospitals[0]?.bloodStock["O-"] || 0} units), while Hospital B and Hospital F have zero O- units in stock.`
      );
    } else if (type === "surplus") {
      const surplusNames = surplusHospitals.map(h => `${h.name} (${h.totalUnits} units)`).join(", ");
      setAssistantReply(
        `Optimal donor facilities with high reserves (>40 units): ${surplusNames || "Hospital A"}. Both are cleared for immediate UAV transfer.`
      );
    } else if (type === "transfers") {
      setAssistantReply(
        `There are currently ${transfers.length} active automated transfers in progress in the regional grid. Earliest arrival is scheduled for ~${transfers[0]?.etaMinutes || 6} minutes.`
      );
    } else if (type === "critical") {
      setAssistantReply(
        `${criticalHospitals.length} facilities currently flagged in Critical Deficit: ${criticalHospitals.map(h => h.name).join(", ")}. Immediate algorithmic rebalancing recommended.`
      );
    }
  };

  return (
    <>
      {/* Floating Action Buttons Container */}
      <div className="floating-actions-container">
        {/* Floating Emergency Support Button */}
        <button
          type="button"
          className="btn-floating-emergency"
          onClick={onEmergencyClick}
          title="Instant Emergency Redistribution Dispatch"
          aria-label="Emergency SOS Dispatch"
        >
          <span className="emergency-floating-ping"></span>
          <AlertIcon size={20} />
          <span className="floating-btn-text">Emergency Support</span>
        </button>

        {/* Floating Network Assistant Button */}
        <button
          type="button"
          className="btn-floating-assistant"
          onClick={() => setAssistantOpen(!assistantOpen)}
          title="Open AI Network Telemetry Assistant"
          aria-label="Open Network Assistant"
        >
          <SparklesIcon size={20} />
          <span className="floating-btn-text">Network Assistant</span>
        </button>
      </div>

      {/* Interactive Network Assistant Drawer / Modal */}
      {assistantOpen && (
        <div className="assistant-floating-drawer" role="dialog" aria-labelledby="assistant-title">
          <div className="assistant-drawer-header">
            <div className="assistant-header-title">
              <div className="assistant-dot-active"></div>
              <SparklesIcon size={16} />
              <h4 id="assistant-title">RedRelay Network Assistant</h4>
            </div>
            <button
              type="button"
              className="assistant-close-btn"
              onClick={() => {
                setAssistantOpen(false);
                setAssistantReply(null);
                setActiveQuery(null);
              }}
              aria-label="Close Assistant"
            >
              <CloseIcon size={16} />
            </button>
          </div>

          <div className="assistant-drawer-body">
            <p className="assistant-intro">
              Ask real-time telemetry questions regarding regional blood reserves, deficit alerts, and UAV corridors:
            </p>

            <div className="assistant-quick-prompts">
              <button
                type="button"
                className={`prompt-chip ${activeQuery === "o-negative" ? "active" : ""}`}
                onClick={() => handleQuery("o-negative")}
              >
                Check universal O- reserves
              </button>
              <button
                type="button"
                className={`prompt-chip ${activeQuery === "critical" ? "active" : ""}`}
                onClick={() => handleQuery("critical")}
              >
                Which hospitals are critical?
              </button>
              <button
                type="button"
                className={`prompt-chip ${activeQuery === "surplus" ? "active" : ""}`}
                onClick={() => handleQuery("surplus")}
              >
                Identify top surplus donor hubs
              </button>
              <button
                type="button"
                className={`prompt-chip ${activeQuery === "transfers" ? "active" : ""}`}
                onClick={() => handleQuery("transfers")}
              >
                Active in-transit corridors
              </button>
            </div>

            {assistantReply && (
              <div className="assistant-response-bubble">
                <div className="assistant-avatar-badge">
                  <SparklesIcon size={14} />
                </div>
                <div className="assistant-reply-content">
                  <p>{assistantReply}</p>
                </div>
              </div>
            )}
          </div>

          <div className="assistant-drawer-footer">
            <button
              type="button"
              className="btn-assistant-action"
              onClick={() => {
                setAssistantOpen(false);
                onEmergencyClick();
              }}
            >
              Open Simulator Controller
              <ArrowRightIcon size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
