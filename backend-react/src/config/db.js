/**
 * TIMS Universal Database Interface
 * Bridges Neon Cloud PostgreSQL (when DATABASE_URL is configured)
 * with a zero-install In-Memory Relational Database Engine fallback for test suites and offline operation.
 */

import pg from 'pg';
import inMemoryDb from './inMemoryDb.js';
import config from './env.js';

const { Pool } = pg;
const databaseUrl = config.databaseUrl || process.env.DATABASE_URL;

let pool = null;
let isPostgresConnected = false;

if (databaseUrl && !process.env.FORCE_IN_MEMORY) {
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });

    pool.on('error', (err) => {
      console.warn('[PostgreSQL Pool Warning]:', err.message);
      isPostgresConnected = false;
    });
  } catch (err) {
    console.warn('[Database Pool Init Warning]: Failed to init PostgreSQL pool, using in-memory store:', err.message);
    pool = null;
  }
}

// Known PostgreSQL column sets per table to ensure valid SQL generation
const TABLE_COLUMNS = {
  townships: ['id', 'name', 'address', 'contact_email', 'contact_phone', 'status', 'subscription_plan_id'],
  departments: ['id', 'township_id', 'name', 'description', 'department_head_id', 'status'],
  contractors: ['id', 'township_id', 'company_name', 'contact_person', 'email', 'phone', 'address', 'gstin', 'status'],
  users: ['id', 'township_id', 'name', 'email', 'username', 'password_hash', 'role', 'department_id', 'contractor_id', 'phone', 'sector', 'status', 'last_login_at'],
  slas: ['id', 'township_id', 'severity', 'response_time_hours', 'resolution_time_hours'],
  assets: ['id', 'township_id', 'department_id', 'asset_type', 'name', 'location', 'sector', 'block', 'latitude', 'longitude', 'status'],
  complaints: [
    'id', 'complaint_code', 'township_id', 'reported_by', 'department_id', 'asset_id',
    'category', 'subcategory', 'title', 'description', 'severity', 'sector', 'block',
    'street', 'location_details', 'latitude', 'longitude', 'status', 'sla_id', 'sla_deadline',
    'is_duplicate', 'master_complaint_id', 'validated_by', 'validated_at', 'rejection_reason'
  ],
  complaint_photos: ['id', 'complaint_id', 'file_url', 'file_type', 'uploaded_by'],
  amcs: ['id', 'township_id', 'contractor_id', 'contract_number', 'department_id', 'title', 'start_date', 'end_date', 'status'],
  amc_rates: ['id', 'amc_id', 'item_code', 'item_name', 'service_type', 'unit', 'rate', 'effective_from', 'effective_to', 'status'],
  work_orders: [
    'id', 'work_order_number', 'township_id', 'complaint_id', 'department_id', 'contractor_id',
    'assigned_by', 'priority', 'status', 'assigned_at', 'due_at', 'completed_at'
  ],
  work_evidence: ['id', 'work_order_id', 'type', 'file_url', 'remarks', 'uploaded_by'],
  estimates: ['id', 'work_order_id', 'contractor_id', 'total_amount', 'status', 'inspection_notes', 'submitted_at', 'approved_at'],
  estimate_items: ['id', 'estimate_id', 'amc_rate_id', 'description', 'unit', 'quantity', 'rate_snapshot', 'amount'],
  approvals: ['id', 'township_id', 'estimate_id', 'approver_id', 'approval_level', 'status', 'remarks', 'approved_at'],
  invoices: [
    'id', 'invoice_code', 'township_id', 'contractor_id', 'work_order_id', 'invoice_number',
    'invoice_date', 'subtotal', 'tax', 'total_amount', 'approved_estimate_amount', 'variance_amount',
    'rate_card_match', 'variance_reason', 'status', 'authorized_by', 'authorized_at'
  ],
  invoice_items: ['id', 'invoice_id', 'description', 'unit', 'quantity', 'rate', 'amount'],
  payments: ['id', 'township_id', 'invoice_id', 'contractor_id', 'amount', 'status', 'payment_mode', 'payment_reference', 'authorized_by', 'authorized_at', 'paid_at'],
  audit_logs: ['id', 'township_id', 'user_id', 'action', 'entity_type', 'entity_id', 'old_value', 'new_value'],
};

/**
 * Filter object fields to only those present in the target table's schema
 */
function sanitizeForPostgres(table, record) {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed || !record || typeof record !== 'object') return record;
  const sanitized = {};
  for (const col of allowed) {
    if (record[col] !== undefined) {
      sanitized[col] = record[col];
    }
  }
  return sanitized;
}

/**
 * Raw parameterized SQL execution with automatic In-Memory fallback
 */
export const query = async (text, params = []) => {
  if (pool) {
    try {
      const res = await pool.query(text, params);
      isPostgresConnected = true;
      return res;
    } catch (err) {
      console.warn(`[Database Warning: PostgreSQL error (${err.message}), falling back to in-memory]:`, text.slice(0, 80));
    }
  }
  return inMemoryDb.query(text, params);
};

