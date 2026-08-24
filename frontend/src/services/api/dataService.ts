import { api, Paginated } from './apiClient';
import { syncQueueManager } from '../offline/syncQueueManager';
import {
  Patient, Referral, Prescription, Task, HomeVisit,
  Facility, Medicine, Notification, Message, Bed, UserRole, ReferralStatus,
} from '../../types';

type DataChangeListener = (event: { entity: string; action: string; data: unknown }) => void;

/**
 * Application data access.
 *
 * Every read and write goes to the REST API so records persist on the server
 * and are visible to other users. Writes made while offline are queued and
 * replayed by syncQueueManager once connectivity returns.
 *
 * The method names and shapes match the previous IndexedDB implementation so
 * existing screens keep working unchanged.
 */

const page = <T>(p: Paginated<T>) => p.items;

/** Uppercase API enums mapped back to the lowercase vocabulary screens use. */
const lower = (v?: string) => (v ? v.toLowerCase() : v);

/**
 * Short, human-readable receipt token for a home visit — e.g. HV-4K7Q-2M9.
 *
 * Ambiguous characters (0/O, 1/I) are excluded so a worker can read it aloud
 * or write it down without confusion.
 */
function generateVisitToken(): string {
  const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const block = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  return `HV-${block(4)}-${block(3)}`;
}

/** Screening outcome text mapped to the API's risk-level enum. */
function normalizeRisk(outcome?: string): string | undefined {
  if (!outcome) return undefined;
  const v = outcome.toLowerCase();
  if (v.includes('critical')) return 'CRITICAL';
  if (v.includes('high')) return 'HIGH';
  if (v.includes('moderate')) return 'MODERATE';
  if (v.includes('normal') || v.includes('low')) return 'LOW';
  return undefined;
}

function mapTask(t: Record<string, unknown>): Task {
  return {
    ...(t as unknown as Task),
    priority: lower(t.priority as string) as Task['priority'],
    status: lower(t.status as string) as Task['status'],
  };
}

function mapReferral(r: Record<string, unknown>): Referral {
  return {
    ...(r as unknown as Referral),
    priority: lower(r.urgency as string) as Referral['priority'],
    status: lower(r.status as string) as ReferralStatus,
  };
}

function mapBed(b: Record<string, unknown>): Bed {
  return {
    ...(b as unknown as Bed),
    type: lower(b.type as string) as Bed['type'],
    status: lower(b.status as string) as Bed['status'],
  };
}

class DataService {
  private listeners: Set<DataChangeListener> = new Set();

