import db from '../backend-react/src/config/db.js';

async function main() {
  await db.testConnection();
  const res = await db.query(`
    SELECT table_name, column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name IN ('complaint_evidence', 'work_evidence', 'complaint_photos') AND column_name LIKE '%url%'
  `);
  console.log('--- URL COLUMNS SCHEMA ---');
  console.table(res.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