/**
 * Transaction runner with rollback
 */
export const withTransaction = async (callback) => {
  if (pool) {
    let client = null;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.warn('[Transaction Warning]: PostgreSQL transaction failed, using in-memory fallback:', err.message);
    } finally {
      if (client) client.release();
    }
  }
  return inMemoryDb.withTransaction(callback);
};

/**
 * Test connectivity to Neon Cloud PostgreSQL or verify in-memory store
 */
export const testConnection = async () => {
  if (pool) {
    try {
      const res = await pool.query('SELECT NOW() AS current_time');
      isPostgresConnected = true;
      console.log(`✅ [Database] PostgreSQL Connected (Neon Cloud): ${res.rows[0].current_time}`);
      return true;
    } catch (err) {
      console.warn('⚠️ [Database Warning] Neon PostgreSQL unreachable, running on In-Memory RAM Store:', err.message);
      isPostgresConnected = false;
    }
  }
  return inMemoryDb.testConnection();
};

/**
 * Close database pool on shutdown
 */
export const closePool = async () => {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
    isPostgresConnected = false;
  }
  return true;
};

// ── High-Level Entity Operations (Supports both Postgres & inMemoryDb) ────────

/**
 * Fetch all records matching filter
 * @param {string} table
 * @param {Function|object} [filter]
 */
export const findAll = (table, filter = null) => {
  const predicate = typeof filter === 'function' ? filter : () => true;
  return inMemoryDb.findAll(table, predicate);
};

export const find = (table, filter = null) => findAll(table, filter);

/**
 * Find single record matching filter
 */
export const findOne = (table, filter) => {
  return inMemoryDb.findOne(table, filter);
};

/**
 * Find single record by primary key UUID
 */
export const findById = (table, id) => {
  return inMemoryDb.findById(table, id);
};

/**
 * Insert new record — persists to both Neon PostgreSQL and In-Memory store
 */
export const insert = (table, record) => {
  // 1. Insert into inMemoryDb
  const created = inMemoryDb.insert(table, record);

  // 2. Persist to PostgreSQL if connected
  if (pool && TABLE_COLUMNS[table]) {
    const sanitized = sanitizeForPostgres(table, created);
    const keys = Object.keys(sanitized);
    if (keys.length > 0) {
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING RETURNING *`;
      const values = keys.map((k) => sanitized[k]);
      pool.query(sql, values).catch((err) => {
        console.warn(`[Neon PostgreSQL Insert Notice on ${table}]:`, err.message);
      });
    }
  }

  return created;
};

/**
 * Update existing record by ID — persists to both Neon PostgreSQL and In-Memory store
 */
export const update = (table, id, updates) => {
  // 1. Update in inMemoryDb
  const updated = inMemoryDb.update(table, id, updates);

  // 2. Persist to PostgreSQL if connected
  if (pool && TABLE_COLUMNS[table] && updated) {
    const sanitized = sanitizeForPostgres(table, updates);
    const keys = Object.keys(sanitized).filter((k) => k !== 'id');
    if (keys.length > 0) {
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = [...keys.map((k) => sanitized[k]), id];
      const sql = `UPDATE ${table} SET ${setClauses} WHERE id = $${values.length}`;
      pool.query(sql, values).catch((err) => {
        console.warn(`[Neon PostgreSQL Update Notice on ${table}]:`, err.message);
      });
    }
  }

  return updated;
};

/**
 * Delete record by ID
 */
export const deleteRecord = (table, id) => {
  const deleted = inMemoryDb.delete(table, id);
  if (pool && TABLE_COLUMNS[table]) {
    pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]).catch(() => {});
  }
  return deleted;
};

/**
 * Log audit trail entry
 */
export const logAudit = (auditData) => {
  const logged = inMemoryDb.logAudit(auditData);
  if (pool) {
    const sanitized = sanitizeForPostgres('audit_logs', {
      township_id: auditData.township_id || 'b0000000-0000-0000-0000-000000000001',
      user_id: auditData.actor_id || null,
      action: auditData.action,
      entity_type: auditData.entity_type,
      entity_id: auditData.entity_id || '00000000-0000-0000-0000-000000000000',
    });
    const keys = Object.keys(sanitized);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    pool.query(`INSERT INTO audit_logs (${keys.join(', ')}) VALUES (${placeholders})`, keys.map(k => sanitized[k])).catch(() => {});
  }
  return logged;
};

/**
 * Reset memory store (used by tests)
 */
export const reset = () => {
  return inMemoryDb.reset();
};

export const tables = inMemoryDb.tables;

export default {
  query,
  withTransaction,
  testConnection,
  closePool,
  findAll,
  find,
  findOne,
  findById,
  insert,
  update,
  delete: deleteRecord,
  logAudit,
  reset,
  tables: inMemoryDb.tables,
  inMemoryDb,
  pool,
};
