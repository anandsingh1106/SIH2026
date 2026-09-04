import { DataService } from '@arogyasetu/shared/services/api';
import { syncQueueManager } from '../offline/syncQueueManager';

export { generateToken, mapPrescription } from '@arogyasetu/shared/services/api';

/** The mobile instance of the shared data service, wired to the SQLite sync queue. */
export const dataService = new DataService(syncQueueManager);
