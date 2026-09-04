import { QueueStorageAdapter } from '@arogyasetu/shared/services/offline';
import { SyncOperation } from '@arogyasetu/shared/types';
import { getDB } from './indexedDbService';

/** Backs the sync queue with the browser's IndexedDB `sync_queue` store. */
export const webStorageAdapter: QueueStorageAdapter = {
  async count() {
    const db = await getDB();
    return db.count('sync_queue');
  },
  async getAll() {
    const db = await getDB();
    return (await db.getAll('sync_queue')) as SyncOperation[];
  },
  async get(id) {
    const db = await getDB();
    return (await db.get('sync_queue', id)) as SyncOperation | undefined;
  },
  async put(operation) {
    const db = await getDB();
    await db.put('sync_queue', operation);
  },
  async delete(id) {
    const db = await getDB();
    await db.delete('sync_queue', id);
  },
  async clear() {
    const db = await getDB();
    await db.clear('sync_queue');
  },
};
