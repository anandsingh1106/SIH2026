import { openDB, IDBPDatabase } from 'idb';
import {
  INITIAL_PATIENTS,
  INITIAL_REFERRALS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_TASKS,
  INITIAL_FACILITIES,
  INITIAL_MEDICINES,
  INITIAL_NOTIFICATIONS,
  INITIAL_MESSAGES,
  INITIAL_AUDIT_LOGS,
} from '../../data/mockData';

const DB_NAME = 'mahaarogya_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDB = async (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('patients')) {
          db.createObjectStore('patients', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('referrals')) {
          db.createObjectStore('referrals', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('prescriptions')) {
          db.createObjectStore('prescriptions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('home_visits')) {
          db.createObjectStore('home_visits', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('facilities')) {
          db.createObjectStore('facilities', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('medicines')) {
          db.createObjectStore('medicines', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('audit_logs')) {
          db.createObjectStore('audit_logs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// Seed initial mock data if empty
export const seedInitialDatabase = async () => {
  try {
    const db = await getDB();
    const count = await db.count('patients');
    if (count === 0) {
      console.log('Seeding initial Maharashtra healthcare offline data...');
      const tx = db.transaction(
        ['patients', 'referrals', 'prescriptions', 'tasks', 'facilities', 'medicines', 'notifications', 'messages', 'audit_logs'],
        'readwrite'
      );
      
      await Promise.all([
        ...INITIAL_PATIENTS.map((p) => tx.objectStore('patients').put(p)),
        ...INITIAL_REFERRALS.map((r) => tx.objectStore('referrals').put(r)),
        ...INITIAL_PRESCRIPTIONS.map((pr) => tx.objectStore('prescriptions').put(pr)),
        ...INITIAL_TASKS.map((t) => tx.objectStore('tasks').put(t)),
        ...INITIAL_FACILITIES.map((f) => tx.objectStore('facilities').put(f)),
        ...INITIAL_MEDICINES.map((m) => tx.objectStore('medicines').put(m)),
        ...INITIAL_NOTIFICATIONS.map((n) => tx.objectStore('notifications').put(n)),
        ...INITIAL_MESSAGES.map((msg) => tx.objectStore('messages').put(msg)),
        ...INITIAL_AUDIT_LOGS.map((a) => tx.objectStore('audit_logs').put(a)),
      ]);

      await tx.done;
      console.log('IndexedDB seed complete.');
    }
  } catch (err) {
    console.error('Failed to seed IndexedDB, continuing in memory:', err);
  }
};
