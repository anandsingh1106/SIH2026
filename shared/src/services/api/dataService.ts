import { api, Paginated } from './apiClient';
import { SyncQueueManager } from '../offline/syncQueueManager';
import {
  Patient, Referral, Prescription, PrescribedMedicine, Task, HomeVisit, Vitals,
  Facility, Medicine, MedicineAvailability, MedicineOrder,
  Notification, Message, Bed, UserRole, ReferralStatus, QueueToken, QueueSummary,
  PatientTimelineEvent, Vaccination, AuditLog, NcdScreening, LabOrder, Appointment,
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

/**
 * Unwraps a paginated response, converting rows to camelCase on the way out so
 * no caller has to remember which endpoints return raw database columns.
 */
const page = <T>(p: Paginated<T>): T[] => camelize<T[]>(p.items ?? []);

/** Uppercase API enums mapped back to the lowercase vocabulary screens use. */
const lower = (v?: string) => (v ? v.toLowerCase() : v);

/**
 * Rewrites snake_case keys to camelCase, recursively.
 *
 * The API hands back raw database rows, while every screen reads camelCase.
 * Without this the mismatch surfaces as `undefined` on whichever field a page
 * happens to render first -- reliably a crash on `.split()` or `.toUpperCase()`.
 * Existing camelCase keys are preserved, so a row that is already mapped passes
 * through unchanged.
 */
function camelize<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => camelize(v)) as unknown as T;
  if (value === null || typeof value !== 'object') return value as T;
  // Dates and other class instances must not be rebuilt as plain objects.
  // A null prototype still denotes a plain record, so it is converted too.
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value as T;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const camel = key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    out[camel] = camelize(val);
    // Keep the original key too; some screens still read the raw column name.
    if (camel !== key && !(key in out)) out[key] = out[camel];
  }
  return out as T;
}

/** Whole years between a date of birth and today; undefined for a bad date. */
function ageFromDob(dob?: string): number | undefined {
  if (!dob) return undefined;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return undefined;

  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 ? age : undefined;
}

/**
 * Maps a patient row from the API onto the shape the screens expect.
 *
 * The API returns raw database rows in snake_case, and stores a date of birth
 * rather than an age. Screens read camelCase and render `age` and
 * `riskCategory` unguarded, so every field they touch is filled in here --
 * without this, `riskCategory` alone is enough to crash the patient registry.
 */
function normalizePatient(row: Record<string, unknown>): Patient {
  const pick = <T = string>(...keys: string[]): T | undefined => {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null) return value as T;
    }
    return undefined;
  };

  const dob = pick('dateOfBirth', 'date_of_birth');

  return {
    ...(row as unknown as Patient),
    id: pick('id') ?? '',
    abhaId: pick('abhaId', 'abha_id') ?? '',
    name: pick('name') ?? 'Unknown patient',
    age: pick<number>('age') ?? ageFromDob(dob) ?? 0,
    gender: (lower(pick('gender')) as Patient['gender']) ?? 'other',
    phone: pick('phone') ?? '',
    address: pick('address') ?? '',
    village: pick('village') ?? '',
    taluka: pick('taluka') ?? '',
    district: pick('district') ?? '',
    pincode: pick('pincode') ?? '',
    bloodGroup: pick('bloodGroup', 'blood_group') ?? '',
    allergies: pick<string[]>('allergies') ?? [],
    chronicConditions: pick<string[]>('chronicConditions', 'chronic_conditions') ?? [],
    emergencyContact: {
      name: pick('emergencyContact', 'emergency_contact') ?? '',
      relationship: pick('emergencyContactRelation', 'emergency_contact_relation') ?? '',
      phone: pick('emergencyContactPhone', 'emergency_contact_phone') ?? '',
    },
    // Not a column on the patients table; screens still render it unguarded.
    riskCategory: (lower(pick('riskCategory', 'risk_category')) as Patient['riskCategory']) ?? 'normal',
    assignedAshaId: pick('assignedAshaId', 'assigned_asha_id'),
    registeredDate: pick('registeredDate', 'created_at') ?? '',
  };
}

