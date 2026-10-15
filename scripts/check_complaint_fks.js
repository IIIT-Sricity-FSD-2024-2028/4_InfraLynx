import db from '../backend-react/src/config/db.js';

async function check() {
  await db.testConnection();
  const fks = await db.query(`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE ccu.table_name = 'complaints'
  `);
  console.log('--- Foreign Keys referencing complaints: ---');
  console.table(fks.rows);

  // Also check all tables with complaint_id or work_order_id
  const relatedCols = await db.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE column_name IN ('complaint_id', 'work_order_id', 'estimate_id', 'invoice_id')
      AND table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('--- Columns referencing ticket lifecycle: ---');
  console.table(relatedCols.rows);

  const tables = [
    'complaints',
    'complaint_evidence',
    'work_orders',
    'work_evidence',
    'estimates',
    'estimate_items',
    'invoices',
    'invoice_items',
    'payments',
    'audit_logs'
  ];
  console.log('--- Current Table Row Counts: ---');
  for (const t of tables) {
    try {
      const res = await db.query(`SELECT count(*) FROM ${t}`);
      console.log(`${t}: ${res.rows[0].count} rows`);
    } catch (e) {
      console.log(`${t}: (not present or error)`);
    }
  }
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
