import { DataService } from '@arogyasetu/shared/services/api';
import type { Patient } from '@arogyasetu/shared/types';
import { syncQueueManager } from '../offline/syncQueueManager';
import { patientsCache } from '../offline/rnStorageAdapter';

export { generateToken, mapPrescription } from '@arogyasetu/shared/services/api';

/**
 * Adds a local patient-roster cache on top of the shared data service. GET
 * requests have no sync queue to fall back on, so a worker who opens a screen
 * while already offline would otherwise see an empty patient list with no way
 * to select anyone — this mirrors the last successful fetch instead.
 */
class MobileDataService extends DataService {
  async getPatients(): Promise<Patient[]> {
    const fetched = await super.getPatients();
    if (fetched.length > 0) {
      // Deliberately not awaited: refreshing the mirror is housekeeping, and a
      // storage layer that is slow or unavailable must never hold up the list
      // the screen is waiting to render.
      void patientsCache
        .replaceAll(fetched as unknown as Array<{ id: string } & Record<string, unknown>>)
        .catch(() => undefined);
      return fetched;
    }
    // Empty could mean "really no patients" or "offline, request failed
    // silently" (getPatients swallows errors) — the cache is the only place
    // that can tell them apart, so prefer it whenever it has anything. Capped
    // so an unresponsive storage layer degrades to "no patients" rather than
    // leaving the screen loading forever.
    const cached = await Promise.race([
      patientsCache.getAll<Patient>().catch(() => [] as Patient[]),
      new Promise<Patient[]>((resolve) => setTimeout(() => resolve([]), 3000)),
    ]);
    return cached.length > 0 ? cached : fetched;
  }
}

/** The mobile instance of the shared data service, wired to the SQLite sync queue. */
export const dataService = new MobileDataService(syncQueueManager);
