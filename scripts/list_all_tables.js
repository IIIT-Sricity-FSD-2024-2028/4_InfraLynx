import db from '../backend-react/src/config/db.js';

async function listAllTables() {
  await db.testConnection();
  const res = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  console.log('All Tables in Database:');
  const tableNames = res.rows.map(r => r.table_name);
  console.log(tableNames);

  for (const t of tableNames) {
    try {
      const cnt = await db.query(`SELECT count(*) FROM "${t}"`);
      console.log(`${t}: ${cnt.rows[0].count} rows`);
    } catch (e) {
      console.log(`${t}: error ${e.message}`);
    }
  }
  process.exit(0);
}

listAllTables().catch(err => {
  console.error(err);
  process.exit(1);
});
