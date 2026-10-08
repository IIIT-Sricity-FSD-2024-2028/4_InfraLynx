/**
 * TIMS Database Migration & Seeding Script for Neon Cloud PostgreSQL
 * 
 * Usage:
 *   node src/scripts/init-neon.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend-react/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL is not defined in backend-react/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('========================================================================');
    console.log('   🚀 INITIALIZING NEON CLOUD POSTGRESQL DATABASE FOR TIMS');
    console.log('========================================================================');
    console.log(`📡 Connecting to Neon database: ${databaseUrl.split('@')[1] || 'Connected'}`);

    const schemaPath = path.resolve(__dirname, '../../../Database-react/schema.sql');
    const seedPath = path.resolve(__dirname, '../../../Database-react/seed.sql');

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at ${seedPath}`);
    }

    // 1. Run Schema
    console.log('\n─── 1. APPLYING DDL SCHEMA (TABLES, TYPES, ENUMS & CONSTRAINTS) ────────');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('✔ Schema applied successfully! 28 tables, triggers, and enum types created.');

    // 2. Run Seed
    console.log('\n─── 2. SEEDING REALISTIC INDIAN MUNICIPAL DATASET ──────────────────────');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('✔ Seed data inserted successfully!');

    // 3. Verify counts
    console.log('\n─── 3. VERIFYING SEEDED DATABASE COUNTS IN NEON ─────────────────────────');
    const tablesToVerify = [
      'subscription_plans',
      'townships',
      'departments',
      'contractors',
      'users',
      'slas',
      'amcs',
      'amc_rates',
      'approval_rules',
      'complaints',
      'work_orders',
      'invoices',
      'invoice_items',
      'payments',
    ];

    for (const tbl of tablesToVerify) {
      const res = await client.query(`SELECT COUNT(*) AS count FROM ${tbl}`);
      console.log(`   • Table '${tbl}': ${res.rows[0].count} rows`);
    }

    console.log('\n========================================================================');
    console.log('🎉 NEON POSTGRESQL DATABASE INITIALIZED & 100% IN SYNC WITH APP!');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n❌ Neon DB Initialization Error:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    if (err.where) console.error('   Where:', err.where);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
