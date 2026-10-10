
import { useState } from "react";
import { BloodDropIcon, UserIcon } from "./Icons";

export function Navbar({
  activeSection,
  onNavigate,
  onOpenLogin,
  onOpenSignup,
  currentUser,
  onLogout,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: "home", label: "Home" },
    { id: "find-blood", label: "Region Blood Search" },
    { id: "how-it-works", label: "How It Works" },
    { id: "network", label: "Network" },
    { id: "impact", label: "Impact" },
    { id: "about", label: "About" },
  ];

  const handleLinkClick = (id) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar-white-header">
      <div className="navbar-container">
        {/* Brand Logo */}
        <div
          className="brand"
          onClick={() => handleLinkClick("home")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              handleLinkClick("home");
            }
          }}
        >
          <div className="brand-icon-wrapper-white">
            <BloodDropIcon className="brand-drop" size={22} />
            <span className="pulse-ping"></span>
          </div>

          <div className="brand-text">
            <div className="brand-title-dark">
              <span className="brand-blood-dark">Red</span>
              <span className="brand-mesh-coral">Relay</span>
            </div>
            <span className="brand-tagline-dark">
              Autonomous Lifeline Network
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav
          className={`navbar-links-dark ${mobileMenuOpen ? "open" : ""}`}
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              className={`nav-link-btn-dark ${activeSection === link.id ? "active" : ""
                } ${link.id === "find-blood" ? "nav-blood-search" : ""}`}
              onClick={() => handleLinkClick(link.id)}
              aria-current={activeSection === link.id ? "page" : undefined}
            >
              {link.label}

              {activeSection === link.id && (
                <span className="active-dot-coral" />
              )}
            </button>
          ))}
        </nav>

        {/* Right-aligned Actions / Auth Buttons */}
        <div className="navbar-actions-group">
          {currentUser ? (
            <div className="user-profile-badge-white">
              <div className="user-avatar-coral">
                <UserIcon size={16} />
              </div>

              <div className="user-details-dark">
                <span className="user-name-dark">
                  {currentUser.name}
                </span>

                <span className="user-role-dark">
                  {currentUser.role === "hospital"
                    ? "🏥 Hospital"
                    : currentUser.role === "blood_bank"
                      ? "🩸 Blood Bank"
                      : currentUser.role}
                  {" • "}
                  {currentUser.facility || "Verified Facility"}
                </span>
              </div>

              <button
                type="button"
                className="btn-logout-white"
                onClick={onLogout}
                title="Sign out of your account"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="auth-buttons-white">
              <button
                type="button"
                className="btn-login-white"
                onClick={onOpenLogin}
              >
                Log In
              </button>

              <button
                type="button"
                className="btn-signup-coral"
                onClick={onOpenSignup}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Mobile Menu */}
          <button
            type="button"
            className="mobile-toggle-dark"
            onClick={() => setMobileMenuOpen((previous) => !previous)}
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
          >
            <span
              className={`bar-dark ${mobileMenuOpen ? "bar-1-open" : ""}`}
            />
            <span
              className={`bar-dark ${mobileMenuOpen ? "bar-2-open" : ""}`}
            />
            <span
              className={`bar-dark ${mobileMenuOpen ? "bar-3-open" : ""}`}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
