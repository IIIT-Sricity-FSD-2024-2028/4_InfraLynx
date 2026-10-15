import db from '../backend-react/src/config/db.js';

async function purgeDatabase() {
  console.log('=====================================================');
  console.log('🧹 PURGING ALL COMPLAINTS & DEPENDENT LIFECYCLE DATA');
  console.log('=====================================================');

  await db.testConnection();

  const tablesToClear = [
    'payments',
    'invoice_items',
    'invoices',
    'estimate_items',
    'approvals',
    'estimates',
    'work_completion_items',
    'work_completions',
    'verifications',
    'work_evidence',
    'work_orders',
    'complaint_photos',
    'complaint_evidence',
    'audit_logs',
    'super_audit_logs',
    'notifications'
  ];

  console.log('\n--- 1. Clearing Dependent Ticket & Evidence Tables ---');
  for (const table of tablesToClear) {
    try {
      const res = await db.query(`DELETE FROM "${table}"`);
      console.log(`  ✓ Cleared ${table}: ${res.rowCount} rows removed`);
    } catch (err) {
      console.warn(`  ⚠️ Table ${table}: ${err.message}`);
    }
  }

  console.log('\n--- 2. Clearing Complaints Table ---');
  try {
    // Break self-referential master_complaint_id first
    await db.query(`UPDATE complaints SET master_complaint_id = NULL WHERE master_complaint_id IS NOT NULL`);
    const cRes = await db.query(`DELETE FROM complaints`);
    console.log(`  ✓ Cleared complaints: ${cRes.rowCount} rows removed`);
  } catch (err) {
    console.error(`  ❌ Failed to clear complaints: ${err.message}`);
    throw err;
  }

  console.log('\n--- 3. Verifying Preserved Master Data & User Accounts ---');
  const preservedTables = [
    'users',
    'townships',
    'departments',
    'contractors',
    'amcs',
    'amc_rates',
    'slas',
    'approval_rules',
    'subscription_plans',
    'township_settings'
  ];

  for (const table of preservedTables) {
    try {
      const res = await db.query(`SELECT count(*) FROM "${table}"`);
      console.log(`  ✓ Preserved ${table}: ${res.rows[0].count} active records`);
    } catch (err) {
      console.warn(`  ⚠️ Could not check ${table}: ${err.message}`);
    }
  }

  console.log('\n--- 4. Verifying Cleared State ---');
  for (const table of ['complaints', 'work_orders', 'invoices', 'estimates', 'complaint_evidence', 'payments']) {
    const res = await db.query(`SELECT count(*) FROM "${table}"`);
    console.log(`  ✓ ${table}: ${res.rows[0].count} rows remaining (Expected: 0)`);
  }

  console.log('\n--- 5. Active Users Ready For Clean Testing ---');
  const users = await db.query(`SELECT email, role, name FROM users ORDER BY role`);
  console.table(users.rows);

  console.log('\n🎉 DATABASE PURGE COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

purgeDatabase().catch((err) => {
  console.error('\n❌ Purge operation failed:', err);
  process.exit(1);
});
