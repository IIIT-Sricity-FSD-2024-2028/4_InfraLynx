# InfraLynx — TIMS (Township Infrastructure Management System)

Township Infrastructure Management System (TIMS) built with React (Vite), Express.js, and Neon Cloud PostgreSQL.

---

## 1. Dependencies

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**
- **Neon Cloud PostgreSQL** database account (or local PostgreSQL instance)

### Core Stack
- **Frontend**: React 19, Vite, React Router DOM, Modular CSS
- **Backend**: Node.js, Express.js, `pg` (PostgreSQL client), JWT, bcryptjs, Multer, Helmet, CORS
- **Database**: PostgreSQL (Neon Cloud)

---

## 2. Project Setup

### 1. Clone the Repository
```bash
git clone https://github.com/IIIT-Sricity-FSD-2024-2028/4_InfraLynx.git
cd 4_InfraLynx
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root directory
cd ..
```

### 3. Configure Environment Variables
Create a `.env` file in `backend/` by copying the example:
```bash
# Windows PowerShell
Copy-Item backend/.env.example backend/.env

# Linux / macOS / Git Bash
cp backend/.env.example backend/.env
```

Set your database URL and settings in `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=infralynx_jwt_secret_key_2026
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

*(Note: `frontend/.env` is already pre-configured to connect to `http://localhost:5000/api/v1`)*

---

## 3. Execution Steps

### Run Both Frontend & Backend Concurrently (Recommended)
From the project root:
```bash
npm run start:react
```
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

---

### Run Services Separately (Alternative)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

---

## 4. Testing Instructions

### Automated Integration Tests
Run the backend role-based integration test suite:
```bash
cd backend
npm test
```

---

### Manual Testing Credentials

All test accounts use the password: **`Password@123`**

| Role | Test Email | Password | Primary Actions |
|---|---|---|---|
| **RWA Representative** | `rwa@infralynx.com` | `Password@123` | Report complaints, inspect photo proof, verify or dispute work |
| **Desk Clerk** | `clerk@infralynx.com` | `Password@123` | Triage complaints, assign work orders to contractors under active AMC |
| **Field Contractor** | `contractor@infralynx.com` | `Password@123` | Inspect issues, submit AMC estimates, upload completion proof |
| **Department Head** | `head@infralynx.com` | `Password@123` | Review & approve estimates, manage department staff and SLAs |
| **Township COO** | `coo@infralynx.com` | `Password@123` | Township overview, manage departments & heads, monitor work orders |
| **Finance Clerk** | `finance@infralynx.com` | `Password@123` | 3-way invoice audit, verify RWA gate, release payment vouchers |
| **Super Admin** | `superadmin@infralynx.com` | `Password@123` | Multi-township configuration, subscription plans, global settings |

---

### End-to-End Test Workflow
1. **Report:** Login as `rwa@infralynx.com` → Report an infrastructure issue with photos.
2. **Triage:** Login as `clerk@infralynx.com` → Validate complaint and assign contractor.
3. **Estimate & Execute:** Login as `contractor@infralynx.com` → Submit AMC estimate → Complete work and upload photos.
4. **Approve:** Login as `head@infralynx.com` → Approve estimate.
5. **Verify:** Login as `rwa@infralynx.com` → Verify completed repair.
6. **Audit & Pay:** Login as `finance@infralynx.com` → Run 3-way check and release payment voucher.

---

## 5. Individual Contribution

- **Student Name:** Yshasvee Patel
- **Roll / Student ID:** 266
- **Course:** Full Stack Development (FDFED) — 5th Semester
- **Assigned Module:** Field Contractor Management Portal & Execution Lifecycle
- **GitHub Username:** `yshasvee11` (`yshasveep24-code`)
- **Detailed Evaluation Dossier & Viva Guide:** [contribution_266.md](./contribution_266.md)

### Specific Files Developed & Modified

| File / Component Path | Description & Key Contributions |
|---|---|
| [`frontend/src/pages/contractor/ContractorPortal.jsx`](./frontend/src/pages/contractor/ContractorPortal.jsx) | **Root State Orchestrator:** Manages contractor global state, screen routing, real-time context synchronization, sessionStorage persistence, and backend API integration. |
| [`frontend/src/pages/contractor/ContractorDashboard.jsx`](./frontend/src/pages/contractor/ContractorDashboard.jsx) | **Overview & KPIs:** Real-time metrics counters, SLA breach alerts, active work order status distribution, and rapid navigation shortcuts. |
| [`frontend/src/pages/contractor/AssignedWorkOrders.jsx`](./frontend/src/pages/contractor/AssignedWorkOrders.jsx) | **Work Order Explorer:** Multi-criteria status filtering (Assigned, Pending Approval, Approved, Completed), live multi-attribute search (WO ID, location, asset), and SLA countdown indicators. |
| [`frontend/src/pages/contractor/SiteInspection.jsx`](./frontend/src/pages/contractor/SiteInspection.jsx) | **Pre-Work Assessment Engine:** Defect logging, equipment condition assessment, and photographic evidence capture using `useRef` and `FileReader` base64 encoding. |
| [`frontend/src/pages/contractor/AmcEstimateBuilder.jsx`](./frontend/src/pages/contractor/AmcEstimateBuilder.jsx) | **Dynamic AMC Quotation Builder:** Dynamic line-item table, rate card selection, instant rate × quantity subtotaling, live mathematical audit formula generator, technical justification validation, and dispatch to Department Head. |
| [`frontend/src/pages/contractor/ApprovalStatus.jsx`](./frontend/src/pages/contractor/ApprovalStatus.jsx) | **Multi-Tier Approval Tracker:** Visual workflow status cards monitoring Desk Clerk, Department Head, and COO escalation statuses with instant "Start Execution" action triggers. |
| [`frontend/src/pages/contractor/WorkExecution.jsx`](./frontend/src/pages/contractor/WorkExecution.jsx) | **Physical Execution & Work Closure:** Labor tracking, post-repair completion proof upload (`AFTER` evidence), and dual-handshake closure forwarding to RWA and Finance. |
| [`frontend/src/pages/contractor/styles/*.css`](./frontend/src/pages/contractor/styles/) | **Modular Stylesheets:** Scoped, zero-collision vanilla CSS stylesheets for all contractor portal screens. |
| [`backend/src/controllers/contractorController.js`](./backend/src/controllers/contractorController.js) | **Field Contractor API Controller (838 lines):** Ground inspection submission, AMC estimate calculations, photo evidence persistence, and lifecycle transitions. |
| [`scripts/test_full_workflow.js`](./scripts/test_full_workflow.js) | **Automated Municipal E2E Suite (466 lines):** Automated 7-step test script simulating full lifecycle from complaint intake to finance audit. |
| [`backend/tests/test-all-roles.js`](./backend/tests/test-all-roles.js) & [`backend/package.json`](./backend/package.json) | **Integration & Verification:** Contractor role API verification, inspection and estimate workflow test coverage. |

