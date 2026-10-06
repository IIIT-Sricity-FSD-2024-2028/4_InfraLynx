# TIMS Backend API (Express.js + In-Memory Relational Engine)

Township Infrastructure Management System (TIMS) backend implementation using Express.js and a zero-install In-Memory Relational Database Engine.

---

## 🏗️ Architecture & Features

- **Runtime**: Node.js (v18+) & Express.js
- **Database**: 100% In-Memory Relational RAM Store (Zero external database install required)
- **Pre-Loaded Seeds**: All 12 tables, all 6 user roles, AMC rate cards, and sample complaints pre-loaded on boot
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
│   │   ├── inMemoryDb.js     # 100% In-Memory Relational Database Store & Query Engine
│   │   └── db.js             # Universal DB interface (query, withTransaction, testConnection)
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

### 2. Start the Server
* **Development mode (hot reload)**:
  ```bash
  npm run dev
  ```
* **Production mode**:
  ```bash
  npm start
  ```

---

## 🩺 System Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status and root greeting |
| `GET` | `/health` | Live in-memory database connectivity diagnostics |
| `POST` | `/api/v1/auth/login` | User login (returns JWT token & user profile) |
| `GET` | `/api/v1/auth/me` | Current authenticated user profile |
| `GET` | `/uploads/:filename` | Static access to uploaded photos & files |
