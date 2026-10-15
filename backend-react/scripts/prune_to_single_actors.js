import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const EXECUTE = process.argv.includes('--execute');

// Reference/master data preserved: townships, departments, contractors, amcs,
// amc_rates, slas, approval_rules, global_config, subscription_plans,
// township_settings, super_audit_logs.
const TRANSACTIONAL = [
  'payments', 'invoice_items', 'invoices', 'estimate_items', 'estimates',
  'work_evidence', 'work_completion_items', 'work_completions', 'work_orders',
  'verifications', 'approvals', 'complaint_evidence', 'complaint_photos',
  'notifications', 'complaints', 'audit_logs',
];

const KEEP_ROLES = [
  'RWA', 'DESK_CLERK', 'FIELD_CONTRACTOR',
  'DEPARTMENT_HEAD', 'FINANCE_CLERK', 'TOWNSHIP_COO', 'SUPER_ADMIN',
];

// The seven accounts the TIMS workflow signs in with. All already carry
// Password@123 per Database-react/seed.sql.
const KEEP_EMAILS = [
  'rwa@infralynx.com', 'clerk@infralynx.com', 'contractor@infralynx.com',
  'head@infralynx.com', 'finance@infralynx.com', 'coo@infralynx.com',
  'superadmin@infralynx.com',
];

const run = async () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 20000,
  });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const before = {};
    for (const t of [...TRANSACTIONAL, 'users']) {
      before[t] = (await client.query(`SELECT COUNT(*)::int n FROM "${t}"`)).rows[0].n;
    }

    for (const t of TRANSACTIONAL) {
      const { rowCount } = await client.query(`DELETE FROM "${t}"`);
      console.log(`purge  ${t.padEnd(24)} ${before[t] - rowCount} -> ${rowCount ? '' : '0'}${rowCount ? ` (remaining ${rowCount})` : ''}`);
    }

    // Repoint department heads to the single canonical DEPARTMENT_HEAD before
    // the junk accounts go, so no FK dangles.
    const head = await client.query("SELECT id FROM users WHERE email = 'head@infralynx.com'");
    await client.query(
      `UPDATE departments
          SET department_head_id = CASE WHEN LOWER(name) LIKE '%road%'
                                            OR LOWER(name) LIKE '%civil%'
                                        THEN $1::uuid ELSE NULL END`,
      [head.rows[0].id]
    );

    const doomed = await client.query(
      `SELECT id, email, role::text AS role FROM users
        WHERE email <> ALL($1) OR role::text <> ALL($2)`,
      [KEEP_EMAILS, KEEP_ROLES]
    );
    const { rowCount: deleted } = await client.query(
      `DELETE FROM users
        WHERE email <> ALL($1) OR role::text <> ALL($2)`,
      [KEEP_EMAILS, KEEP_ROLES]
    );
    console.log(`\ndropped ${deleted} non-canonical accounts:`);
    const byRole = {};
    doomed.rows.forEach((r) => { byRole[r.role] = (byRole[r.role] || 0) + 1; });
    Object.entries(byRole).forEach(([role, n]) => console.log(`   ${n} x ${role}`));

    const after = await client.query(
      'SELECT role::text role, email, name FROM users ORDER BY role'
    );
    console.log(`\nremaining ${after.rowCount} actors (1 per role):`);
    after.rows.forEach((r) => console.log(`   ${r.role.padEnd(17)} ${r.email.padEnd(26)} ${r.name}`));

    if (!EXECUTE) {
      await client.query('ROLLBACK');
      console.log('\nDRY RUN - rolled back. Re-run with --execute to commit.');
      return;
    }
    await client.query('COMMIT');
    console.log('\nPRUNE COMMITTED.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((e) => {
  console.error('PRUNE FAILED (rolled back):', e.message);
  process.exit(1);
});
