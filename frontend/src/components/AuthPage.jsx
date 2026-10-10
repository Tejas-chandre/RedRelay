import { useState } from "react";
import { BloodDropIcon, CheckIcon, CrossIcon, UserIcon } from "./Icons";
import { loginUser, registerUser } from "../services/authService";
import { FacilityLocationFields } from "./FacilityLocationFields";
import { hasValidCoordinates } from "../utils/facilityLocation";

function AuthLeftPanel({ mode }) {
  const features = [
    { icon: "🩸", title: "Real-Time Inventory", desc: "Live blood stock levels across all connected facilities" },
    { icon: "🚁", title: "UAV SkyCorridors", desc: "Autonomous drone dispatch for emergency transfers" },
    { icon: "🛡️", title: "Zero Wastage Protocol", desc: "AI-driven expiry tracking and redistribution alerts" },
    { icon: "⚡", title: "Smart Redistribution", desc: "Algorithmic surplus matching across the regional mesh" },
  ];

  return (
    <div className="auth-left-panel">
      <div className="auth-left-blob auth-left-blob-1" />
      <div className="auth-left-blob auth-left-blob-2" />
      <div className="auth-left-content">
        <div className="auth-left-logo">
          <div className="auth-left-logo-icon"><BloodDropIcon size={24} /></div>
          <div>
            <div className="auth-left-logo-wordmark">
              <span>Red</span><span className="auth-left-logo-mesh">Relay</span>
            </div>
            <span className="auth-left-logo-sub">Autonomous Lifeline Network</span>
          </div>
        </div>

        <div className="auth-left-headline-block">
          <h1 className="auth-left-headline">
            {mode === "login" ? "Welcome Back to the Network" : "Join the Emergency Grid"}
          </h1>
          <p className="auth-left-subtext">
            Connecting Blood Banks for faster, smarter emergency care
          </p>
        </div>

        <div className="auth-left-features">
          {features.map((feature) => (
            <div key={feature.title} className="auth-feature-card">
              <span className="auth-feature-icon">{feature.icon}</span>
              <div>
                <div className="auth-feature-title">{feature.title}</div>
                <div className="auth-feature-desc">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="auth-left-badge">
          <span className="auth-left-badge-dot" />
          <span>RedRelay Emergency Redistribution Network</span>
        </div>
      </div>
    </div>
  );
}

function RoleSelector({ selectedRole, onSelectRole, error }) {
  return (
    <div className="auth-role-selector">
      <label className="auth-field-label">
        Select Your Facility Role <span className="auth-required">*</span>
      </label>
      <div className="auth-role-cards">
        <button
          type="button"
          className={"auth-role-card" + (selectedRole === "hospital" ? " auth-role-selected" : "")}
          onClick={() => onSelectRole("hospital")}
          aria-pressed={selectedRole === "hospital"}
        >
          <div className="auth-role-card-top">
            <span className="auth-role-icon hospital-icon"><CrossIcon size={18} /></span>
            <span className={"auth-role-radio" + (selectedRole === "hospital" ? " auth-role-radio-active" : "")}>
              {selectedRole === "hospital" && <CheckIcon size={10} />}
            </span>
          </div>
          <strong className="auth-role-name">Hospital</strong>
          <span className="auth-role-desc">Emergency Trauma, ER Bays &amp; Surgery</span>
        </button>

        <button
          type="button"
          className={"auth-role-card" + (selectedRole === "blood_bank" ? " auth-role-selected" : "")}
          onClick={() => onSelectRole("blood_bank")}
          aria-pressed={selectedRole === "blood_bank"}
        >
          <div className="auth-role-card-top">
            <span className="auth-role-icon bloodbank-icon"><BloodDropIcon size={18} /></span>
            <span className={"auth-role-radio" + (selectedRole === "blood_bank" ? " auth-role-radio-active" : "")}>
              {selectedRole === "blood_bank" && <CheckIcon size={10} />}
            </span>
          </div>
          <strong className="auth-role-name">Blood Bank</strong>
          <span className="auth-role-desc">Regional Storage, Testing &amp; UAV Fleet</span>
        </button>
      </div>
      {error && <span className="auth-field-error">{error}</span>}
    </div>
  );
}

function LoginForm({ onLoginSuccess, currentRole, onRoleChange, onSwitchToSignup }) {
  const [selectedRole, setSelectedRole] = useState(currentRole || "hospital");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    onRoleChange?.(role);
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setErrors({ auth: "Please enter your email and password." });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const result = await loginUser({
        email: normalizedEmail,
        password,
        role: selectedRole,
      });
      onLoginSuccess?.(result.user);
    } catch (error) {
      setErrors({ auth: error.message || "Unable to sign in. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-right-form-wrapper">
      <div className="auth-form-header">
        <div className="auth-form-icon-badge"><UserIcon size={20} /></div>
        <h2 className="auth-form-title">Sign In to RedRelay</h2>
        <p className="auth-form-subtitle">Access hospital inventory telemetry and emergency dispatch.</p>
      </div>

      <div className="auth-demo-banner">
        <span className="auth-demo-tag">SECURE AUTHENTICATION</span>
        <span>Sign in with your registered facility account.</span>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <RoleSelector selectedRole={selectedRole} onSelectRole={handleRoleSelect} error={errors.role} />

        <div className="auth-field-group">
          <label className="auth-field-label" htmlFor="login-email">Official Medical / Staff Email</label>
          <input
            id="login-email"
            type="email"
            className={"auth-input" + (errors.email ? " auth-input-error" : "")}
            placeholder="name@hospital.org"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          {errors.email && <span className="auth-field-error">{errors.email}</span>}
        </div>

        <div className="auth-field-group">
          <div className="auth-label-row">
            <label className="auth-field-label" htmlFor="login-password">Password</label>
          </div>
          <input
            id="login-password"
            type="password"
            className={"auth-input" + (errors.password ? " auth-input-error" : "")}
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          {errors.password && <span className="auth-field-error">{errors.password}</span>}
        </div>

        {errors.auth && <div className="auth-general-error" role="alert">{errors.auth}</div>}

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? "Signing In..." : `Sign In as ${selectedRole === "hospital" ? "Hospital" : "Blood Bank"}`}
        </button>
      </form>

      <div className="auth-switch-row">
        <span>Don't have an account?</span>
        <button type="button" className="auth-switch-link" onClick={() => onSwitchToSignup(selectedRole)}>
          Create New Account
        </button>
      </div>
    </div>
  );
}

function SignupForm({ onSignupSuccess, currentRole, onRoleChange, onSwitchToLogin }) {
  const [selectedRole, setSelectedRole] = useState(currentRole || "hospital");
  const [fullName, setFullName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [facilityLocation, setFacilityLocation] = useState({
    address: "",
    city: "",
    state: "",
    pinCode: "",
    phone: "",
    latitude: "",
    longitude: "",
  });
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    onRoleChange?.(role);
    setErrors({});
  };

  const updateFacilityLocation = (field, value) => {
    setFacilityLocation((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = {};
    if (!fullName.trim()) validationErrors.fullName = "Enter your full name.";
    if (!facilityName.trim()) validationErrors.facilityName = "Enter your facility name.";
    if (!email.trim()) validationErrors.email = "Enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) validationErrors.email = "Enter a valid email.";
    for (const [field, label] of [
      ["address", "Full facility address"],
      ["city", "District / City"],
      ["state", "State"],
      ["pinCode", "PIN code"],
      ["phone", "Contact number"],
    ]) {
      if (!facilityLocation[field].trim()) validationErrors[field] = `${label} is required.`;
    }
    if (!hasValidCoordinates(facilityLocation.latitude, facilityLocation.longitude)) {
      validationErrors.coordinates = "Enter valid latitude and longitude for the facility.";
    }
    if (!locationConfirmed) validationErrors.locationConfirmation = "Confirm the address and facility pin.";
    if (password.length < 8) validationErrors.password = "Password must contain at least 8 characters.";
    if (password !== confirmPassword) validationErrors.confirmPassword = "Passwords do not match.";
    if (!agreedToTerms) validationErrors.terms = "Please accept the redistribution protocols.";

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const result = await registerUser({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: selectedRole,
        facility: facilityName.trim(),
        title: title.trim(),
        ...facilityLocation,
        latitude: Number(facilityLocation.latitude),
        longitude: Number(facilityLocation.longitude),
      });
      onSignupSuccess?.(result.user);
    } catch (error) {
      setErrors({ auth: error.message || "Registration failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-right-form-wrapper">
      <div className="auth-form-header">
        <div className="auth-form-icon-badge auth-form-icon-coral"><BloodDropIcon size={20} /></div>
        <h2 className="auth-form-title">Register Facility Account</h2>
        <p className="auth-form-subtitle">Join the autonomous peer-to-peer blood redistribution grid.</p>
      </div>

      <div className="auth-demo-banner">
        <span className="auth-demo-tag">FACILITY REGISTRATION</span>
        <span>Create an account for your hospital or blood bank.</span>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <RoleSelector selectedRole={selectedRole} onSelectRole={handleRoleSelect} error={errors.role} />

        <div className="auth-two-col">
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="signup-name">Full Name &amp; Credentials</label>
            <input id="signup-name" type="text" className="auth-input" placeholder="Dr. Rohan Kulkarni" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required />
            {errors.fullName && <span className="auth-field-error">{errors.fullName}</span>}
          </div>
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="signup-facility">{selectedRole === "hospital" ? "Hospital Name" : "Blood Bank / Depot Name"}</label>
            <input id="signup-facility" type="text" className="auth-input" placeholder="Enter facility name" value={facilityName} onChange={(event) => setFacilityName(event.target.value)} required />
            {errors.facilityName && <span className="auth-field-error">{errors.facilityName}</span>}
          </div>
        </div>

        <FacilityLocationFields
          idPrefix="signup"
          value={facilityLocation}
          onChange={updateFacilityLocation}
          confirmed={locationConfirmed}
          onConfirmChange={setLocationConfirmed}
        />
        {errors.coordinates && <span className="auth-field-error">{errors.coordinates}</span>}
        {errors.locationConfirmation && <span className="auth-field-error">{errors.locationConfirmation}</span>}
        {["address", "city", "state", "pinCode", "phone"].some((field) => errors[field]) && (
          <span className="auth-field-error">
            {["address", "city", "state", "pinCode", "phone"].filter((field) => errors[field]).map((field) => errors[field]).join(" ")}
          </span>
        )}

        <div className="auth-two-col">
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="signup-title">Official Title / Designation</label>
            <input id="signup-title" type="text" className="auth-input" placeholder={selectedRole === "hospital" ? "Emergency Trauma Surgeon" : "Blood Bank Director"} value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="signup-email">Official Medical Email</label>
            <input id="signup-email" type="email" className="auth-input" placeholder="staff@RedRelay.health" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            {errors.email && <span className="auth-field-error">{errors.email}</span>}
          </div>
        </div>

        <div className="auth-two-col">
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="signup-pass">Password (Minimum 8 characters)</label>
            <input id="signup-pass" type="password" className="auth-input" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
            {errors.password && <span className="auth-field-error">{errors.password}</span>}
          </div>
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="signup-confirm">Confirm Password</label>
            <input id="signup-confirm" type="password" className="auth-input" placeholder="Re-enter password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
            {errors.confirmPassword && <span className="auth-field-error">{errors.confirmPassword}</span>}
          </div>
        </div>

        <label className="auth-checkbox-label">
          <input type="checkbox" checked={agreedToTerms} onChange={(event) => setAgreedToTerms(event.target.checked)} />
          <span>I agree to the emergency redistribution protocols.</span>
        </label>
        {errors.terms && <div className="auth-field-error">{errors.terms}</div>}
        {errors.auth && <div className="auth-general-error" role="alert">{errors.auth}</div>}

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? "Creating Account..." : `Complete ${selectedRole === "hospital" ? "Hospital" : "Blood Bank"} Registration`}
        </button>
      </form>

      <div className="auth-switch-row">
        <span>Already have an account?</span>
        <button type="button" className="auth-switch-link" onClick={() => onSwitchToLogin(selectedRole)}>Sign In Instead</button>
      </div>
    </div>
  );
}

export function AuthPage({
  mode = "login",
  onLoginSuccess,
  onSignupSuccess,
  onClose,
  currentRole,
  onRoleChange,
  onSwitchMode,
}) {
  const navLinks = ["Home", "How It Works", "Network", "Impact", "About"];

  return (
    <div className="auth-page-root">
      <header className="auth-page-navbar">
        <div className="auth-page-navbar-inner">
          <button type="button" className="auth-page-brand" onClick={onClose}>
            <div className="auth-page-brand-icon">
              <BloodDropIcon size={20} />
              <span className="pulse-ping" />
            </div>
            <div className="auth-page-brand-text">
              <span className="auth-page-brand-name">
                <span>Red</span><span className="auth-page-brand-coral">Relay</span>
              </span>
              <span className="auth-page-brand-sub">Autonomous Lifeline Network</span>
            </div>
            <span className="auth-page-brand-demo">LIVE</span>
          </button>

          <nav className="auth-page-nav">
            {navLinks.map((link) => (
              <button key={link} type="button" className="auth-page-nav-link" onClick={onClose}>{link}</button>
            ))}
          </nav>

          <div className="auth-page-nav-actions">
            <button type="button" className={"auth-nav-toggle" + (mode === "login" ? " auth-nav-toggle-active" : "")} onClick={() => onSwitchMode("login", currentRole)}>Log In</button>
            <button type="button" className={"auth-nav-toggle auth-nav-toggle-signup" + (mode === "signup" ? " auth-nav-toggle-active" : "")} onClick={() => onSwitchMode("signup", currentRole)}>Sign Up</button>
          </div>
        </div>
      </header>

      <main className="auth-page-body">
        <div className="auth-split-card">
          <AuthLeftPanel mode={mode} />
          <div className="auth-right-panel">
            {mode === "login" ? (
              <LoginForm
                onLoginSuccess={onLoginSuccess}
                currentRole={currentRole}
                onRoleChange={onRoleChange}
                onSwitchToSignup={(role) => onSwitchMode("signup", role)}
              />
            ) : (
              <SignupForm
                onSignupSuccess={onSignupSuccess}
                currentRole={currentRole}
                onRoleChange={onRoleChange}
                onSwitchToLogin={(role) => onSwitchMode("login", role)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
