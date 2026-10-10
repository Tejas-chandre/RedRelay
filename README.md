# 🩸 RedRelay
### Intelligent Blood Supply Coordination & Emergency Redistribution

**RedRelay** is a hackathon project designed to improve coordination between hospitals and blood banks during blood shortages and emergency demand. It combines blood inventory management, emergency request workflows, real-time event communication, and Mixed-Integer Linear Programming (MILP) to explore more efficient blood redistribution.

> **Our mission:** Help healthcare facilities identify available blood supplies and make better-informed redistribution decisions when time matters.

**Repository:** [Tejas-chandre/RedRelay](https://github.com/Tejas-chandre/RedRelay)

---

## 📌 Problem Statement

During emergencies, hospitals may face urgent demand for specific blood groups while compatible supplies exist at other facilities. Fragmented inventory information and manual coordination can delay the process of identifying potential sources.

RedRelay explores a centralized, technology-driven approach to blood supply visibility, emergency request handling, and redistribution planning.

## 💡 Our Solution

RedRelay brings together a web interface, backend services, and an optimization engine to support a coordinated response to blood shortages.

The platform is designed to:
- Provide a common interface for hospital and blood-bank workflows.
- Manage blood inventory and emergency requests through backend APIs.
- Process emergency events through real-time communication.
- Use MILP optimization to select a feasible allocation of available units while minimizing distance-weighted transfer cost.
- Present redistribution plans for review by authorized personnel.

## ✨ Key Features

### 🏥 Hospital and Blood Bank Workflows
Role-oriented registration, login, and dashboards for hospital and blood-bank users.

### 🩸 Inventory Management
Backend routes and database models for working with blood inventory records.

### 🚨 Emergency Requests
Request-handling APIs and a frontend emergency simulator for demonstrating emergency workflows.

### ⚡ Real-Time Event Communication
Socket.IO supports emergency event handling and redistribution-manifest notifications.

### 🧮 MILP-Based Redistribution
A Python optimization service uses PuLP to allocate integer quantities of available units against a specified demand while minimizing total distance-weighted transfer cost.

### 📊 Interactive Web Interface
A React-based interface includes network information, inventory views, dashboards, and emergency simulation components.

*Note: Features must be tested in the configured environment before being considered production-ready. The public landing page includes simulated demo data and local simulation behavior.*

## 🧠 What Makes RedRelay Different?

RedRelay combines three ideas in one prototype:

1. **Coordination:** Connect inventory and emergency request workflows.
2. **Optimization:** Formulate blood-unit allocation as an integer optimization problem rather than relying only on manual selection.
3. **Real-time response:** Use event-driven communication to initiate emergency redistribution planning.

The goal is not merely to display inventory, but to explore how available supply can be allocated more efficiently under emergency demand.

## 🔄 Application Workflow

1. **Access the platform:** Open the web interface.
2. **Select a workflow:** Use the hospital or blood-bank registration/login interface.
3. **Manage information:** Use the relevant dashboard and inventory/request APIs.
4. **Initiate an emergency event:** Supply the target facility, blood group, component type, and required units to the configured event handler.
5. **Collect supply information:** The backend builds a supply snapshot for the optimization request.
6. **Optimize allocation:** The Python MILP solver calculates an allocation when sufficient supply is available.
7. **Review the result:** A redistribution manifest is emitted with solver status, transfer quantities, distances, and objective cost.

Actual blood transfers are not performed automatically by the optimizer. Any real-world transfer requires authorized review and appropriate clinical and operational checks.

## 🏗️ System Architecture

```text
React + Vite Frontend
         |
         | HTTP API requests
         v
Node.js + Express Backend
         |
         +------ MongoDB
         |       User, inventory,
         |       and request data
         |
         +------ Socket.IO
         |       Emergency events
         |       and manifest updates
         |
         +------ Python MILP Service
                 PuLP optimization
                 and allocation result
```

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Real-time communication | Socket.IO |
| Optimization | Python, PuLP, MILP |
| Version control | Git, GitHub |

## 📂 Project Structure

```text
RedRelay/
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── optimizer/
│   │   └── solver.py
│   ├── routes/
│   ├── services/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
├── package.json
├── seed.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

Install:
- Node.js and npm
- Python 3
- MongoDB (local or MongoDB Atlas)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Tejas-chandre/RedRelay.git
cd RedRelay
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

Open another terminal from the repository root:

```bash
cd frontend
npm install
```

### 4. Install the Python optimization dependency

Create and activate a Python virtual environment, then install PuLP:

```bash
python -m venv .venv
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install pulp
```

On macOS/Linux, activate the environment with:

```bash
source .venv/bin/activate
pip install pulp
```

The optimization service may require a compatible CBC solver installation. Verify that the solver is available in your environment.

### 5. Configure environment variables

Create `backend/.env` using the variable names expected by the backend:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
```

Use your own database credentials and a securely generated JWT secret. Configure any additional variables required by your environment.

**Never commit `.env` files, passwords, database credentials, or private API keys.**

### 6. Start the backend

```bash
cd backend
npm run dev
```

The backend defaults to port `5000`. Its health endpoint is:

```text
http://localhost:5000/api/health
```

A successful health response should report that the database is connected.

### 7. Start the frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Open the local URL printed by Vite, typically `http://localhost:5173`.

## 🧪 Testing and Validation

Before a live demonstration, validate these areas:

- [ ] Frontend starts and renders without console errors.
- [ ] Backend starts and the health endpoint reports database readiness.
- [ ] Registration and login work with valid and invalid credentials.
- [ ] Inventory endpoints return expected data and enforce authorization.
- [ ] Emergency request creation and retrieval work correctly.
- [ ] Socket.IO connects and handles the configured emergency event.
- [ ] The Python MILP solver returns a feasible allocation when supply is sufficient.
- [ ] The solver reports infeasibility when supply is insufficient.
- [ ] Transfers never exceed available inventory or the requested total.
- [ ] Demo data and actual database-backed data are clearly distinguished.

## 📸 Screenshots

Add screenshots captured from the running application:

| Screenshot | What it demonstrates |
|---|---|
| Landing page | Project introduction and navigation |
| Hospital dashboard | Hospital-facing workflow |
| Blood-bank dashboard | Inventory workflow |
| Emergency simulator | Demonstration of emergency demand |
| Optimization output | Example MILP allocation result |

Save the screenshots in a repository folder such as `docs/screenshots/` and embed them here once they are available.

## 🔮 Future Scope

- Verified, near-real-time inventory synchronization between participating facilities.
- More comprehensive blood-component compatibility and availability validation.
- Location-aware routing and transportation-time estimation.
- Authorized transfer confirmation and inventory reconciliation.
- Improved monitoring, audit trails, and role-based access control.
- Deployment with secure production configuration and automated tests.

## ⚠️ Safety and Disclaimer

RedRelay is a hackathon prototype and decision-support concept, not a certified clinical system. Demo data may be simulated, and an optimization result does not establish medical compatibility or authorize a transfusion. Real-world use requires verified data, professional medical oversight, applicable regulations, and secure operational processes.

## 👥 Team and Contributions

Built as a hackathon project. Contributions, issues, and suggestions are welcome through the repository.

## 📄 License

No open-source license has been selected yet. All rights remain with the respective copyright holders unless a license is added.

---

**RedRelay — Better coordination. Smarter allocation. Faster emergency response.**