/**
 * Short, human-readable receipt token — e.g. HV-4K7Q-2M9.
 *
 * Ambiguous characters (0/O, 1/I) are excluded so a worker can read it aloud
 * or write it down without confusion.
 */
export function generateToken(prefix: string): string {
  const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const block = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  return `${prefix}-${block(4)}-${block(3)}`;
}

function generateVisitToken(): string {
  return generateToken('HV');
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

/**
 * Maps a prescription row onto the shape the screens render.
 *
 * The API keeps medicines in a separate `items` collection, while screens read
 * `medicines` and iterate it unguarded -- so the list must always carry an
 * array, even when a prescription has no items recorded.
 */
export function mapPrescription(row: Record<string, unknown>): Prescription {
  const c = camelize<Record<string, unknown>>(row);
  const str = (...keys: string[]) => {
    for (const k of keys) if (typeof c[k] === 'string' && c[k]) return c[k] as string;
    return '';
  };

  const rawItems = Array.isArray(c.items)
    ? (c.items as Record<string, unknown>[])
    : Array.isArray(c.medicines)
      ? (c.medicines as Record<string, unknown>[])
      : [];

  const medicines: PrescribedMedicine[] = rawItems.map((item) => {
    // `timing` is stored as a JSON string; screens expect a real array.
    let timing: PrescribedMedicine['timing'] = [];
    const rawTiming = item.timing;
    if (Array.isArray(rawTiming)) {
      timing = rawTiming as PrescribedMedicine['timing'];
    } else if (typeof rawTiming === 'string' && rawTiming) {
      try {
        const parsed = JSON.parse(rawTiming);
        if (Array.isArray(parsed)) timing = parsed;
      } catch {
        timing = [];
      }
    }

    return {
      name: (item.medicineName as string) ?? (item.name as string) ?? 'Medicine',
      genericName: (item.genericName as string) ?? '',
      dosage: (item.dosage as string) ?? '',
      frequency: (item.frequency as string) ?? '',
      duration: (item.duration as string) ?? '',
      instructions: (item.instructions as string) ?? '',
      instructionsMr: (item.instructionsMr as string) ?? '',
      instructionsHi: (item.instructionsHi as string) ?? '',
      timing,
      takeWith: (item.takeWith as PrescribedMedicine['takeWith']) ?? 'after_food',
      quantity: (item.quantity as number) ?? 0,
    };
  });

  return {
    ...(c as unknown as Prescription),
    medicines,
    patientName: str('patientName'),
    doctorName: str('doctorName'),
    facilityName: str('facilityName'),
    generalAdvice: str('generalAdvice', 'instructions'),
    dietaryInstructions: str('dietaryInstructions'),
    date: str('date', 'issuedAt', 'createdAt').slice(0, 10),
    warnings: Array.isArray(c.warnings) ? (c.warnings as string[]) : [],
  };
}

function mapReferral(r: Record<string, unknown>): Referral {
  const c = camelize<Record<string, unknown>>(r);
  const str = (...keys: string[]) => {
    for (const k of keys) if (typeof c[k] === 'string' && c[k]) return c[k] as string;
    return '';
  };

  return {
    ...(c as unknown as Referral),
    priority: (lower(c.urgency as string) ?? 'low') as Referral['priority'],
    status: (lower(c.status as string) ?? 'pending') as ReferralStatus,
    // The API names facilities by source/destination; screens say referring/target.
    referringFacilityName: str('referringFacilityName', 'sourceFacilityName'),
    referringFacilityId: str('referringFacilityId', 'sourceFacilityId'),
    targetFacilityName: str('targetFacilityName', 'destinationFacilityName'),
    targetFacilityId: str('targetFacilityId', 'destinationFacilityId'),
    referringDoctorName: str('referringDoctorName', 'referredByName'),
    assignedSpecialistName: str('assignedSpecialistName', 'referredToName'),
    patientName: str('patientName'),
    patientGender: str('patientGender'),
    patientAge: (c.patientAge as number) ?? ageFromDob(c.patientDob as string) ?? 0,
    clinicalSummary: str('clinicalSummary'),
    provisionalDiagnosis: str('provisionalDiagnosis', 'diagnosis'),
    referralCode: str('referralCode'),
    specialty: str('specialty'),
    history: (c.history as Referral['history']) ?? [],
  };
}

/**
 * Normalises a public facility record into the shape the UI renders.
 *
 * The `/api/public/facilities` payload is deliberately lean -- it carries
 * identity, location and contact details, but none of the bed counts, service
 * lists or capability flags the directory displays. Casting the response
 * straight to `Facility` type-checked but produced objects whose array fields
 * were `undefined`, so the first `.services.some(...)` threw and took the whole
 * page down. Every optional field is given a safe default here instead.
 */
function mapFacility(f: Record<string, unknown>): Facility {
  const num = (key: string): number => {
    const v = f[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  };
  const str = (key: string): string => {
    const v = f[key];
    return typeof v === 'string' ? v : '';
  };
  const bool = (key: string): boolean => f[key] === true;

  // The API sends SCREAMING_SNAKE type codes; the UI labels are title-cased.
  const TYPE_LABELS: Record<string, Facility['type']> = {
    PHC: 'PHC',
    CHC: 'CHC',
    SUB_DISTRICT_HOSPITAL: 'Sub-District Hospital',
    DISTRICT_HOSPITAL: 'District Hospital',
    MEDICAL_COLLEGE: 'GMC',
    GMC: 'GMC',
    PRIVATE_EMPANELED: 'Private Empaneled',
  };
  const rawType = str('type').toUpperCase();

  return {
    id: str('id'),
    name: str('name'),
    nameMr: typeof f.nameMr === 'string' ? f.nameMr : undefined,
    type: TYPE_LABELS[rawType] ?? 'PHC',
    district: str('district'),
    taluka: str('taluka'),
    address: str('address') || [str('village'), str('taluka'), str('district')].filter(Boolean).join(', '),
    phone: str('phone'),
    totalBeds: num('totalBeds'),
    availableBeds: num('availableBeds'),
    icuBeds: num('icuBeds'),
    availableIcuBeds: num('availableIcuBeds'),
    ventilators: num('ventilators'),
    availableVentilators: num('availableVentilators'),
    // `emergencyAvailable` is the API's name for this flag.
    emergencyReady: bool('emergencyReady') || bool('emergencyAvailable'),
    bloodBankAvailable: bool('bloodBankAvailable'),
    oxygenAvailable: bool('oxygenAvailable'),
    services: Array.isArray(f.services) ? (f.services as string[]) : [],
    doctorsCount: num('doctorsCount'),
    distanceKm: typeof f.distanceKm === 'number' ? f.distanceKm : undefined,
    latitude: num('latitude'),
    longitude: num('longitude'),
  };
}

function mapBed(b: Record<string, unknown>): Bed {
  return {
    ...(b as unknown as Bed),
    type: lower(b.type as string) as Bed['type'],
    status: lower(b.status as string) as Bed['status'],
  };
}

export class DataService {
  private listeners: Set<DataChangeListener> = new Set();

  constructor(private syncQueueManager: SyncQueueManager) {}

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
  /**
   * Every patient the caller may see.
   *
   * The API caps a page at 100, so a single request silently truncated larger
   * registries -- the missing patients could not be opened at all, and a lookup
   * against this list would miss them. Follow the pages instead.
   */
  public getPatients(): Promise<Patient[]> {
    return this.safeList(async () => {
      const first = await api.get<Paginated<Record<string, unknown>>>('/api/patients', {
        query: { limit: 100, page: 1 },
      });
      const rows = page<Record<string, unknown>>(first);

      const totalPages = first.pagination?.totalPages ?? 1;
      // Guard against a bad total pinning the browser on an endless fetch.
      const lastPage = Math.min(totalPages, 20);
      if (lastPage > 1) {
        const rest = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) =>
            api.get<Paginated<Record<string, unknown>>>('/api/patients', {
              query: { limit: 100, page: i + 2 },
            })
          )
        );
        for (const res of rest) rows.push(...page<Record<string, unknown>>(res));
      }

      return rows.map(normalizePatient);
    }, 'patients');
  }

  public async getPatientById(id: string): Promise<Patient | undefined> {
    try {
      return normalizePatient(await api.get<Record<string, unknown>>(`/api/patients/${id}`));
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
      const saved = normalizePatient(await api.post<Record<string, unknown>>('/api/patients', body));
      this.notify('patients', 'save', saved);
      return saved;
    } catch (err) {
      // Offline: queue it so the registration is not lost.
      await this.syncQueueManager.enqueue('patient', patient.id ?? crypto.randomUUID(), 'create', body);
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
      await this.syncQueueManager.enqueue('referral', referral.id ?? crypto.randomUUID(), 'create', body);
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

  // --- OPD QUEUE ---
  /** Live OPD queue for a facility, ordered by token number. */
  public async getQueue(facilityId: string): Promise<{ items: QueueToken[]; summary: QueueSummary | null }> {
    try {
      const res = await api.get<Record<string, unknown>>(`/api/queue/${facilityId}`);
      const raw = camelize<Record<string, unknown>>(res);
      const items = Array.isArray(raw.items) ? (raw.items as QueueToken[]) : [];
      return { items, summary: (raw.summary as QueueSummary) ?? null };
    } catch (err) {
      console.warn('Could not load OPD queue:', err);
      return { items: [], summary: null };
    }
  }

  /**
   * Moves a token through the queue state machine. The server rejects illegal
   * transitions, so the caller surfaces the message rather than assuming success.
   */
  public async updateQueueToken(
    tokenId: string,
    action: 'call' | 'start' | 'complete' | 'skip'
  ): Promise<QueueToken> {
    const updated = camelize<QueueToken>(
      await api.post<Record<string, unknown>>(`/api/queue/${tokenId}/${action}`, {})
    );
    // Screens showing the queue refresh off this, so the desk stays in step.
    this.notify('queue', action, updated);
    return updated;
  }

  // --- PRESCRIPTIONS ---
  public getPrescriptions(): Promise<Prescription[]> {
    return this.safeList(async () => {
      const rows = page<Record<string, unknown>>(
        await api.get<Paginated<Record<string, unknown>>>('/api/prescriptions', {
          query: { limit: 100 },
        })
      );
      return rows.map(mapPrescription);
    }, 'prescriptions');
  }

  /** Records vitals against a patient, optionally tied to a consultation. */
  public async recordVitals(
    patientId: string,
    vitals: Partial<Record<string, number | undefined>> | Vitals,
    consultationId?: string
  ): Promise<void> {
    const source = vitals as Record<string, number | undefined>;
    // Map the UI's field names onto the API's, dropping anything unset.
    const body: Record<string, unknown> = { consultationId };
    const mapping: Record<string, string> = {
      bpSystolic: 'bloodPressureSystolic',
      bpDiastolic: 'bloodPressureDiastolic',
      pulse: 'heartRate',
      spo2: 'oxygenSaturation',
      temperature: 'temperature',
      weight: 'weight',
      height: 'height',
      bloodSugarRandom: 'bloodGlucose',
      hemoglobin: 'hemoglobin',
      respiratoryRate: 'respiratoryRate',
    };

    for (const [from, to] of Object.entries(mapping)) {
      let value = source[from];
      if (value === undefined || value === null) continue;

      // The vitals form captures temperature in Fahrenheit; the API expects
      // Celsius. Anything above 45 can only be Fahrenheit.
      if (from === 'temperature' && value > 45) {
        value = Number(((value - 32) * 5 / 9).toFixed(1));
      }

      body[to] = value;
    }

    await api.post(`/api/patients/${patientId}/vitals`, body);
    this.notify('vitals', 'create', { patientId });
  }

  // --- PATIENT TIMELINE ---
  /**
   * Longitudinal history for one patient, newest first.
   *
   * Consultations, prescriptions and lab orders each hold one slice of the
   * story, so the EHR timeline merges all three rather than showing whichever
   * happens to be loaded.
   */
  public async getPatientTimeline(patientId: string): Promise<PatientTimelineEvent[]> {
    if (!patientId) return [];

    const query = { patientId, limit: 50 };
    const [consultations, prescriptions, labs] = await Promise.all([
      this.safeList(
        async () => page<Record<string, unknown>>(
          await api.get<Paginated<Record<string, unknown>>>('/api/consultations', { query })
        ),
        'patient consultations'
      ),
      this.safeList(
        async () => page<Record<string, unknown>>(
          await api.get<Paginated<Record<string, unknown>>>('/api/prescriptions', { query })
        ),
        'patient prescriptions'
      ),
      this.safeList(
        async () => page<Record<string, unknown>>(
          await api.get<Paginated<Record<string, unknown>>>('/api/lab-orders', { query })
        ),
        'patient lab orders'
      ),
    ]);

    const events: PatientTimelineEvent[] = [];

    for (const row of consultations) {
      const c = camelize<Record<string, unknown>>(row);
      const symptoms = Array.isArray(c.symptoms) ? (c.symptoms as string[]).join(', ') : '';
      events.push({
        id: String(c.id),
        date: String(c.date ?? c.createdAt ?? ''),
        title: (c.diagnosis as string) || (c.chiefComplaint as string) || 'Clinical consultation',
        type: 'consultation',
        actor: (c.doctorName as string) || 'Attending doctor',
        notes: [c.chiefComplaint, symptoms, c.examination, c.treatmentPlan]
          .filter(Boolean).join(' • ') || 'Consultation recorded.',
      });
    }

    for (const row of prescriptions) {
      const rx = mapPrescription(row);
      const names = rx.medicines.map((m) => m.name).filter(Boolean);
      events.push({
        id: rx.id,
        date: rx.date,
        title: names.length ? `Prescription: ${names.join(', ')}` : 'Prescription issued',
        type: 'prescription',
        actor: rx.doctorName || 'Prescribing doctor',
        notes: rx.generalAdvice || `${names.length} medicine(s) prescribed.`,
      });
    }

    for (const row of labs) {
      const l = camelize<Record<string, unknown>>(row);
      events.push({
        id: String(l.id),
        date: String(l.orderedAt ?? ''),
        title: `Lab order: ${(l.testName as string) || 'Diagnostic test'}`,
        type: 'lab',
        actor: (l.facilityName as string) || (l.doctorName as string) || 'Laboratory',
        notes: [l.category, l.status && `Status: ${l.status}`, l.notes]
          .filter(Boolean).join(' • ') || 'Lab order raised.',
      });
    }

    // Undated rows would otherwise sort unpredictably; keep them last.
    return events.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  // --- CONSULTATIONS ---
  public getConsultations(): Promise<Record<string, unknown>[]> {
    return this.safeList(
      async () => page(await api.get<Paginated<Record<string, unknown>>>('/api/consultations', { query: { limit: 100 } })),
      'consultations'
    );
  }

  /**
   * Records a consultation and returns it, including the server-assigned id.
   *
   * A prescription must reference a real consultation row, so callers create
   * the consultation first and pass its id through.
   */
  public async saveConsultation(input: {
    patientId: string;
    chiefComplaint?: string;
    symptoms?: string[];
    examination?: string;
    diagnosis?: string;
    icdCode?: string;
    clinicalNotes?: string;
    treatmentPlan?: string;
    followUpDate?: string;
  }): Promise<{ id: string }> {
    const created = await api.post<{ id: string }>('/api/consultations', input);
    this.notify('consultations', 'create', created);
    return created;
  }

  public async savePrescription(prescription: Prescription): Promise<Prescription> {
    const body = {
      patientId: prescription.patientId,
      // Only send a consultation id that the server actually knows about;
      // a fabricated one fails the foreign key.
      consultationId: prescription.consultationId?.startsWith('con-')
        ? undefined
        : prescription.consultationId,
      diagnosis: (prescription as { diagnosis?: string }).diagnosis,
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

    const saved = mapPrescription(
      await api.post<Record<string, unknown>>('/api/prescriptions', body)
    );
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
      await this.syncQueueManager.enqueue('task', id, 'update', { id, status: String(status).toUpperCase() });
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
      await this.syncQueueManager.enqueue('task', task.id ?? crypto.randomUUID(), 'create', body);
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
      // patientName is carried alongside so the queued entry is readable in the
      // visit log; the server ignores the extra field.
      await this.syncQueueManager.enqueue('home_visit', token, 'create', {
        ...body,
        patientName: visit.patientName,
      });
      this.notify('home_visits', 'queued', { ...visit, householdId: token });
      return { visit, token, queued: true };
    }
  }

  // --- FACILITIES / BEDS ---
  public getFacilities(): Promise<Facility[]> {
    return this.safeList(
      async () => {
        const res = await api.get<Paginated<Record<string, unknown>>>('/api/public/facilities', {
          query: { limit: 100 },
        });
        return page(res).map(mapFacility);
      },
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

  /**
   * Raises a critical alert about a patient to their ASHA and the patient.
   * Resolves with the recipients that were actually reached.
   */
  public async sendUrgentPatientAlert(
    patientId: string,
    message: string,
    title?: string
  ): Promise<{ patientName: string; notified: string[] }> {
    const result = await api.post<{ patientName: string; notified: string[] }>(
      '/api/notifications/urgent-alert',
      { patientId, message, title }
    );
    this.notify('notifications', 'save', result);
    return result;
  }

  /** Pharmacy availability and pricing for each medicine on a prescription. */
  public getPrescriptionAvailability(prescriptionId: string): Promise<MedicineAvailability[]> {
    return this.safeList(
      () =>
        api.get<MedicineAvailability[]>(
          `/api/inventory/prescriptions/${prescriptionId}/availability`
        ),
      'medicine availability'
    );
  }

  /** Places a collection request for prescribed medicines at a pharmacy. */
  public async orderMedicines(
    prescriptionId: string,
    items: { medicineName: string; quantity: number }[],
    facilityId?: string
  ): Promise<MedicineOrder> {
    const order = await api.post<MedicineOrder>('/api/inventory/orders', {
      prescriptionId,
      items,
      facilityId,
    });
    this.notify('medicine_orders', 'create', order);
    return order;
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

  // --- APPOINTMENTS ---
  public getAppointments(): Promise<Appointment[]> {
    return this.safeList(async () => {
      const res = await api.get<Paginated<Record<string, unknown>>>('/api/appointments', {
        query: { limit: 100 },
      });
      return page(res).map((row) => camelize<Appointment>(row));
    }, 'appointments');
  }

  // --- LAB ORDERS ---
  /**
   * The lab worklist. Statuses and priorities arrive uppercase from the API
   * while screens read the lowercase vocabulary, so they are mapped here.
   */
  public getLabOrders(): Promise<LabOrder[]> {
    return this.safeList(async () => {
      const res = await api.get<Paginated<Record<string, unknown>>>('/api/lab-orders', {
        query: { limit: 100 },
      });
      return page(res).map((row) => {
        const c = camelize<Record<string, unknown>>(row);
        return {
          ...(c as unknown as LabOrder),
          status: lower(c.status as string) as LabOrder['status'],
          priority: lower(c.priority as string) as LabOrder['priority'],
          dateOrdered: String(c.orderedAt ?? c.createdAt ?? ''),
        };
      });
    }, 'lab orders');
  }

  public async createLabOrder(input: {
    patientId: string;
    testName: string;
    category?: string;
    priority?: 'ROUTINE' | 'URGENT' | 'STAT';
    notes?: string;
  }): Promise<LabOrder> {
    const created = camelize<LabOrder>(
      await api.post<Record<string, unknown>>('/api/lab-orders', input)
    );
    this.notify('lab_orders', 'create', created);
    return created;
  }

  /** Moves an order along the worklist: ordered → collected → processing → done. */
  public async updateLabOrderStatus(
    id: string,
    status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'COMPLETED'
  ): Promise<void> {
    await api.patch(`/api/lab-orders/${id}`, { status });
    this.notify('lab_orders', 'update', { id, status });
  }

  // --- NCD SCREENINGS ---
  public getNcdScreenings(): Promise<NcdScreening[]> {
    return this.safeList(async () => {
      const res = await api.get<Paginated<Record<string, unknown>>>('/api/ncd-screenings', {
        query: { limit: 100 },
      });
      return page(res).map((row) => camelize<NcdScreening>(row));
    }, 'NCD screenings');
  }

  /**
   * Records a CBAC screening.
   *
   * The CBAC score, risk category and recommendations are computed by the
   * server against the published NPCDCS scoring — the browser sends only what
   * was measured, and reads the assessment back. Scoring in two places is how
   * the two copies drift apart.
   */
  public async createNcdScreening(input: {
    patientId: string;
    age?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    bloodGlucose?: number;
    waistCircumference?: number;
    tobaccoUse?: boolean;
    alcoholUse?: boolean;
    physicalActivityAdequate?: boolean;
    familyHistory?: boolean;
  }): Promise<NcdScreening> {
    const created = camelize<NcdScreening>(
      await api.post<Record<string, unknown>>('/api/ncd-screenings', input)
    );
    this.notify('ncd_screenings', 'create', created);
    return created;
  }

  // --- VACCINATIONS ---
  /**
   * The immunisation register. The API caps a page at 100 and the register is
   * larger than that, so this pages through rather than silently truncating —
   * a dropped dose here reads as a child who was never scheduled.
   */
  public getVaccinations(): Promise<Vaccination[]> {
    return this.safeList(async () => {
      const all: Vaccination[] = [];
      let currentPage = 1;
      let lastPage = 1;

      do {
        const res = await api.get<Paginated<Record<string, unknown>>>('/api/vaccinations', {
          query: { page: currentPage, limit: 100 },
        });
        all.push(...page(res).map((row) => camelize<Vaccination>(row)));
        const totalPages = res?.pagination?.totalPages ?? 1;
        lastPage = Math.min(totalPages, 20);
        currentPage += 1;
      } while (currentPage <= lastPage);

      return all;
    }, 'vaccinations');
  }

  /**
   * Records a dose as given. The server stamps who administered it and where,
   * so only the batch number and date travel from the browser.
   */
  public async administerVaccination(
    vaccinationId: string,
    input: { batchNumber?: string; administeredDate?: string } = {}
  ): Promise<Vaccination> {
    const updated = camelize<Vaccination>(
      await api.post<Record<string, unknown>>(`/api/vaccinations/${vaccinationId}/administer`, input)
    );
    this.notify('vaccination', 'administer', updated);
    return updated;
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): Promise<AuditLog[]> {
    return this.safeList(
      async () =>
        page(
          await api.get<Paginated<Record<string, unknown>>>('/api/audit-logs', { query: { limit: 100 } })
        ).map((row) => camelize<AuditLog>(row)),
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
