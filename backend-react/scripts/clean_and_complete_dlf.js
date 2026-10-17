import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function cleanAndCompleteDLF() {
  const townshipId = 'b0000000-0000-0000-0000-000000000001';
  console.log('=== STARTING DLF CYBERCITY DATA CLEANUP & COMPLETION ===\n');

  // 1. Delete redundant dummy test users with 0 references
  console.log('1. Removing redundant / test dummy users...');
  const delRes = await pool.query(`
    DELETE FROM users 
    WHERE email LIKE '%clerk.179217%' 
       OR email = 'anjali.clerk.1792174262489@infralynx.com'
       OR id = '07baf4d0-de9a-4a97-96c1-89c95d87e2bf'
  `);
  console.log(`   ✔ Deleted ${delRes.rowCount} redundant dummy user(s).`);

  // 2. Unscope Super Admin from DLF CyberCity (Super Admin is platform-wide, not tenant-scoped)
  console.log('\n2. Scoping Platform Super Admin to platform level (township_id = NULL)...');
  await pool.query(`ALTER TABLE users ALTER COLUMN township_id DROP NOT NULL`);
  await pool.query(`UPDATE users SET township_id = NULL WHERE role = 'SUPER_ADMIN'`);
  console.log('   ✔ Super Admin is now properly platform-scoped.');

  // 3. Clean up Clerk names, usernames & formatting for newly added clerks
  console.log('\n3. Normalizing Clerk account names & handles...');
  await pool.query(`
    UPDATE users 
    SET name = 'Pinku Paswan', username = 'pinku.clerk', sector = 'DLF Phase 5, Sector 54', phone = '+91 98111 44551'
    WHERE email = 'pinku@infralynx.com'
  `);
  await pool.query(`
    UPDATE users 
    SET name = 'Ramni Gupta', username = 'ramni.clerk', sector = 'DLF Phase 5, Sector 54', phone = '+91 98111 44552'
    WHERE email = 'ramni@infralynx.com'
  `);
  console.log('   ✔ Pinku Paswan (Water Supply) & Ramni Gupta (Horticulture) handles standardized.');

  // 4. Ensure All 4 Municipal Departments have a designated Department Head
  console.log('\n4. Checking Department Head assignments for all 4 departments...');
  const waterDeptId = 'd0000000-0000-0000-0000-000000000003';
  const hortDeptId = 'd0000000-0000-0000-0000-000000000004';
  const civilDeptId = 'd0000000-0000-0000-0000-000000000001';
  const elecDeptId = 'd0000000-0000-0000-0000-000000000002';

  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  // 4a. Check / Create Dept Head for Water Supply & Drainage Sanitation
  const waterHeadUser = await pool.query(`SELECT id FROM users WHERE email = 'sunita.rao@infralynx.com'`);
  let waterHeadId;
  if (waterHeadUser.rows.length === 0) {
    waterHeadId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO users (id, township_id, department_id, name, email, username, password_hash, role, sector, phone, status)
      VALUES ($1, $2, $3, 'Er. Sunita Rao', 'sunita.rao@infralynx.com', 'head_water', $4, 'DEPARTMENT_HEAD', 'DLF Phase 5, Sector 54', '+91 98111 33441', 'ACTIVE')
    `, [waterHeadId, townshipId, waterDeptId, defaultPasswordHash]);
    console.log('   ✔ Created Department Head for Water Supply: Er. Sunita Rao (sunita.rao@infralynx.com)');
  } else {
    waterHeadId = waterHeadUser.rows[0].id;
    console.log('   Department Head for Water Supply already exists: Er. Sunita Rao');
  }
  await pool.query(`UPDATE departments SET department_head_id = $1 WHERE id = $2`, [waterHeadId, waterDeptId]);

  // 4b. Check / Create Dept Head for Horticulture & Urban Waste Management
  const hortHeadUser = await pool.query(`SELECT id FROM users WHERE email = 'harpreet.dhillon@infralynx.com'`);
  let hortHeadId;
  if (hortHeadUser.rows.length === 0) {
    hortHeadId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO users (id, township_id, department_id, name, email, username, password_hash, role, sector, phone, status)
      VALUES ($1, $2, $3, 'Harpreet Singh Dhillon', 'harpreet.dhillon@infralynx.com', 'head_horticulture', $4, 'DEPARTMENT_HEAD', 'DLF Phase 5, Sector 54', '+91 98111 33442', 'ACTIVE')
    `, [hortHeadId, townshipId, hortDeptId, defaultPasswordHash]);
    console.log('   ✔ Created Department Head for Horticulture: Harpreet Singh Dhillon (harpreet.dhillon@infralynx.com)');
  } else {
    hortHeadId = hortHeadUser.rows[0].id;
    console.log('   Department Head for Horticulture already exists: Harpreet Singh Dhillon');
  }
  await pool.query(`UPDATE departments SET department_head_id = $1 WHERE id = $2`, [hortHeadId, hortDeptId]);

  // 5. Verify 100% Department Coverage
  console.log('\n=== FINAL VERIFICATION OF DLF CYBERCITY DEPARTMENTS & MUNICIPAL COVERAGE ===');
  const summary = await pool.query(`
    SELECT 
      d.name AS department_name,
      dh.name AS department_head,
      dh.email AS head_email,
      cl.name AS desk_clerk,
      cl.email AS clerk_email,
      c.company_name AS empanelled_contractor,
      fc.name AS field_contractor_user,
      a.contract_number AS active_amc
    FROM departments d
    LEFT JOIN users dh ON d.department_head_id = dh.id
    LEFT JOIN users cl ON cl.department_id = d.id AND cl.role = 'DESK_CLERK' AND cl.status = 'ACTIVE'
    LEFT JOIN amcs a ON a.department_id = d.id AND a.status = 'ACTIVE'
    LEFT JOIN contractors c ON a.contractor_id = c.id
    LEFT JOIN users fc ON fc.contractor_id = c.id AND fc.role = 'FIELD_CONTRACTOR' AND fc.status = 'ACTIVE'
    WHERE d.township_id = $1
    ORDER BY d.name
  `, [townshipId]);

  console.table(summary.rows);

  // 6. User Directory for DLF CyberCity
  console.log('\n=== FINAL ACTIVE USER DIRECTORY FOR DLF CYBERCITY ===');
  const activeUsers = await pool.query(`
    SELECT u.name, u.email, u.username, u.role, d.name AS department, c.company_name AS contractor, u.status
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN contractors c ON u.contractor_id = c.id
    WHERE u.township_id = $1
    ORDER BY u.role, u.name
  `, [townshipId]);
  console.table(activeUsers.rows);

  console.log(`Total active tenant accounts in DLF CyberCity: ${activeUsers.rows.length}`);
  await pool.end();
}

cleanAndCompleteDLF().catch((err) => {
  console.error('Error executing script:', err);
  process.exit(1);
});