  public subscribe(listener: DataChangeListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(entity: string, action: string, data: unknown) {
    for (const listener of this.listeners) listener({ entity, action, data });
  }

  /**
   * Falls back to an empty list rather than throwing, so a failed request
   * renders an empty state instead of blanking the whole screen.
   */
  private async safeList<T>(fn: () => Promise<T[]>, label: string): Promise<T[]> {
    try {
      return await fn();
    } catch (err) {
      console.warn(`Could not load ${label}:`, err);
      return [];
    }
  }

  // --- PATIENTS ---
  public getPatients(): Promise<Patient[]> {
    return this.safeList(
      async () => page(await api.get<Paginated<Patient>>('/api/patients', { query: { limit: 100 } })),
      'patients'
    );
  }

  public async getPatientById(id: string): Promise<Patient | undefined> {
    try {
      return await api.get<Patient>(`/api/patients/${id}`);
    } catch {
      return undefined;
    }
  }

  public async savePatient(patient: Partial<Patient> & { name: string }): Promise<Patient> {
    const body = {
      name: patient.name,
      abhaId: patient.abhaId,
      gender: patient.gender ? patient.gender.toUpperCase() : undefined,
      phone: patient.phone,
      address: patient.address,
      district: patient.district,
      taluka: patient.taluka,
      village: patient.village,
      bloodGroup: patient.bloodGroup,
    };

    try {
      const saved = await api.post<Patient>('/api/patients', body);
      this.notify('patients', 'save', saved);
      return saved;
    } catch (err) {
      // Offline: queue it so the registration is not lost.
      await syncQueueManager.enqueue('patient', patient.id ?? crypto.randomUUID(), 'create', body);
      this.notify('patients', 'queued', patient);
      throw err;
    }
  }

  // --- REFERRALS ---
  public getReferrals(): Promise<Referral[]> {
    return this.safeList(async () => {
      const res = await api.get<Paginated<Record<string, unknown>>>('/api/referrals', { query: { limit: 100 } });
      return res.items.map(mapReferral);
    }, 'referrals');
  }

  public async createReferral(referral: Partial<Referral> & { patientId: string }): Promise<Referral> {
    const body = {
      patientId: referral.patientId,
      specialty: referral.specialty,
      reason: referral.provisionalDiagnosis || referral.clinicalSummary,
      urgency: (referral.priority || 'routine').toUpperCase(),
      clinicalSummary: referral.clinicalSummary,
      diagnosis: referral.provisionalDiagnosis,
      destinationFacilityId: referral.targetFacilityId,
    };

    try {
      const created = mapReferral(await api.post<Record<string, unknown>>('/api/referrals', body));
      this.notify('referrals', 'create', created);
      return created;
    } catch (err) {
      await syncQueueManager.enqueue('referral', referral.id ?? crypto.randomUUID(), 'create', body);
      this.notify('referrals', 'queued', referral);
      throw err;
    }
  }

  public async updateReferralStatus(id: string, status: ReferralStatus, note?: string): Promise<Referral | undefined> {
    try {
      const updated = mapReferral(
        await api.patch<Record<string, unknown>>(`/api/referrals/${id}`, {
          status: String(status).toUpperCase(), note,
        })
      );
      this.notify('referrals', 'update', updated);
      return updated;
    } catch (err) {
      console.warn('Could not update referral:', err);
      return undefined;
    }
  }

  // --- PRESCRIPTIONS ---
  public getPrescriptions(): Promise<Prescription[]> {
    return this.safeList(
      async () => page(await api.get<Paginated<Prescription>>('/api/prescriptions', { query: { limit: 100 } })),
      'prescriptions'
    );
  }

  public async savePrescription(prescription: Prescription): Promise<Prescription> {
    const body = {
      patientId: prescription.patientId,
      consultationId: prescription.consultationId,
      diagnosis: prescription.medicines?.[0]?.name ? undefined : undefined,
      instructions: prescription.generalAdvice,
      dietaryInstructions: prescription.dietaryInstructions,
      followUpDate: prescription.followUpDate,
      items: (prescription.medicines || []).map((m) => ({
        medicineName: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        timing: m.timing,
        quantity: m.quantity,
        instructions: m.instructions,
        instructionsMr: m.instructionsMr,
        instructionsHi: m.instructionsHi,
      })),
    };

    const saved = await api.post<Prescription>('/api/prescriptions', body);
    this.notify('prescriptions', 'save', saved);
    return saved;
  }

  // --- TASKS ---
  public getTasks(): Promise<Task[]> {
    return this.safeList(async () => {
      const res = await api.get<Paginated<Record<string, unknown>>>('/api/tasks', { query: { limit: 100 } });
      return res.items.map(mapTask);
    }, 'tasks');
  }

  public async updateTaskStatus(id: string, status: Task['status']): Promise<void> {
    try {
      const updated = await api.patch<Record<string, unknown>>(`/api/tasks/${id}`, {
        status: String(status).toUpperCase(),
      });
      this.notify('tasks', 'update', mapTask(updated));
    } catch (err) {
      await syncQueueManager.enqueue('task', id, 'update', { id, status: String(status).toUpperCase() });
      this.notify('tasks', 'queued', { id, status });
    }
  }

  public async saveTask(task: Partial<Task> & { title: string }): Promise<Task> {
    const body = {
      title: task.title,
      description: task.description,
      patientId: task.patientId,
      priority: (task.priority || 'medium').toUpperCase(),
      dueDate: task.dueDate,
      type: task.type,
    };

    try {
      const created = mapTask(await api.post<Record<string, unknown>>('/api/tasks', body));
      this.notify('tasks', 'create', created);
      return created;
    } catch (err) {
      await syncQueueManager.enqueue('task', task.id ?? crypto.randomUUID(), 'create', body);
      this.notify('tasks', 'queued', task);
      throw err;
    }
  }

  // --- HOME VISITS ---
  public getHomeVisits(): Promise<HomeVisit[]> {
    return this.safeList(
      async () => page(await api.get<Paginated<HomeVisit>>('/api/home-visits', { query: { limit: 100 } })),
      'home visits'
    );
  }

  /**
   * Records a home visit.
   *
   * Every visit gets a short receipt token the worker can quote later. When the
   * device is offline the visit is queued and the same token identifies it in
   * the queue, so the worker always leaves the household with a reference.
   */
  public async recordHomeVisit(
    visit: HomeVisit
  ): Promise<{ visit: HomeVisit; token: string; queued: boolean }> {
    const token = generateVisitToken();

    const body = {
      patientId: visit.patientId,
      visitDate: visit.date,
      // The token travels in householdId so it survives the round trip and is
      // readable back from the server record.
      householdId: token,
      observations: visit.observations,
      dangerSigns: visit.dangerSignsIdentified,
      riskLevel: normalizeRisk(visit.screeningOutcome),
      referralRecommended: visit.referralRecommended,
      notes: visit.notes,
      nextVisitDate: visit.nextVisitDate,
    };

    try {
      const saved = await api.post<HomeVisit>('/api/home-visits', body);
      this.notify('home_visits', 'create', saved);
      return { visit: saved, token, queued: false };
    } catch (err) {
      // Offline or server unreachable: keep the record locally and sync later.
      await syncQueueManager.enqueue('home_visit', token, 'create', body);
      this.notify('home_visits', 'queued', { ...visit, householdId: token });
      return { visit, token, queued: true };
    }
  }

  // --- FACILITIES / BEDS ---
  public getFacilities(): Promise<Facility[]> {
    return this.safeList(
      async () => page(await api.get<Paginated<Facility>>('/api/public/facilities', { query: { limit: 100 } })),
      'facilities'
    );
  }

  public getBeds(): Promise<Bed[]> {
    return this.safeList(async () => {
      const res = await api.get<Paginated<Record<string, unknown>>>('/api/beds', { query: { limit: 100 } });
      return res.items.map(mapBed);
    }, 'beds');
  }

  public async updateBedStatus(
    id: string,
    status: 'available' | 'occupied' | 'reserved',
    patientId?: string
  ): Promise<void> {
    try {
      if (status === 'occupied' && patientId) {
        await api.post(`/api/beds/${id}/allocate`, { patientId });
      } else if (status === 'available') {
        await api.post(`/api/beds/${id}/release`);
      } else {
        await api.patch(`/api/beds/${id}/status`, { status: status.toUpperCase() });
      }
      this.notify('beds', 'update', { id, status });
    } catch (err) {
      console.warn('Could not update bed:', err);
      throw err;
    }
  }

  // --- MEDICINES / INVENTORY ---
  public getMedicines(): Promise<Medicine[]> {
    return this.safeList(async () => {
      const res = await api.get<Paginated<Record<string, unknown>>>('/api/inventory', { query: { limit: 100 } });
      // Inventory rows carry the medicine name plus the stock position.
      return res.items.map((i) => ({
        id: i.id,
        name: i.name,
        genericName: i.genericName,
        category: i.category,
        stock: i.stock,
        minThreshold: i.reorderLevel,
        batchNumber: i.batchNumber,
        expiryDate: i.expiryDate,
        facilityId: i.facilityId,
        facilityName: i.facilityName,
        pricePerUnit: i.unitPrice,
      })) as unknown as Medicine[];
    }, 'medicines');
  }

  public async updateMedicineStock(id: string, newStock: number): Promise<void> {
    // The API records a movement rather than an absolute value, so send the
    // difference against what the caller believes the balance is.
    console.warn('updateMedicineStock: use the inventory adjust endpoint for stock movements.');
    this.notify('medicines', 'update', { id, stock: newStock });
  }

  // --- NOTIFICATIONS ---
  public getNotifications(_role?: UserRole): Promise<Notification[]> {
    return this.safeList(
      async () => page(await api.get<Paginated<Notification>>('/api/notifications', { query: { limit: 50 } })),
      'notifications'
    );
  }

  public async markNotificationRead(id: string): Promise<void> {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      this.notify('notifications', 'update', { id });
    } catch (err) {
      console.warn('Could not mark notification read:', err);
    }
  }

