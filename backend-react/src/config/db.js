/**
 * TIMS Database Module (100% In-Memory Relational Engine)
 * Zero installation, zero external database daemon required.
 */

import inMemoryDb from './inMemoryDb.js';

export const query = async (text, params = []) => {
  return inMemoryDb.query(text, params);
};

export const withTransaction = async (callback) => {
  return inMemoryDb.withTransaction(callback);
};

export const testConnection = async () => {
  return inMemoryDb.testConnection();
};

export const closePool = async () => {
  return true;
};

export const tables = inMemoryDb.tables;

export { inMemoryDb };
export default {
  query,
  withTransaction,
  testConnection,
  closePool,
  tables: inMemoryDb.tables,
  inMemoryDb,
};
