import * as SQLite from 'expo-sqlite';
import { QueueStorageAdapter } from '@arogyasetu/shared/services/offline';
import { SyncOperation } from '@arogyasetu/shared/types';

const DB_NAME = 'arogyasetu_offline.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Two tables in the same offline database: the sync queue (JSON-serialised
 * operation keyed by id), and a read-only mirror of the worker's patient
 * roster. Neither is AsyncStorage because both need `getAll`/`count` over the
 * whole set, not just key-value lookups.
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(
        'CREATE TABLE IF NOT EXISTS sync_queue (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);' +
        'CREATE TABLE IF NOT EXISTS patients_cache (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);'
      );
      return db;
    })();
  }
  return dbPromise;
}

/**
 * Caches the patient roster locally so a worker who opens a screen while
 * already offline still sees who they can select — GET requests have no sync
 * queue to fall back on, so without this the list is just empty until the
 * device is back online.
 */
export const patientsCache = {
  async replaceAll(patients: Array<{ id: string } & Record<string, unknown>>): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM patients_cache');
      for (const patient of patients) {
        await db.runAsync(
          'INSERT OR REPLACE INTO patients_cache (id, payload) VALUES (?, ?)',
          patient.id,
          JSON.stringify(patient)
        );
      }
    });
  },

  async getAll<T = Record<string, unknown>>(): Promise<T[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM patients_cache');
    return rows.map((r) => JSON.parse(r.payload) as T);
  },
};

export const rnStorageAdapter: QueueStorageAdapter = {
  async count() {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM sync_queue');
    return row?.n ?? 0;
  },

  async getAll() {
    const db = await getDb();
    const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM sync_queue');
    return rows.map((r) => JSON.parse(r.payload) as SyncOperation);
  },

  async get(id) {
    const db = await getDb();
    const row = await db.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM sync_queue WHERE id = ?',
      id
    );
    return row ? (JSON.parse(row.payload) as SyncOperation) : undefined;
  },

  async put(operation) {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_queue (id, payload) VALUES (?, ?)',
      operation.id,
      JSON.stringify(operation)
    );
  },

  async delete(id) {
    const db = await getDb();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
  },

  async clear() {
    const db = await getDb();
    await db.runAsync('DELETE FROM sync_queue');
  },
};
