import { PulseIcon, DroneIcon, BloodDropIcon, CheckIcon, SparklesIcon } from "./Icons";

export function ImpactSection() {
  const impactStats = [
    {
      metric: "< 8 min",
      label: "Average Emergency Dispatch",
      subtext: "Compared to 48+ minutes through legacy centralized bureaucratic requests.",
      icon: <PulseIcon size={22} />,
      accent: "coral",
    },
    {
      metric: "0%",
      label: "Expiry Wastage Rate",
      subtext: "Units nearing expiration are prioritized and proactively routed to high-demand surgical bays.",
      icon: <BloodDropIcon size={22} />,
      accent: "mint",
    },
    {
      metric: "100%",
      label: "Cold-Chain Traceability",
      subtext: "Continuous temperature telemetry throughout drone flights and emergency ground corridors.",
      icon: <CheckIcon size={22} />,
      accent: "mint",
    },
    {
      metric: "6 / 6",
      label: "Facilities Synced in Real-Time",
      subtext: "Level-1 trauma centers, municipal hospitals, and specialty surgical centers linked seamlessly.",
      icon: <DroneIcon size={22} />,
      accent: "cyan",
    },
  ];

  return (
    <section className="section-clean-wrapper impact-bg" id="impact">
      <div className="section-container">
        {/* Section Heading */}
        <div className="section-heading-centered">
          <span className="section-pill-eyebrow">MEASURABLE IMPACT</span>
          <h2 className="section-title-large">
            Every Second Saved Protects Human Life
          </h2>
          <p className="section-subtitle-wide">
            Intelligent distribution transforms critical care outcomes across regional trauma corridors.
          </p>
        </div>

        {/* Impact Cards Grid */}
        <div className="impact-stats-grid">
          {impactStats.map((item, idx) => (
            <div key={idx} className={`impact-card-modern ${item.accent}`}>
              <div className="impact-card-top">
                <div className={`impact-icon-badge ${item.accent}`}>
                  {item.icon}
                </div>
                <span className="impact-tag">VERIFIED DEMO METRIC</span>
              </div>
              <div className="impact-number-row">
                <span className="impact-big-number">{item.metric}</span>
              </div>
              <h3 className="impact-label">{item.label}</h3>
              <p className="impact-subtext">{item.subtext}</p>
            </div>
          ))}
        </div>

        {/* Clinical Scenario Outcome Callout */}
        <div className="impact-callout-card">
          <div className="callout-icon-wrap">
            <SparklesIcon size={28} />
          </div>
          <div className="callout-body">
            <h4>Maharashtra Regional Trauma Pilot Scenario</h4>
            <p>
              "During highway multi-vehicle collisions on the NH-3 corridor, access to immediate universal O-
              negative units historically required frantic inter-hospital phone calls. With RedRelay's autonomous
              mesh routing, Hospital B received life-saving units from Hospital A within 6 minutes via autonomous UAV drone."
            </p>
            <span className="callout-author">
              — Dr. Sarah Rao, Regional Emergency Dispatch Coordinator (Simulated Case Study)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
