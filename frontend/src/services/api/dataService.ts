import { DataService } from '@arogyasetu/shared/services/api';
import { syncQueueManager } from '../offline/syncQueueManager';

export { generateToken, mapPrescription } from '@arogyasetu/shared/services/api';

/**
 * The web instance of the shared data service, wired to the browser's sync
 * queue. Mobile constructs its own instance with its own queue instance
 * instead (see mobile/src/services/api).
 */
export const dataService = new DataService(syncQueueManager);
