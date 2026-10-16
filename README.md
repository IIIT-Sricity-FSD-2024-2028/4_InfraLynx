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
cd backend-react
npm install

# Install frontend dependencies
cd ../frontend-react
npm install

# Return to root directory
cd ..
```

### 3. Configure Environment Variables
Create a `.env` file in `backend-react/` by copying the example:
```bash
# Windows PowerShell
Copy-Item backend-react/.env.example backend-react/.env

# Linux / macOS / Git Bash
cp backend-react/.env.example backend-react/.env
```

Set your database URL and settings in `backend-react/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=infralynx_jwt_secret_key_2026
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

*(Note: `frontend-react/.env` is already pre-configured to connect to `http://localhost:5000/api/v1`)*

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
cd backend-react
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend-react
npm run dev
```

---

## 4. Testing Instructions

### Automated Integration Tests
Run the backend role-based integration test suite:
```bash
cd backend-react
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
