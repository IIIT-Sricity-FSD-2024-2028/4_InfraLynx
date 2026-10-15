import fs from 'fs';
import path from 'path';
import db from '../backend-react/src/config/db.js';

const backupDir = path.resolve('backend-react/db-backups/2026-10-15T11-23-33-666Z');

function readJson(tbl) {
  const file = path.join(backupDir, tbl + '.json');
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8').trim();
  if (!content || content === '[]') return [];
  try {
    const records = JSON.parse(content);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

async function insertRecords(tbl, records, transform) {
  if (!records || records.length === 0) return;
  console.log(`Restoring ${tbl}: ${records.length} records`);
  for (const raw of records) {
    const rec = transform ? transform({ ...raw }) : { ...raw };
    const keys = Object.keys(rec);
    const vals = Object.values(rec).map((v) =>
      typeof v === 'object' && v !== null ? JSON.stringify(v) : v
    );
    const placeholders = keys.map((_, i) => '$' + (i + 1)).join(', ');
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const query = `INSERT INTO "${tbl}" (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    try {
      await db.query(query, vals);
    } catch (e) {
      console.warn(`  [${tbl}] insert notice:`, e.message);
    }
  }
}

async function run() {
  await db.testConnection();

  // 1. Subscription plans & Townships
  await insertRecords('subscription_plans', readJson('subscription_plans'));
  await insertRecords('townships', readJson('townships'));

  // 2. Contractors
  await insertRecords('contractors', readJson('contractors'));

  // 3. Departments (insert with department_head_id = null first to break circular dependency)
  const departments = readJson('departments');
  await insertRecords('departments', departments, (d) => ({
    ...d,
    department_head_id: null,
  }));

  // 4. Users (now townships, contractors, and departments exist)
  await insertRecords('users', readJson('users'));

  // 5. Update departments with department_head_id now that users exist
  for (const d of departments) {
    if (d.department_head_id) {
      try {
        await db.query('UPDATE departments SET department_head_id = $1 WHERE id = $2', [
          d.department_head_id,
          d.id,
        ]);
      } catch (e) {
        console.warn('  [departments update notice]:', e.message);
      }
    }
  }

  // 6. AMCs & AMC Rates
  await insertRecords('amcs', readJson('amcs'));
  await insertRecords('amc_rates', readJson('amc_rates'));

  // 7. SLAs & Assets
  await insertRecords('slas', readJson('slas'));
  await insertRecords('assets', readJson('assets'));

  // 8. Complaints & Evidence
  await insertRecords('complaints', readJson('complaints'));
  await insertRecords('complaint_photos', readJson('complaint_photos'));
  await insertRecords('complaint_evidence', readJson('complaint_evidence'));

  // 9. Work Orders & Evidence
  await insertRecords('work_orders', readJson('work_orders'));
  await insertRecords('work_evidence', readJson('work_evidence'));

  // 10. Estimates & Estimate Items
  await insertRecords('estimates', readJson('estimates'));
  await insertRecords('estimate_items', readJson('estimate_items'));

  // 11. Invoices & Invoice Items
  await insertRecords('invoices', readJson('invoices'));
  await insertRecords('invoice_items', readJson('invoice_items'));

  // 12. Payments
  await insertRecords('payments', readJson('payments'));

  // 13. Audit logs
  await insertRecords('audit_logs', readJson('audit_logs'));
  await insertRecords('super_audit_logs', readJson('super_audit_logs'));

  console.log('Restoration complete!');
  const uCount = await db.query('SELECT count(*) FROM users');
  console.log('Total Users in Database:', uCount.rows[0].count);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
