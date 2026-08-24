import { getDB } from '../offline/indexedDbService';
import { syncQueueManager } from '../offline/syncQueueManager';
import {
  Patient,
  Referral,
  Prescription,
  Consultation,
  Task,
  HomeVisit,
  Facility,
  Medicine,
  Notification,
  Message,
  AuditLog,
  Bed,
  UserRole,
  ReferralStatus,
} from '../../types';
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
  INITIAL_BEDS,
} from '../../data/mockData';

type DataChangeListener = (event: { entity: string; action: string; data: unknown }) => void;

class DataService {
  private listeners: Set<DataChangeListener> = new Set();

  public subscribe(listener: DataChangeListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(entity: string, action: string, data: unknown) {
    for (const listener of this.listeners) {
      listener({ entity, action, data });
    }
  }

  // --- PATIENTS ---
  public async getPatients(): Promise<Patient[]> {
    try {
      const db = await getDB();
      const list = await db.getAll('patients');
      return list.length > 0 ? list : INITIAL_PATIENTS;
    } catch {
      return INITIAL_PATIENTS;
    }
  }

  public async getPatientById(id: string): Promise<Patient | undefined> {
    try {
      const db = await getDB();
      const p = await db.get('patients', id);
      return p || INITIAL_PATIENTS.find((item) => item.id === id);
    } catch {
      return INITIAL_PATIENTS.find((item) => item.id === id);
    }
  }

  public async savePatient(patient: Patient): Promise<Patient> {
    const db = await getDB();
    await db.put('patients', patient);
    await syncQueueManager.enqueue('patient', patient.id, 'create', patient);
    this.notify('patients', 'save', patient);
    await this.logAudit('CREATE_PATIENT', 'Patient', patient.id, `Patient ${patient.name} registered.`);
    return patient;
  }

  // --- REFERRALS ---
  public async getReferrals(): Promise<Referral[]> {
    try {
      const db = await getDB();
      const list = await db.getAll('referrals');
      return list.length > 0 ? list : INITIAL_REFERRALS;
    } catch {
      return INITIAL_REFERRALS;
    }
  }

  public async createReferral(referral: Referral): Promise<Referral> {
    const db = await getDB();
    await db.put('referrals', referral);
    await syncQueueManager.enqueue('referral', referral.id, 'create', referral);
    
    // Auto-create notification for doctors & specialists
    await this.addNotification({
      id: 'notif-ref-' + Date.now(),
      role: 'specialist',
      title: `New ${referral.priority.toUpperCase()} Referral: ${referral.patientName}`,
      message: `Referred for ${referral.specialty} to ${referral.targetFacilityName}.`,
      category: 'referral',
      priority: referral.priority,
      timestamp: 'Just now',
      isRead: false,
      link: '/specialist/referrals',
    });

    this.notify('referrals', 'create', referral);
    await this.logAudit('CREATE_REFERRAL', 'Referral', referral.id, `Referral ${referral.referralCode} created for ${referral.patientName}`);
    return referral;
  }

  public async updateReferralStatus(
    id: string,
    status: ReferralStatus,
    note?: string,
    updatedBy: string = 'Current User'
  ): Promise<Referral | undefined> {
    const db = await getDB();
    const referral = (await db.get('referrals', id)) as Referral | undefined;
    if (!referral) return undefined;

    referral.status = status;
    referral.updatedAt = new Date().toISOString();
    referral.history.push({
      status,
      timestamp: new Date().toISOString(),
      note,
      updatedBy,
    });

    await db.put('referrals', referral);
    await syncQueueManager.enqueue('referral', id, 'update', referral);
    this.notify('referrals', 'update', referral);
    await this.logAudit('UPDATE_REFERRAL_STATUS', 'Referral', id, `Referral status updated to ${status}`);
    return referral;
  }

  // --- PRESCRIPTIONS ---
  public async getPrescriptions(): Promise<Prescription[]> {
    try {
      const db = await getDB();
      const list = await db.getAll('prescriptions');
      return list.length > 0 ? list : INITIAL_PRESCRIPTIONS;
    } catch {
      return INITIAL_PRESCRIPTIONS;
    }
  }

  public async savePrescription(prescription: Prescription): Promise<Prescription> {
    const db = await getDB();
    await db.put('prescriptions', prescription);
    this.notify('prescriptions', 'save', prescription);

    // Also notify patient
    await this.addNotification({
      id: 'notif-rx-' + Date.now(),
      role: 'patient',
      userId: prescription.patientId,
      title: 'New E-Prescription Issued',
      message: `Prescribed by ${prescription.doctorName} at ${prescription.facilityName}. Click to listen in Marathi/Hindi.`,
      category: 'medicine',
      priority: 'high',
      timestamp: 'Just now',
      isRead: false,
      link: '/patient/prescriptions',
    });

    await this.logAudit('ISSUE_PRESCRIPTION', 'Prescription', prescription.id, `Prescription issued for patient ${prescription.patientName}`);
    return prescription;
  }

  // --- TASKS (ASHA) ---
  public async getTasks(): Promise<Task[]> {
    try {
      const db = await getDB();
      const list = await db.getAll('tasks');
      return list.length > 0 ? list : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  }

  public async updateTaskStatus(id: string, status: Task['status']): Promise<void> {
    const db = await getDB();
    const task = (await db.get('tasks', id)) as Task | undefined;
    if (task) {
      task.status = status;
      await db.put('tasks', task);
      await syncQueueManager.enqueue('task', id, 'update', task);
      this.notify('tasks', 'update', task);
    }
  }

  public async saveTask(task: Task): Promise<Task> {
    const db = await getDB();
    await db.put('tasks', task);
    await syncQueueManager.enqueue('task', task.id, 'create', task);
    this.notify('tasks', 'create', task);
    return task;
  }

  // --- HOME VISITS ---
  public async recordHomeVisit(visit: HomeVisit): Promise<HomeVisit> {
    const db = await getDB();
    await db.put('home_visits', visit);
    await syncQueueManager.enqueue('home_visit', visit.id, 'create', visit);
    this.notify('home_visits', 'create', visit);
    await this.logAudit('RECORD_HOME_VISIT', 'HomeVisit', visit.id, `Home visit recorded for ${visit.patientName}`);
    return visit;
  }

  // --- FACILITIES ---
  public async getFacilities(): Promise<Facility[]> {
    try {
      const db = await getDB();
      const list = await db.getAll('facilities');
      return list.length > 0 ? list : INITIAL_FACILITIES;
    } catch {
      return INITIAL_FACILITIES;
    }
  }

  public async getBeds(): Promise<Bed[]> {
    try {
      const db = await getDB();
      const list = await db.getAll('beds') as Bed[];
      return list.length > 0 ? list : INITIAL_BEDS;
    } catch { return INITIAL_BEDS; }
  }

  public async updateBedStatus(id: string, status: 'available' | 'occupied' | 'reserved', patientName?: string): Promise<void> {
    const beds = await this.getBeds();
    const bed = beds.find((item) => item.id === id);
    if (!bed) return;
    bed.status = status;
    bed.isOccupied = status !== 'available';
    bed.patientName = patientName;
    try { const db = await getDB(); await db.put('beds', bed); } catch { /* mock fallback */ }
    this.notify('beds', 'update', bed);
  }

  // --- MEDICINES / INVENTORY ---
  public async getMedicines(): Promise<Medicine[]> {
    try {
      const db = await getDB();
      const list = await db.getAll('medicines');
      return list.length > 0 ? list : INITIAL_MEDICINES;
    } catch {
      return INITIAL_MEDICINES;
    }
  }

  public async updateMedicineStock(id: string, newStock: number): Promise<void> {
    const db = await getDB();
    const med = (await db.get('medicines', id)) as Medicine | undefined;
    if (med) {
      med.stock = newStock;
      await db.put('medicines', med);
      this.notify('medicines', 'update', med);
    }
  }

  // --- NOTIFICATIONS ---
  public async getNotifications(role?: UserRole): Promise<Notification[]> {
    try {
      const db = await getDB();
      const list = (await db.getAll('notifications')) as Notification[];
      const source = list.length > 0 ? list : INITIAL_NOTIFICATIONS;
      if (!role) return source;
      return source.filter((n) => !n.role || n.role === role);
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  }

  public async addNotification(notif: Notification): Promise<void> {
    const db = await getDB();
    await db.put('notifications', notif);
    this.notify('notifications', 'create', notif);
  }

  public async markNotificationRead(id: string): Promise<void> {
    const db = await getDB();
    const n = (await db.get('notifications', id)) as Notification | undefined;
    if (n) {
      n.isRead = true;
      await db.put('notifications', n);
      this.notify('notifications', 'update', n);
    }
  }

  public async markAllNotificationsRead(): Promise<void> {
    const db = await getDB();
    const list = (await db.getAll('notifications')) as Notification[];
    const tx = db.transaction('notifications', 'readwrite');
    for (const n of list) {
      n.isRead = true;
      await tx.objectStore('notifications').put(n);
    }
    await tx.done;
    this.notify('notifications', 'update_all', null);
  }

  // --- MESSAGES ---
  public async getMessages(conversationId?: string): Promise<Message[]> {
    try {
      const db = await getDB();
      const list = (await db.getAll('messages')) as Message[];
      const source = list.length > 0 ? list : INITIAL_MESSAGES;
      if (!conversationId) return source;
      return source.filter((m) => m.conversationId === conversationId);
    } catch {
      return INITIAL_MESSAGES;
    }
  }

  public async sendMessage(msg: Message): Promise<Message> {
    const db = await getDB();
    await db.put('messages', msg);
    this.notify('messages', 'create', msg);
    return msg;
  }

  // --- AUDIT LOGS ---
  public async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const db = await getDB();
      const list = await db.getAll('audit_logs');
      return list.length > 0 ? list : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  public async logAudit(
    action: string,
    resource: string,
    resourceId?: string,
    details: string = '',
    status: AuditLog['status'] = 'success'
  ): Promise<void> {
    const log: AuditLog = {
      id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: 'current-session-user',
      userName: 'Authenticated User',
      userRole: 'doctor',
      action,
      resource,
      resourceId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status,
      ipAddress: '10.24.112.45',
      details,
    };
    try {
      const db = await getDB();
      await db.put('audit_logs', log);
      this.notify('audit_logs', 'create', log);
    } catch (e) {
      console.warn('Could not write audit log to IndexedDB:', e);
    }
  }
}

export const dataService = new DataService();
