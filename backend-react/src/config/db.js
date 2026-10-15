/**
 * TIMS PostgreSQL Database Interface
 * 100% Native Neon Cloud PostgreSQL Database Layer
 */

import pg from 'pg';
import crypto from 'crypto';
import config from './env.js';

const { Pool } = pg;
const databaseUrl = config.databaseUrl || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ [Fatal] DATABASE_URL is not defined in environment! PostgreSQL is required.');
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

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
    'is_duplicate', 'master_complaint_id', 'validated_by', 'validated_at', 'rejection_reason',
    'reported_at', 'updated_at'
  ],
  complaint_photos: ['id', 'complaint_id', 'file_url', 'file_type', 'uploaded_by'],
  complaint_evidence: ['id', 'complaint_id', 'evidence_type', 'file_url', 'caption', 'uploaded_by', 'created_at'],
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
  global_config: ['id', 'key', 'value', 'category', 'description', 'updated_at'],
  super_audit_logs: ['id', 'admin_id', 'admin_name', 'admin_role', 'action', 'entity_type', 'entity_id', 'tenant_id', 'previous_value', 'new_value', 'outcome', 'notes', 'timestamp'],
  subscription_plans: ['id', 'name', 'plan_label', 'price', 'billing_cycle', 'max_users', 'max_departments', 'features'],
  township_subscriptions: ['id', 'township_id', 'plan_id', 'start_date', 'end_date', 'status', 'created_at'],
  tenant_subscriptions: ['id', 'township_id', 'subscription_plan_id', 'status', 'start_date', 'end_date', 'billing_cycle'],
};

const UUID_COLUMNS = new Set([
  'id', 'township_id', 'department_id', 'contractor_id', 'reported_by',
  'asset_id', 'sla_id', 'master_complaint_id', 'validated_by', 'complaint_id',
  'work_order_id', 'assigned_by', 'uploaded_by', 'amc_id', 'amc_rate_id',
  'estimate_id', 'approver_id', 'invoice_id', 'authorized_by', 'user_id',
  'subscription_plan_id', 'department_head_id', 'entity_id'
]);

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const ENUM_MAPPINGS = {
  complaints: {
    status: (val) => {
      const valid = new Set(['REPORTED', 'UNDER_REVIEW', 'VALIDATED', 'WORK_ORDER_CREATED', 'AWAITING_DEPT_HEAD', 'AWAITING_COO', 'ESCALATED_TO_COO', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'DISPUTED', 'VERIFIED', 'CLOSED', 'REJECTED']);
      if (valid.has(val)) return val;
      if (val === 'ASSIGNED') return 'WORK_ORDER_CREATED';
      return 'REPORTED';
    },
  },
  work_orders: {
    status: (val) => {
      const valid = new Set(['ASSIGNED', 'INSPECTION_PENDING', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_DEPT_HEAD', 'AWAITING_COO', 'ESCALATED_TO_COO', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REWORK_REQUESTED', 'REVISION_REQUESTED', 'REJECTED', 'CLOSED']);
      if (val === 'WORK_ORDER_CREATED') return 'ASSIGNED';
      if (valid.has(val)) return val;
      if (val === 'SETTLED') return 'CLOSED';
      return 'ASSIGNED';
    },
  },
  estimates: {
    status: (val) => {
      const valid = new Set(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED']);
      if (valid.has(val)) return val;
      if (val === 'AWAITING_DEPT_HEAD') return 'SUBMITTED';
      if (val === 'WORK_ORDER_CREATED') return 'APPROVED';
      return 'SUBMITTED';
    },
  },
  payments: {
    status: (val) => {
      const valid = new Set(['SCHEDULED', 'PROCESSING', 'DISBURSED', 'FAILED']);
      if (valid.has(val)) return val;
      if (val === 'PAID') return 'DISBURSED';
      return 'SCHEDULED';
    },
  },
};

/**
 * Filter object fields to only those present in target table schema
 * and sanitize UUID columns so invalid syntax strings never reject in PostgreSQL.
 */
function sanitizeForPostgres(table, record) {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed || !record || typeof record !== 'object') return record;
  const sanitized = {};
  for (const col of allowed) {
    if (record[col] !== undefined) {
      let val = record[col];
      if (UUID_COLUMNS.has(col)) {
        if (typeof val === 'string' && !UUID_REGEX.test(val)) {
          val = col === 'id' ? crypto.randomUUID() : null;
        }
      }
      if (ENUM_MAPPINGS[table] && ENUM_MAPPINGS[table][col]) {
        val = ENUM_MAPPINGS[table][col](val);
      }
      sanitized[col] = val;
    }
  }
  return sanitized;
}

