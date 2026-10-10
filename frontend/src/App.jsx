import { useState } from "react";
import "./App.css";
import { AreaInventory } from "./components/AreaInventory";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { ImpactSection } from "./components/ImpactSection";
import { DashboardStats } from "./components/DashboardStats";
import { HospitalInventory } from "./components/HospitalInventory";
import { NetworkMap } from "./components/NetworkMap";
import { EmergencySimulator } from "./components/EmergencySimulator";
import { FloatingActions } from "./components/FloatingActions";
import { AuthPage } from "./components/AuthPage";
import { AboutModal } from "./components/AboutModal";
import {
  INITIAL_HOSPITALS,
  INITIAL_TRANSFERS,
} from "./data/mockData";
import { CheckIcon, AlertIcon } from "./components/Icons";
import { clearAuthToken } from "./services/authService";
import HospitalDashboard from "./pages/HospitalDashboard";
import BloodBankDashboard from "./pages/BloodBankDashboard";

function App() {
  // Global simulation states
  const [hospitals, setHospitals] = useState(INITIAL_HOSPITALS);
  const [transfers, setTransfers] = useState(INITIAL_TRANSFERS);
  const [activeNavSection, setActiveNavSection] = useState("home");
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState("all");
  const [prefilledHospitalForSim, setPrefilledHospitalForSim] = useState(null);

  // Authentication states
  const [currentUser, setCurrentUser] = useState(null);
  const [authRole, setAuthRole] = useState("hospital");
  const [registeredAccounts, setRegisteredAccounts] = useState([]);

  // Auth page state: null = hidden, "login" | "signup" = showing full-page
  const [authMode, setAuthMode] = useState(null);

  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Open auth page
  const openAuth = (mode) => {
    setAuthMode(mode);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const closeAuth = () => setAuthMode(null);

  const handleSwitchAuthMode = (mode, role) => {
    if (role) setAuthRole(role);
    setAuthMode(mode);
  };

  // Scroll to section helper

  const scrollToSection = (sectionId) => {
    setActiveNavSection(sectionId);

    if (authMode) {
      closeAuth();
    }

    if (sectionId === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (sectionId === "about") {
      setIsAboutOpen(true);
      return;
    }

    const element = document.getElementById(sectionId);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleEmergencySupport = () => {
    setIsEmergencyOpen(true);
  };


  // Filter critical hospitals quick action
  const handleFilterCritical = () => {
    if (selectedHospitalFilter === "Critical") {
      setSelectedHospitalFilter("all");
      showToast("Displaying all connected facilities", "info");
    } else {
      setSelectedHospitalFilter("Critical");
      scrollToSection("network");
      showToast("Filtered view to critical shortage alerts", "info");
    }
  };

  // Request transfer from hospital card or map
  const handleRequestTransfer = (hospital) => {
    setPrefilledHospitalForSim(hospital);
    const simElement = document.getElementById("emergency-simulator");
    if (simElement) {
      simElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    showToast(`Configured emergency transfer parameters for ${hospital.name}`, "info");
  };

  // Execute emergency simulation and update live state
  const handleExecuteSimulation = (donorId, targetId, bloodType, units, newTransfer) => {
    setHospitals((prev) =>
      prev.map((h) => {
        if (h.id === donorId) {
          const currentTypeStock = h.bloodStock[bloodType] || 0;
          const updatedTypeStock = Math.max(0, currentTypeStock - units);
          const updatedTotal = Math.max(0, h.totalUnits - units);
          return {
            ...h,
            totalUnits: updatedTotal,
            stock: `${updatedTotal} units`,
            bloodStock: {
              ...h.bloodStock,
              [bloodType]: updatedTypeStock,
            },
            state: updatedTotal < 18 ? "Critical" : updatedTotal < 30 ? "Warning" : "Healthy",
            lastUpdated: "Just now",
          };
        }
        if (h.id === targetId) {
          return {
            ...h,
            lastUpdated: "Transfer incoming",
          };
        }
        return h;
      })
    );

    setTransfers((prev) => [newTransfer, ...prev]);

    showToast(
      `Dispatched ${units} units of ${bloodType} via ${newTransfer.carrier}!`,
      "success"
    );
  };

  // Reset simulation and telemetry to initial baseline
  const handleResetData = () => {
    setHospitals(INITIAL_HOSPITALS);
    setTransfers(INITIAL_TRANSFERS);
    setSelectedHospitalFilter("all");
    setPrefilledHospitalForSim(null);
    showToast("Reset all hospital inventories and transfers to baseline demo state", "info");
  };

  // Auth handlers
  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    closeAuth();
    const roleLabel = userData.role === "hospital" ? "Hospital" : "Blood Bank";
    showToast(`Welcome back, ${userData.name}! Switched to ${roleLabel} Command Dashboard.`, "success");
  };

  const handleProfileUpdated = (userData) => {
    setCurrentUser((previousUser) => ({ ...previousUser, ...userData }));
  };


  const handleSignupSuccess = (newAccount) => {
    closeAuth();
    setAuthRole(newAccount.role);
    showToast(
      `Registration successful for ${newAccount.facility}! Please sign in with your new account.`,
      "success"
    );
    setAuthMode("login");
  };


  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    showToast("Signed out of demo session", "info");
  };

  // Shared toast overlay (used across all render branches)
  const toastOverlay = toast && (
    <div className={`toast-alert toast-${toast.type}`} role="status">
      <div className="toast-icon">
        {toast.type === "success" ? <CheckIcon size={18} /> : <AlertIcon size={18} />}
      </div>
      <span className="toast-message">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={() => setToast(null)}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );

  // If logged in, render the role-specific dashboard
  if (currentUser) {
    return (
      <>
        {toastOverlay}
        {currentUser.role === "hospital" ? (
          <HospitalDashboard currentUser={currentUser} onLogout={handleLogout} onProfileUpdated={handleProfileUpdated} />
        ) : (
          <BloodBankDashboard currentUser={currentUser} onLogout={handleLogout} onProfileUpdated={handleProfileUpdated} />
        )}
      </>
    );
  }

  // If auth page is open, render full-page auth
  if (authMode) {
    return (
      <>
        {toastOverlay}
        <AuthPage
          mode={authMode}
          onLoginSuccess={handleLoginSuccess}
          onSignupSuccess={handleSignupSuccess}
          onClose={closeAuth}
          currentRole={authRole}
          onRoleChange={setAuthRole}
          registeredAccounts={registeredAccounts}
          onSwitchMode={handleSwitchAuthMode}
        />
      </>
    );
  }

  return (
    <div className="RedRelay-app">
      {/* Toast Notification Container */}
      {toastOverlay}

      {/* Clean White Top Navigation Bar */}
      <Navbar
        activeSection={activeNavSection}
        onNavigate={scrollToSection}
        onOpenLogin={() => openAuth("login")}
        onOpenSignup={() => openAuth("signup")}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="main-viewport-landing">
        {/* Full-Width Large Hero Section */}
        <HeroSection
          onExploreNetwork={() => scrollToSection("network")}
          onHowItWorks={() => scrollToSection("how-it-works")}
        />

        {/* Public Blood Availability Search - No Login Required */}
        <section id="find-blood" className="public-blood-search">
          <div className="section-container">
            <AreaInventory hospitals={hospitals} />
          </div>
        </section>
        {/* Section: How It Works */}
        <HowItWorksSection
          onExploreNetwork={() => scrollToSection("network")}
        />



        {/* Emergency Simulator */}
        <section id="emergency-simulator" className="public-blood-search">
          <div className="section-container">
            <EmergencySimulator
              hospitals={hospitals}
              onExecuteSimulation={handleExecuteSimulation}
              onResetSimulation={handleResetData}
              prefilledHospital={prefilledHospitalForSim}
            />
          </div>
        </section>

        {/* Section: Impact */}
        <ImpactSection />

      </main>

      {/* Floating Emergency & Assistant Buttons */}
      <FloatingActions
        onEmergencyClick={handleEmergencySupport}
        hospitals={hospitals}
        transfers={transfers}
      />

      {isEmergencyOpen && (
        <div
          className="emergency-modal-backdrop"
          onClick={() => setIsEmergencyOpen(false)}
        >
          <div
            className="emergency-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="emergency-modal-close"
              onClick={() => setIsEmergencyOpen(false)}
              aria-label="Close emergency form"
            >
              ✕
            </button>

            <h2 id="emergency-modal-title">Emergency Blood Request</h2>
            <p>Enter the blood requirement and contact details.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();

                const form = e.currentTarget;
                const data = new FormData(form);

                const request = {
                  bloodGroup: data.get("bloodGroup"),
                  units: Number(data.get("units")),
                  hospital: data.get("hospital"),
                  phone: data.get("phone"),
                };

                console.log("Emergency request demo:", request);

                setIsEmergencyOpen(false);
                form.reset();

                showToast(
                  "Demo request captured locally. It has not been sent to a blood bank.",
                  "info"
                );
              }}
            >
              <label htmlFor="emergency-blood-group">Blood group</label>
              <select
                id="emergency-blood-group"
                name="bloodGroup"
                defaultValue=""
                required
              >
                <option value="" disabled>Select blood group</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (group) => (
                    <option key={group} value={group}>{group}</option>
                  )
                )}
              </select>

              <label htmlFor="emergency-units">Units required</label>
              <input
                id="emergency-units"
                name="units"
                type="number"
                min="1"
                max="100"
                placeholder="Enter units"
                required
              />

              <label htmlFor="emergency-hospital">Hospital / facility name</label>
              <input
                id="emergency-hospital"
                name="hospital"
                type="text"
                placeholder="Enter hospital name"
                maxLength="120"
                required
              />

              <label htmlFor="emergency-phone">Contact number</label>
              <input
                id="emergency-phone"
                name="phone"
                type="tel"
                pattern="[0-9+() -]{7,20}"
                placeholder="Enter contact number"
                required
              />

              <button type="submit" className="emergency-submit-btn">
                Submit Demo Request
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Clean Modern Footer */}
      <footer className="RedRelay-footer" id="about">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand-logo-text">🩸 RedRelay</span>
            <p className="footer-desc">
              Autonomous Peer-to-Peer Blood Supply Telemetry &amp; Emergency Redistribution Mesh.
              Connecting regional trauma centers, municipal blood banks, and critical care units.
            </p>
            <div className="footer-badges-row">
              <span className="footer-pill-badge">⚡ Real-Time IoT Telemetry</span>
              <span className="footer-pill-badge">🚁 UAV SkyCorridors</span>
              <span className="footer-pill-badge">🛡️ Zero Wastage Protocol</span>
            </div>
          </div>

          <div className="footer-nav-columns">
            <div className="footer-col">
              <h5>Navigation</h5>
              <button type="button" onClick={() => scrollToSection("home")}>Home</button>
              <button type="button" onClick={() => scrollToSection("how-it-works")}>How It Works</button>
              <button type="button" onClick={() => scrollToSection("network")}>Hospital Network</button>
              <button type="button" onClick={() => scrollToSection("impact")}>Impact Metrics</button>
            </div>

            <div className="footer-col">
              <h5>Command Center</h5>
              <button type="button" onClick={() => scrollToSection("emergency-simulator")}>Emergency Simulator</button>
              <button type="button" onClick={() => openAuth("login")}>Staff Sign In</button>
              <button type="button" onClick={() => openAuth("signup")}>Register Hospital</button>
              <button type="button" onClick={() => setIsAboutOpen(true)}>Architecture Info</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <span className="demo-disclaimer-pill">SIMULATED HACKATHON ENVIRONMENT</span>
          <p className="copyright-text">
            © 2026 RedRelay Health Systems • Connecting hospitals, saving lives • All data simulated for demo purposes.
          </p>
        </div>
      </footer>

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onExploreClick={() => scrollToSection("network")}
      />
    </div>
  );
}

export default App;
