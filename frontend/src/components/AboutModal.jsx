import { CloseIcon, MeshIcon } from "./Icons";

export function AboutModal({ isOpen, onClose, onExploreClick }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card about-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <CloseIcon size={18} />
        </button>

        <div className="modal-header">
          <div className="modal-icon-badge coral-badge">
            <MeshIcon size={24} />
          </div>
          <h3 id="about-modal-title" className="modal-title">
            How RedRelay Works
          </h3>
          <p className="modal-subtitle">
            Autonomous Peer-to-Peer Blood Inventory Balancing & Emergency Corridor Mesh
          </p>
        </div>

        <div className="about-steps-container">
          <div className="about-step-card">
            <div className="step-badge-number">1</div>
            <div className="step-content">
              <h4>Continuous Telemetry & Deficit Early Warning</h4>
              <p>
                Connected blood banks feed live cold-chain RFID inventory data.
                When trauma admissions surge, the system detects critical deficits (such as universal O- depletion)
                before clinical stockouts occur.
              </p>
            </div>
          </div>

          <div className="about-step-card">
            <div className="step-badge-number">2</div>
            <div className="step-content">
              <h4>Graph Mesh Optimization & Donor Matching</h4>
              <p>
                Instead of relying on slow centralized bureaucratic requests,
                the mesh algorithm scans neighboring network nodes. It scores candidates based on
                physical travel distance, current surplus reserves, and transport viability.
              </p>
            </div>
          </div>

          <div className="about-step-card">
            <div className="step-badge-number">3</div>
            <div className="step-content">
              <h4>Autonomous Dispatch & Sky Corridor Transit</h4>
              <p>
                Transfers are immediately dispatched via Autonomous UAV Drones or priority police
                green corridors. Real-time telemetry tracks cold-chain temperature and ETA to delivery bays.
              </p>
            </div>
          </div>
        </div>

        <div className="about-tech-summary">
          <div className="tech-badge-item">
            <span className="tech-title">System Architecture:</span>
            <span>React 19 SPA • Real-time Graph Mesh • Microservice Telemetry</span>
          </div>
          <div className="tech-badge-item">
            <span className="tech-title">Demo Scope:</span>
            <span>Simulated for Nashik Regional Medical Trauma Network (6 Connected Facilities)</span>
          </div>
        </div>

        <div className="about-actions-row">
          <button
            type="button"
            className="btn-primary-about"
            onClick={() => {
              onClose();
              onExploreClick();
            }}
          >
            Explore Interactive Grid
          </button>
        </div>
      </div>
    </div>
  );
}
