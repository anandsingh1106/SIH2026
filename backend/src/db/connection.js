import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env.js';

let db = null;

export function getDb() {
  if (db) return db;

  db = new DatabaseSync(env.DATABASE_PATH);

  // Referential integrity must be enabled per-connection in SQLite.
  db.exec('PRAGMA foreign_keys = ON;');
  // WAL lets readers proceed during writes — important for concurrent requests.
  db.exec('PRAGMA journal_mode = WAL;');
  // Wait rather than immediately failing when another write holds the lock.
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA synchronous = NORMAL;');

  return db;
}

/**
 * Runs `fn` inside a transaction, rolling back if it throws.
 * SQLite does not support nested transactions, so a nested call reuses the
 * outer transaction rather than starting a new one.
 */
let transactionDepth = 0;

export function transaction(fn) {
  const database = getDb();

  if (transactionDepth > 0) {
    return fn(database);
  }

  database.exec('BEGIN IMMEDIATE;');
  transactionDepth++;
  try {
    const result = fn(database);
    database.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      database.exec('ROLLBACK;');
    } catch {
      // A failed rollback must not mask the original error.
    }
    throw err;
  } finally {
    transactionDepth--;
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