// Live table state synchronized directly with Neon PostgreSQL
export const tables = {
  townships: [],
  departments: [],
  contractors: [],
  users: [],
  slas: [],
  assets: [],
  complaints: [],
  complaint_photos: [],
  complaint_evidence: [],
  amcs: [],
  amc_rates: [],
  work_orders: [],
  work_evidence: [],
  estimates: [],
  estimate_items: [],
  approvals: [],
  invoices: [],
  invoice_items: [],
  payments: [],
  audit_logs: [],
  global_config: [],
  super_audit_logs: [],
  subscription_plans: [],
  tenant_subscriptions: [],
};

/**
 * Fetch and refresh all tables directly from Neon PostgreSQL
 */
export async function refreshTablesFromPostgres() {
  if (!pool) return;
  const tableNames = Object.keys(TABLE_COLUMNS);
  await Promise.all(
    tableNames.map(async (tbl) => {
      try {
        const res = await pool.query(`SELECT * FROM ${tbl}`);
        tables[tbl] = res.rows || [];
      } catch {
        if (!tables[tbl]) tables[tbl] = [];
      }
    })
  );

  // Cross-populate complaint_evidence from work_evidence & complaint_photos if complaint_evidence is empty
  if (tables.complaint_evidence.length === 0 && tables.complaints.length > 0) {
    const synthetic = [];
    for (const ph of (tables.complaint_photos || [])) {
      synthetic.push({
        id: ph.id,
        complaint_id: ph.complaint_id,
        evidence_type: 'BEFORE',
        file_url: ph.file_url,
        caption: 'Citizen reported photo',
        uploaded_by: ph.uploaded_by,
        created_at: ph.uploaded_at || new Date().toISOString(),
      });
    }
    for (const we of (tables.work_evidence || [])) {
      const matchedWo = tables.work_orders.find((w) => w.id === we.work_order_id);
      if (matchedWo && matchedWo.complaint_id) {
        synthetic.push({
          id: we.id,
          complaint_id: matchedWo.complaint_id,
          evidence_type: we.type || 'AFTER',
          file_url: we.file_url,
          caption: we.remarks || 'Work evidence photo',
          uploaded_by: we.uploaded_by,
          created_at: new Date().toISOString(),
        });
      }
    }
    tables.complaint_evidence = synthetic;
  }

  // Populate tenant_subscriptions alias from township_subscriptions if needed
  if ((!tables.tenant_subscriptions || tables.tenant_subscriptions.length === 0) && tables.township_subscriptions?.length > 0) {
    tables.tenant_subscriptions = tables.township_subscriptions.map((s) => ({
      ...s,
      subscription_plan_id: s.plan_id || s.subscription_plan_id,
    }));
  }
}

/**
 * Raw parameterized SQL execution directly against Neon PostgreSQL
 */
export const query = async (text, params = []) => {
  return await pool.query(text, params);
};

/**
 * Transaction runner with rollback on Neon PostgreSQL
 */
export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

export const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() AS current_time');
    return true;
  } catch (err) {
    console.error('[PostgreSQL Connection Test Failed]:', err.message);
    return false;
  }
};

/**
 * Close database pool on shutdown
 */
export const closePool = async () => {
  if (pool) {
    await pool.end().catch(() => {});
  }
  return true;
};

// ── High-Level Entity Operations (Directly backed by Neon PostgreSQL) ───────────

export const findAll = (table, filter = null) => {
  const list = tables[table] || [];
  if (!filter) return list;
  const predicate = typeof filter === 'function' ? filter : () => true;
  return list.filter(predicate);
};

export const find = (table, filter = null) => findAll(table, filter);

export const findOne = (table, filter) => {
  const list = tables[table] || [];
  if (!filter) return list[0] || null;
  const predicate = typeof filter === 'function' ? filter : () => true;
  return list.find(predicate) || null;
};

