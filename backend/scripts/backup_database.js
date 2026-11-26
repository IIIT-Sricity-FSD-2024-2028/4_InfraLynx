import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });

const TABLES = [
  'payments', 'invoices', 'invoice_items', 'estimate_items', 'estimates',
  'work_evidence', 'work_completion_items', 'work_completions', 'work_orders',
  'complaint_evidence', 'complaint_photos', 'complaints', 'approvals',
  'verifications', 'audit_logs', 'notifications', 'assets', 'contractor_services',
  'amc_rates', 'amcs', 'users', 'departments', 'townships', 'township_settings',
  'township_subscriptions', 'subscription_plans', 'slas', 'approval_rules',
  'global_config', 'super_audit_logs',
];

const sqlLiteral = (v) => {
  if (v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const withRetry = async (label, fn, attempts = 4) => {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (e) {
      if (i === attempts) throw new Error(`${label}: ${e.message}`);
      const wait = i * 1500;
      console.warn(`  retry ${i}/${attempts} ${label} (${e.code || e.message}) in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return null;
};

const run = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(root, 'db-backups', stamp);
  fs.mkdirSync(outDir, { recursive: true });

  const newPool = () => new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 20000,
  });

  const summary = [];
  const sqlPath = path.join(outDir, 'restore.sql');
  fs.writeFileSync(sqlPath, `-- Full dump ${stamp}\n-- Restore: psql "$DATABASE_URL" -f ${path.basename(sqlPath)}\nBEGIN;\nSET CONSTRAINTS ALL DEFERRED;\n`);

  const probe = newPool();
  const present = await withRetry('list tables', () => probe.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
  ));
  await probe.end();
  const have = new Set(present.rows.map((r) => r.table_name));

  for (const tbl of TABLES.filter((t) => have.has(t))) {
    const pool = newPool();
    try {
      const res = await withRetry(tbl, () => pool.query(`SELECT * FROM "${tbl}" ORDER BY 1`));
      const rows = res.rows;
      fs.writeFileSync(path.join(outDir, `${tbl}.json`), JSON.stringify(rows, null, 2));
      if (rows.length) {
        const cols = Object.keys(rows[0]);
        const vals = rows.map((r) => `(${cols.map((c) => sqlLiteral(r[c])).join(', ')})`);
        fs.appendFileSync(
          sqlPath,
          `INSERT INTO "${tbl}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES\n  ${vals.join(',\n  ')};\n`
        );
      }
      summary.push(`${String(rows.length).padStart(6)}  ${tbl}`);
    } finally {
      await pool.end().catch(() => {});
    }
  }

  fs.appendFileSync(sqlPath, 'COMMIT;\n');
  fs.writeFileSync(path.join(outDir, 'MANIFEST.txt'), summary.join('\n') + '\n');
  console.log(`\nBackup written to ${outDir}\n${summary.join('\n')}`);
};

run().catch((e) => {
  console.error('BACKUP FAILED:', e.message);
  process.exit(1);
});
