/**
 * TIMS Database Module
 * Supports Neon Cloud PostgreSQL when DATABASE_URL is provided,
 * with zero-install in-memory relational fallback for test suites and offline work.
 */

import pg from 'pg';
import inMemoryDb from './inMemoryDb.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

let pool = null;

if (databaseUrl) {
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]:', err.message);
  });
}

export const query = async (text, params = []) => {
  if (pool) {
    return pool.query(text, params);
  }
  return inMemoryDb.query(text, params);
};

export const withTransaction = async (callback) => {
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return inMemoryDb.withTransaction(callback);
};

export const testConnection = async () => {
  if (pool) {
    const res = await pool.query('SELECT NOW() AS current_time');
    console.log(`✅ [Database] PostgreSQL Connected (Neon Cloud): ${res.rows[0].current_time}`);
    return true;
  }
  return inMemoryDb.testConnection();
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
  }
  return true;
};

export const tables = inMemoryDb.tables;

export { inMemoryDb, pool };
export default {
  query,
  withTransaction,
  testConnection,
  closePool,
  tables: inMemoryDb.tables,
  inMemoryDb,
  pool,
};
