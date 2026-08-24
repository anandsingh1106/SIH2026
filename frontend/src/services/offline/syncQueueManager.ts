import { getDB } from './indexedDbService';
import { SyncOperation } from '../../types';

type SyncListener = (status: { isOnline: boolean; pendingCount: number; isSyncing: boolean }) => void;

class SyncQueueManager {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private isOnline = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
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
      const db = await getDB();
      return await db.count('sync_queue');
    } catch {
      return 0;
    }
  }

  public async getQueue(): Promise<SyncOperation[]> {
    try {
      const db = await getDB();
      return await db.getAll('sync_queue');
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
      id: 'sync-op-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      entity,
      entityId,
      action,
      data,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    const db = await getDB();
    await db.put('sync_queue', operation);
    this.notifyListeners();

    // If online, attempt immediate sync
    if (this.isOnline) {
      setTimeout(() => this.processQueue(), 500);
    }

    return operation;
  }

  public async processQueue(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) return { success: 0, failed: 0 };
    this.isSyncing = true;
    this.notifyListeners();

    const db = await getDB();
    const queue = await db.getAll('sync_queue');
    let success = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        // Simulate network API request with small delay
        await new Promise((r) => setTimeout(r, 200));

        // Delete from queue upon successful sync
        await db.delete('sync_queue', item.id);
        success++;
      } catch (err: unknown) {
        failed++;
        item.retryCount = (item.retryCount || 0) + 1;
        item.status = 'failed';
        item.error = err instanceof Error ? err.message : 'Network failure';
        await db.put('sync_queue', item);
      }
    }

    this.isSyncing = false;
    this.notifyListeners();
    return { success, failed };
  }

  public async clearQueue(): Promise<void> {
    const db = await getDB();
    await db.clear('sync_queue');
    this.notifyListeners();
  }
}

export const syncQueueManager = new SyncQueueManager();
