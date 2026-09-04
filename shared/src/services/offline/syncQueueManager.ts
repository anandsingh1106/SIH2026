import { SyncOperation } from '../../types';
import { backendApi } from '../api/backendApi';
import { ApiError } from '../api/apiClient';

type SyncListener = (status: { isOnline: boolean; pendingCount: number; isSyncing: boolean }) => void;

/**
 * What the queue needs from platform storage: a single object store keyed by
 * operation id. Web backs this with IndexedDB (via `idb`); React Native backs
 * it with SQLite. Both implement exactly these five operations.
 */
export interface QueueStorageAdapter {
  count(): Promise<number>;
  getAll(): Promise<SyncOperation[]>;
  get(id: string): Promise<SyncOperation | undefined>;
  put(operation: SyncOperation): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * How the queue learns about connectivity. Web wraps `navigator.onLine` and
 * `window.addEventListener('online'/'offline')`; React Native wraps NetInfo.
 */
export interface ConnectivityAdapter {
  isOnline(): boolean;
  onChange(callback: (online: boolean) => void): () => void;
}

/** Generates the id used as the server-side idempotency key. */
export interface IdGenerator {
  (): string;
}

// Entity names the backend's /api/sync/batch endpoint accepts.
const SERVER_ENTITY: Record<string, string> = {
  patient: 'patient',
  home_visit: 'home_visit',
  task: 'task',
  referral: 'referral',
  ncd: 'ncd_screening',
  maternal: 'maternal_record',
};

const MAX_RETRIES = 5;
const BATCH_SIZE = 50;

export class SyncQueueManager {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private isOnline: boolean;

  constructor(
    private storage: QueueStorageAdapter,
    private connectivity: ConnectivityAdapter,
    private generateId: IdGenerator
  ) {
    this.isOnline = connectivity.isOnline();

    connectivity.onChange((online) => {
      this.isOnline = online;
      this.notifyListeners();
      if (online) this.processQueue();
    });
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.getPendingCount().then((count) => {
      listener({ isOnline: this.isOnline, pendingCount: count, isSyncing: this.isSyncing });
    });
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners() {
    const count = await this.getPendingCount();
    for (const listener of this.listeners) {
      listener({ isOnline: this.isOnline, pendingCount: count, isSyncing: this.isSyncing });
    }
  }

  public async getPendingCount(): Promise<number> {
    try {
      return await this.storage.count();
    } catch {
      return 0;
    }
  }

  public async getQueue(): Promise<SyncOperation[]> {
    try {
      return await this.storage.getAll();
    } catch {
      return [];
    }
  }

  public async enqueue(
    entity: SyncOperation['entity'],
    entityId: string,
    action: SyncOperation['action'],
    data: unknown
  ): Promise<SyncOperation> {
    const operation: SyncOperation = {
      // This id is the server-side idempotency key: replaying it never creates
      // a duplicate record, so retries after a dropped connection are safe.
      id: this.generateId(),
      entity,
      entityId,
      action,
      data,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    await this.storage.put(operation);
    this.notifyListeners();

    if (this.isOnline) {
      this.processQueue();
    }

    return operation;
  }

  /**
   * Sends queued operations to POST /api/sync/batch.
   *
   * Successful operations are removed from the local queue. Failures are kept
   * with an incremented retry count until MAX_RETRIES, after which they are
   * marked failed and left for manual review rather than retried forever.
   */
  public async processQueue(): Promise<{ success: number; failed: number }> {
    // The connectivity adapter is read live; the cached flag can be stale if
    // an online/offline event was missed.
    if (this.isSyncing || !this.connectivity.isOnline()) return { success: 0, failed: 0 };
    this.isOnline = true;

    this.isSyncing = true;
    this.notifyListeners();

    let success = 0;
    let failed = 0;

    try {
      const queue = await this.storage.getAll();

      const pending = queue
        .filter((item) => item.status !== 'failed' || (item.retryCount ?? 0) < MAX_RETRIES)
        .slice(0, BATCH_SIZE);

      if (pending.length === 0) {
        return { success: 0, failed: 0 };
      }

      const operations = pending.map((item) => ({
        operationId: item.id,
        entity: SERVER_ENTITY[item.entity] ?? item.entity,
        action: item.action.toUpperCase() as 'CREATE' | 'UPDATE' | 'DELETE',
        payload: (item.data ?? {}) as Record<string, unknown>,
        clientTimestamp: item.timestamp,
      }));

      const { results } = await backendApi.syncBatch(operations);

      for (const result of results) {
        const item = pending.find((p) => p.id === result.operationId);
        if (!item) continue;

        if (result.success) {
          await this.storage.delete(item.id);
          success++;
        } else {
          failed++;
          item.retryCount = (item.retryCount ?? 0) + 1;
          item.status = item.retryCount >= MAX_RETRIES ? 'failed' : 'pending';
          item.error = result.error || 'Sync rejected by server';
          await this.storage.put(item);
        }
      }
    } catch (err) {
      // A transport failure leaves the queue intact so it retries later.
      failed = await this.getPendingCount();
      console.warn('Sync batch could not be delivered:', err);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return { success, failed };
  }

  /**
   * Syncs one queued operation by id.
   *
   * Used where the interface offers a per-record "Sync" action. On success the
   * operation leaves the queue, so the record shows as synced from then on.
   */
  public async syncOne(operationId: string): Promise<{ success: boolean; error?: string }> {
    // Read the live value: the cached flag can be stale if an online/offline
    // event was missed (which happens when toggling via devtools).
    if (!this.connectivity.isOnline()) {
      return { success: false, error: 'You are offline. This will sync automatically when you reconnect.' };
    }
    this.isOnline = true;

    const item = await this.storage.get(operationId);
    if (!item) {
      // Already synced and removed by an earlier run.
      return { success: true };
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const { results } = await backendApi.syncBatch([{
        operationId: item.id,
        entity: SERVER_ENTITY[item.entity] ?? item.entity,
        action: item.action.toUpperCase() as 'CREATE' | 'UPDATE' | 'DELETE',
        payload: (item.data ?? {}) as Record<string, unknown>,
        clientTimestamp: item.timestamp,
      }]);

      const result = results[0];

      if (result?.success) {
        await this.storage.delete(item.id);
        return { success: true };
      }

      item.retryCount = (item.retryCount ?? 0) + 1;
      item.status = item.retryCount >= MAX_RETRIES ? 'failed' : 'pending';
      item.error = result?.error || 'Sync rejected by server';
      await this.storage.put(item);

      return { success: false, error: item.error };
    } catch (err) {
      // Record why it failed so the card can show it, and leave it queued.
      const message =
        err instanceof ApiError && err.isUnauthenticated
          ? 'Your session expired. Sign in again, then sync.'
          : err instanceof Error
          ? err.message
          : 'Could not reach the server.';

      item.retryCount = (item.retryCount ?? 0) + 1;
      item.error = message;
      await this.storage.put(item).catch(() => undefined);

      return { success: false, error: message };
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  public async clearQueue(): Promise<void> {
    await this.storage.clear();
    this.notifyListeners();
  }
}
