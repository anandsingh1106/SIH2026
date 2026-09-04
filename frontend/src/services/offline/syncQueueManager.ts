import { SyncQueueManager } from '@arogyasetu/shared/services/offline';
import { webStorageAdapter } from './webStorageAdapter';
import { webConnectivityAdapter } from './webConnectivityAdapter';

/**
 * The web instance of the shared sync queue, backed by IndexedDB and the
 * browser's online/offline events. Mobile constructs its own instance in
 * mobile/src/services/offline with a SQLite + NetInfo adapter pair instead.
 */
export const syncQueueManager = new SyncQueueManager(
  webStorageAdapter,
  webConnectivityAdapter,
  () => crypto.randomUUID()
);
