import { PulseIcon, ArrowRightIcon, SparklesIcon, CheckIcon, MeshIcon, BloodDropIcon } from "./Icons";

export function HeroSection({ onExploreNetwork, onHowItWorks }) {
  return (
    <section className="hero-large-immersive" id="home">
      {/* Background Graphic & Dark Navy Overlays */}
      <div className="hero-navy-backdrop"></div>
      <div className="hero-mesh-network-visual">
        <svg
          className="hero-network-svg"
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="meshRadialGlow" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#ff4760" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#080e1e" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="corridorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4760" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Ambient Glow */}
          <rect width="1200" height="600" fill="url(#meshRadialGlow)" />

          {/* Network Connection Lines */}
          <g stroke="url(#corridorGradient)" strokeWidth="1.2" opacity="0.45" strokeDasharray="3,3">
            <line x1="150" y1="180" x2="380" y2="120" />
            <line x1="380" y1="120" x2="620" y2="240" />
            <line x1="620" y1="240" x2="840" y2="140" />
            <line x1="840" y1="140" x2="1050" y2="220" />
            <line x1="220" y1="360" x2="380" y2="120" />
            <line x1="220" y1="360" x2="520" y2="440" />
            <line x1="520" y1="440" x2="620" y2="240" />
            <line x1="620" y1="240" x2="780" y2="420" />
            <line x1="780" y1="420" x2="980" y2="380" />
            <line x1="980" y1="380" x2="1050" y2="220" />
          </g>

          {/* Network Nodes with pulsating rings */}
          {[
            { cx: 380, cy: 120, color: "#10b981", label: "Central Regional Bank (Surplus)" },
            { cx: 620, cy: 240, color: "#ff4760", label: "City Trauma ER (Critical Deficit)" },
            { cx: 840, cy: 140, color: "#10b981", label: "North Specialty Hospital" },
            { cx: 520, cy: 440, color: "#f59e0b", label: "East Care Center (Warning)" },
            { cx: 220, cy: 360, color: "#10b981", label: "South General Hospital" },
            { cx: 980, cy: 380, color: "#ff4760", label: "West Emergency Trauma Center" },
          ].map((node, i) => (
            <g key={i}>
              <circle cx={node.cx} cy={node.cy} r="18" fill="none" stroke={node.color} strokeWidth="1" opacity="0.3" className="hero-ping-node" />
              <circle cx={node.cx} cy={node.cy} r="6" fill={node.color} />
              <circle cx={node.cx} cy={node.cy} r="2" fill="#ffffff" />
            </g>
          ))}
        </svg>
      </div>

      <div className="hero-content-wrapper">
        {/* Top pill badge */}
        <div className="hero-eyebrow-pill">
          <span className="hero-mint-dot"></span>
          <span className="eyebrow-tag">NEXT-GEN BLOOD SUPPLY INTELLIGENCE</span>
          <span className="eyebrow-sep">•</span>
          <span className="eyebrow-sub">Autonomous Hospital Mesh Active</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-headline-large">
          Every Second Counts. <br />
          <span className="headline-coral-highlight">Every Unit Matters.</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subheadline-spacious">
          Connecting Blood Banks for faster, smarter emergency care  </p>

        {/* CTA Buttons */}
        <div className="hero-action-buttons">
          <button
            type="button"
            className="btn-hero-primary-coral"
            onClick={onExploreNetwork}
          >
            <MeshIcon size={19} />
            Explore the Network
            <ArrowRightIcon size={17} />
          </button>

          <button
            type="button"
            className="btn-hero-secondary-glass"
            onClick={onHowItWorks}
          >
            <SparklesIcon size={17} />
            How It Works
          </button>
        </div>

        {/* Trust Indicators Strip */}
        <div className="hero-trust-indicators-strip">
          <div className="trust-indicator-item">
            <div className="trust-check-icon mint">
              <CheckIcon size={16} />
            </div>
            <div className="trust-text-block">
              <span className="trust-title">Real-Time Network</span>
              <span className="trust-desc">Connected IoT Blood Banks</span>
            </div>
          </div>

          <div className="trust-divider"></div>

          <div className="trust-indicator-item">
            <div className="trust-check-icon coral">
              <PulseIcon size={16} />
            </div>
            <div className="trust-text-block">
              <span className="trust-title">Smart Redistribution</span>
              <span className="trust-desc">Automated Sky & Ground Corridors</span>
            </div>
          </div>

          <div className="trust-divider"></div>

          <div className="trust-indicator-item">
            <div className="trust-check-icon mint">
              <BloodDropIcon size={16} />
            </div>
            <div className="trust-text-block">
              <span className="trust-title">Expiry Awareness</span>
              <span className="trust-desc">Zero Wastage Deficit Prediction</span>
            </div>
          </div>
        </div>

        {/* Clear Demo Label */}
        <div className="hero-footer-demo-pill">
          <span className="demo-tag-clean">LIVE DEMO NETWORK</span>
          <span>
            Simulated for Nashik Regional Medical Grid (6 Facilities) • Zero Backend Modifications
          </span>
        </div>
      </div>
    </section>
  );
}
