import { PulseIcon, DroneIcon, BloodDropIcon, ArrowRightIcon } from "./Icons";

export function HowItWorksSection({ onExploreNetwork }) {
  const steps = [
    {
      number: "01",
      title: "Real-Time Telemetry & Expiry Awareness",
      desc: "Connected blood banks and storage bays stream automated RFID cold-chain telemetry. The network monitors vital temperatures, volume, and exact unit expiry timestamps 24/7.",
      icon: <BloodDropIcon size={24} />,
      accent: "mint",
      stat: "100% Traceability",
    },
    {
      number: "02",
      title: "Intelligent Deficit Prediction",
      desc: "When trauma emergencies or high-consumption surgeries strike, the graph algorithm calculates real-time burn rates. It predicts stockouts hours before clinical supplies are depleted.",
      icon: <PulseIcon size={24} />,
      accent: "coral",
      stat: "< 120ms Calculation",
    },
    {
      number: "03",
      title: "Autonomous Redistribution Mesh",
      desc: "Instead of phone calls and delayed paperwork, RedRelay pairs the deficit hospital with the nearest surplus facility, auto-authorizing UAV sky-corridors or green-lane ground transports.",
      icon: <DroneIcon size={24} />,
      accent: "cyan",
      stat: "< 8 min Avg Reroute",
    },
  ];

  return (
    <section className="section-clean-wrapper" id="how-it-works">
      <div className="section-container">
        {/* Section Heading */}
        <div className="section-heading-centered">
          <span className="section-pill-eyebrow">HOW IT WORKS</span>
          <h2 className="section-title-large">
            Three Steps to Zero Avoidable Shortages
          </h2>
          <p className="section-subtitle-wide">
            Transforming fragmented regional blood banks into a synchronized, resilient, peer-to-peer survival mesh.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="how-it-works-steps-grid">
          {steps.map((step) => (
            <div key={step.number} className={`step-card-modern ${step.accent}`}>
              <div className="step-card-header">
                <span className="step-big-number">{step.number}</span>
                <div className={`step-icon-bubble ${step.accent}`}>
                  {step.icon}
                </div>
              </div>

              <h3 className="step-card-title">{step.title}</h3>
              <p className="step-card-desc">{step.desc}</p>

              <div className="step-card-footer">
                <span className="step-stat-badge">{step.stat}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