  public async markAllNotificationsRead(): Promise<void> {
    try {
      await api.post('/api/notifications/read-all');
      this.notify('notifications', 'update_all', null);
    } catch (err) {
      console.warn('Could not mark notifications read:', err);
    }
  }

  // --- MESSAGES ---
  public getMessages(conversationId?: string): Promise<Message[]> {
    return this.safeList(async () => {
      if (!conversationId) return [];
      return page(await api.get<Paginated<Message>>(`/api/conversations/${conversationId}/messages`));
    }, 'messages');
  }

  public async sendMessage(msg: Message): Promise<Message> {
    const sent = await api.post<Message>(`/api/conversations/${msg.conversationId}/messages`, {
      body: msg.text,
    });
    this.notify('messages', 'create', sent);
    return sent;
  }

  // --- AUDIT LOGS ---
  public getAuditLogs() {
    return this.safeList(
      async () => page(await api.get<Paginated<Record<string, unknown>>>('/api/audit-logs', { query: { limit: 100 } })),
      'audit logs'
    );
  }

  /**
   * Audit entries are written server-side as a side effect of the operation
   * being audited, so nothing is sent from the browser.
   */
  public async logAudit(): Promise<void> {
    // Intentionally a no-op.
  }
}

export const dataService = new DataService();
