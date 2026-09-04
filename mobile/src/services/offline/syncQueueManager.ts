import { SyncQueueManager } from '@arogyasetu/shared/services/offline';
import { randomUUID } from 'expo-crypto';
import { rnStorageAdapter } from './rnStorageAdapter';
import { rnConnectivityAdapter } from './rnConnectivityAdapter';

/**
 * The mobile instance of the shared sync queue, backed by SQLite and NetInfo.
 * The web app builds its own instance with its own adapter pair instead (see
 * frontend/src/services/offline/syncQueueManager.ts).
 */
export const syncQueueManager = new SyncQueueManager(
  rnStorageAdapter,
  rnConnectivityAdapter,
  randomUUID
);
