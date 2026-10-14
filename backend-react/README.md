# TIMS Backend API (Express.js + Neon PostgreSQL)

Township Infrastructure Management System (TIMS) backend implementation using Express.js and Neon Cloud PostgreSQL.

---

## 🏗️ Architecture & Features

- **Runtime**: Node.js (v18+) & Express.js
- **Database**: 100% Native Neon Cloud PostgreSQL
- **Pre-Loaded Seeds**: All tables, user roles, AMC rate cards, and sample complaints synchronized directly with Neon PostgreSQL
- **Security**: JWT Authentication, bcrypt password hashing, Helmet security headers, CORS origin filtering
- **Multi-Township Isolation**: Built-in support for multi-tenancy and data isolation
- **Static Assets & Uploads**: Multer stream handler saving to `/uploads`

---

## 📁 Directory Structure

```
backend-react/
├── src/
│   ├── config/
│   │   ├── env.js            # Centralized environment variable validation
│   │   └── db.js             # Neon PostgreSQL DB interface (pool, query, withTransaction)
│   ├── middleware/           # auth.js, upload.js, error.js
│   ├── controllers/          # authController.js, etc.
│   ├── routes/               # authRoutes.js, etc.
│   ├── utils/                # auth.js (bcrypt/JWT), generateId.js
│   └── app.js                # Express app setup, CORS, Helmet, static upload routing
├── uploads/                  # Uploaded photo evidence, PDFs, and invoices
├── .env                      # Local environment variables
├── .env.example              # Template environment configuration
├── package.json
└── server.js                 # Server entry point & startup diagnostics
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd backend-react
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
# Windows PowerShell:
Copy-Item .env.example .env
```
Fill in your Neon PostgreSQL database URL in `.env`:
```env
DATABASE_URL=postgresql://username:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 3. Initialize Database Schema & Seed Data (Neon PostgreSQL)
Run the automated schema and seeding script:
```bash
npm run db:init
```
*(This creates all 28 tables, relationships, and default test accounts in your Neon database)*

### 4. Start the Server
* **Development mode (hot reload)**:
  ```bash
  npm run dev
  ```
* **Production mode**:
  ```bash
  npm start
  ```
* **Full Stack (Frontend + Backend concurrently from project root)**:
  ```bash
  node start-react.js
  ```

---

## 🩺 System Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status and root greeting |
| `GET` | `/health` | Live Neon PostgreSQL database connectivity diagnostics |
| `POST` | `/api/v1/auth/login` | User login (returns JWT token & user profile) |
| `GET` | `/api/v1/auth/me` | Current authenticated user profile |
| `GET` | `/uploads/:filename` | Static access to uploaded photos & files |
