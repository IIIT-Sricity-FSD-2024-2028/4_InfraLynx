# TIMS Database (Raw PostgreSQL SQL)

This directory contains the production-ready PostgreSQL relational database schema and starter seed data for the **TIMS (Township Infrastructure Management System)** platform.

---

## 📁 Files in this Folder

1. **`schema.sql`**: Complete PostgreSQL DDL containing:
   - Custom ENUMs (`user_role`, `complaint_status`, `work_order_status`, `invoice_status`, etc.)
   - Multi-tenant Platform tables (`townships`, `subscription_plans`)
   - Core organizational tables (`departments`, `users`, `contractors`)
   - AMC Rate Card engine (`amcs`, `amc_rates`)
   - Workflow tables (`complaints`, `work_orders`, `estimates`, `approvals`, `verifications`, `invoices`, `payments`)
   - Supporting tables (`notifications`, `audit_logs`, `township_settings`)
   - Performance indexes on frequently filtered foreign keys & status columns.

2. **`seed.sql`**: Complete starter seed dataset matching the React frontend demo state:
   - Greenfield Smart Township & 3 Departments (Civil, Electrical, Water)
   - 6 Core User logins (`rwa@infralynx.com`, `clerk@infralynx.com`, `contractor@infralynx.com`, `head@infralynx.com`, `finance@infralynx.com`, `coo@infralynx.com`)
   - 3 Empanelled AMC Contractors (Apex, Voltech, AquaFlow) with Master Rate Cards
   - 3-Tier Approval Threshold rules (< ₹25K Auto, ₹25K–₹2L Dept Head, > ₹2L COO)
   - Sample active complaint (`CMP-2026-0101`), work order (`WO-2026-088`), and invoice (`INV-2026-088`).

---

## 🚀 How to Load Into PostgreSQL

### Option A: Using `psql` CLI
```bash
# 1. Create a fresh PostgreSQL database
psql -U postgres -c "CREATE DATABASE tims_db;"

# 2. Apply Schema
psql -U postgres -d tims_db -f schema.sql

# 3. Apply Seed Data
psql -U postgres -d tims_db -f seed.sql
```

### Option B: Using pgAdmin or DBeaver
1. Open pgAdmin / DBeaver and connect to your PostgreSQL server.
2. Create a new database named `tims_db`.
3. Open the **Query Tool** and execute `schema.sql`.
4. Open a second query and execute `seed.sql`.

---

## 💻 Connecting in Express.js with `pg` (node-postgres)

```javascript
// db.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/tims_db',
});

export const query = (text, params) => pool.query(text, params);
export default pool;
```