export const findById = (table, id) => {
  const list = tables[table] || [];
  return list.find((row) => row.id === id || row.complaint_code === id || row.work_order_number === id) || null;
};

/**
 * Insert record directly into Neon PostgreSQL and live table cache
 */
export const insert = (table, record) => {
  const newId = record.id && UUID_REGEX.test(record.id) ? record.id : crypto.randomUUID();
  const item = {
    ...record,
    id: newId,
    created_at: record.created_at || new Date().toISOString(),
  };

  // Add to live cache immediately for sync operations
  if (!tables[table]) tables[table] = [];
  tables[table].unshift(item);

  // Persist directly to Neon PostgreSQL
  if (TABLE_COLUMNS[table]) {
    const sanitized = sanitizeForPostgres(table, item);
    const keys = Object.keys(sanitized);
    if (keys.length > 0) {
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING RETURNING *`;
      const values = keys.map((k) => sanitized[k]);
      pool.query(sql, values).catch((err) => {
        console.error(`[PostgreSQL Insert Error on ${table}]:`, err.message);
      });
    }
  }

  return item;
};

/**
 * Update record directly in Neon PostgreSQL and live table cache
 */
export const update = (table, id, updates) => {
  const list = tables[table] || [];
  const index = list.findIndex((row) => row.id === id || row.complaint_code === id);
  if (index === -1) return null;

  list[index] = {
    ...list[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const targetId = list[index].id;

  // Persist directly to Neon PostgreSQL
  if (TABLE_COLUMNS[table]) {
    const sanitized = sanitizeForPostgres(table, updates);
    const keys = Object.keys(sanitized).filter((k) => k !== 'id');
    if (keys.length > 0) {
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = [...keys.map((k) => sanitized[k]), targetId];
      const sql = `UPDATE ${table} SET ${setClauses} WHERE id = $${values.length}`;
      pool.query(sql, values).catch((err) => {
        console.error(`[PostgreSQL Update Error on ${table}]:`, err.message);
      });
    }
  }

  return list[index];
};

/**
 * Delete record directly from Neon PostgreSQL and live table cache
 */
export const deleteRecord = (table, id) => {
  const list = tables[table] || [];
  const index = list.findIndex((row) => row.id === id || row.complaint_code === id);
  if (index === -1) return false;

  const targetId = list[index].id;
  list.splice(index, 1);

  if (TABLE_COLUMNS[table]) {
    pool.query(`DELETE FROM ${table} WHERE id = $1`, [targetId]).catch((err) => {
      console.error(`[PostgreSQL Delete Error on ${table}]:`, err.message);
    });
  }

  return true;
};

/**
 * Log audit trail entry directly into Neon PostgreSQL
 */
export const logAudit = (auditData) => {
  const logged = insert('audit_logs', {
    township_id: auditData.township_id || 'b0000000-0000-0000-0000-000000000001',
    user_id: auditData.actor_id || null,
    action: auditData.action,
    entity_type: auditData.entity_type,
    entity_id: auditData.entity_id || '00000000-0000-0000-0000-000000000000',
    old_value: auditData.from_state ? JSON.stringify({ state: auditData.from_state }) : null,
    new_value: auditData.to_state ? JSON.stringify({ state: auditData.to_state }) : null,
  });
  return logged;
};

/**
 * Log platform super admin audit trail entry directly into Neon PostgreSQL
 */
export const logSuperAudit = (auditData) => {
  return insert('super_audit_logs', {
    admin_id: auditData.admin_id || 'sa-0000000-0000-0000-0000-000000000001',
    admin_name: auditData.admin_name || 'Super Admin',
    admin_role: auditData.admin_role || 'SUPER_ADMIN',
    action: auditData.action,
    entity_type: auditData.entity_type,
    entity_id: auditData.entity_id,
    tenant_id: auditData.tenant_id || null,
    previous_value: auditData.previous_value ? JSON.stringify(auditData.previous_value) : null,
    new_value: auditData.new_value ? JSON.stringify(auditData.new_value) : null,
    outcome: auditData.outcome || 'SUCCESS',
    notes: auditData.notes || null,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Reload live cache directly from Neon PostgreSQL
 */
export const reset = async () => {
  await refreshTablesFromPostgres();
  return true;
};

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
  logSuperAudit,
  reset,
  refreshTablesFromPostgres,
  tables,
  pool,
};
