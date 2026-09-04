import * as SQLite from 'expo-sqlite';
import { QueueStorageAdapter } from '@arogyasetu/shared/services/offline';
import { SyncOperation } from '@arogyasetu/shared/types';

const DB_NAME = 'arogyasetu_offline.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * One table holding the queue, the JSON-serialised operation keyed by id.
 * SQLite (not AsyncStorage) because the queue needs `getAll`/`count` over the
 * whole set, not just key-value lookups.
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(
        'CREATE TABLE IF NOT EXISTS sync_queue (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);'
      );
      return db;
    })();
  }
  return dbPromise;
}

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
