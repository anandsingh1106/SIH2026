import { api, Paginated } from './apiClient';

/**
 * Typed client for the backend REST API.
 *
 * Every call goes through apiClient, which sends the session cookie, unwraps the
 * { success, data } envelope and converts errors into ApiError.
 */

export interface PatientSummary {
  id: string;
  abhaId?: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  district?: string;
  taluka?: string;
  village?: string;
  bloodGroup?: string;
  registeredDate?: string;
}

export interface VitalsRecord {
  id: string;
  temperature?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  bloodSugarRandom?: number;
  hemoglobin?: number;
  recordedAt: string;
}

export interface ReferralRecord {
  id: string;
  referralCode: string;
  patientId: string;
  patientName?: string;
  specialty?: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  status: string;
  clinicalSummary?: string;
  sourceFacilityName?: string;
  destinationFacilityName?: string;
  createdAt: string;
  history?: { id: string; status: string; note?: string; timestamp: string }[];
}

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message?: string;
  priority: string;
  link?: string;
  isRead: boolean;
  timestamp: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  patientName?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
}

export interface BedRecord {
  id: string;
  facilityId: string;
  facilityName?: string;
  ward?: string;
  bedNumber: string;
  type: string;
  status: string;
  isOccupied: boolean;
  patientName?: string;
}

export interface FacilityRecord {
  id: string;
  name: string;
  type: string;
  district: string;
  taluka?: string;
  phone?: string;
  emergencyAvailable?: boolean;
}

export interface TriageResult {
  riskScore: number;
  riskCategory: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  detectedFindings: { severity: string; reason: string }[];
  recommendedAction: string;
  explanation: string | null;
  aiAssisted: boolean;
  disclaimer: string;
}

export interface DrugInteractionResult {
  interactions: { drugs: string[]; severity: string; effect: string; guidance: string }[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
}

const page = (params: Record<string, unknown> = {}) => ({
  page: 1,
  limit: 50,
  ...params,
});

export const backendApi = {
  // Patients
  getPatients: (params: { search?: string; district?: string; page?: number; limit?: number } = {}) =>
    api.get<Paginated<PatientSummary>>('/api/patients', { query: page(params) as never }),
  getPatient: (id: string) => api.get<PatientSummary>(`/api/patients/${id}`),
  createPatient: (body: Partial<PatientSummary> & { name: string }) =>
    api.post<PatientSummary>('/api/patients', body),
  getVitals: (patientId: string) => api.get<VitalsRecord[]>(`/api/patients/${patientId}/vitals`),
  recordVitals: (patientId: string, body: Record<string, unknown>) =>
    api.post<VitalsRecord>(`/api/patients/${patientId}/vitals`, body),

  // Clinical
  getPrescriptions: (params: { patientId?: string } = {}) =>
    api.get<Paginated<Record<string, unknown>>>('/api/prescriptions', { query: page(params) as never }),
  getPrescription: (id: string) => api.get<Record<string, unknown>>(`/api/prescriptions/${id}`),
  getConsultations: (params: { patientId?: string } = {}) =>
    api.get<Paginated<Record<string, unknown>>>('/api/consultations', { query: page(params) as never }),

  // Referrals
  getReferrals: (params: { status?: string; urgency?: string } = {}) =>
    api.get<Paginated<ReferralRecord>>('/api/referrals', { query: page(params) as never }),
  getReferral: (id: string) => api.get<ReferralRecord>(`/api/referrals/${id}`),
  createReferral: (body: Record<string, unknown>) => api.post<ReferralRecord>('/api/referrals', body),
  acceptReferral: (id: string, note?: string) => api.post<ReferralRecord>(`/api/referrals/${id}/accept`, { note }),
  rejectReferral: (id: string, note?: string) => api.post<ReferralRecord>(`/api/referrals/${id}/reject`, { note }),
  completeReferral: (id: string, note?: string) => api.post<ReferralRecord>(`/api/referrals/${id}/complete`, { note }),

  // Tasks
  getTasks: (params: { status?: string } = {}) =>
    api.get<Paginated<TaskRecord>>('/api/tasks', { query: page(params) as never }),
  createTask: (body: Record<string, unknown>) => api.post<TaskRecord>('/api/tasks', body),
  updateTask: (id: string, body: Record<string, unknown>) => api.patch<TaskRecord>(`/api/tasks/${id}`, body),

  // Home visits
  getHomeVisits: (params: Record<string, unknown> = {}) =>
    api.get<Paginated<Record<string, unknown>>>('/api/home-visits', { query: page(params) as never }),
  createHomeVisit: (body: Record<string, unknown>) =>
    api.post<Record<string, unknown>>('/api/home-visits', body),

  // Beds
  getBeds: (params: { facilityId?: string } = {}) =>
    api.get<Paginated<BedRecord>>('/api/beds', { query: page(params) as never }),
  getBedAvailability: (facilityId?: string) =>
    api.get<{ facilityName: string; type: string; total: number; available: number }[]>(
      '/api/beds/availability', { query: facilityId ? { facilityId } : undefined }
    ),
  allocateBed: (bedId: string, body: { patientId: string; referralId?: string }) =>
    api.post<Record<string, unknown>>(`/api/beds/${bedId}/allocate`, body),
  releaseBed: (bedId: string) => api.post<BedRecord>(`/api/beds/${bedId}/release`),

  // Inventory
  getInventory: (params: { facilityId?: string; lowStock?: boolean } = {}) =>
    api.get<Paginated<Record<string, unknown>>>('/api/inventory', { query: page(params) as never }),

  // Notifications
  getNotifications: (params: { unreadOnly?: boolean } = {}) =>
    api.get<Paginated<NotificationRecord>>('/api/notifications', { query: page(params) as never }),
  getUnreadCount: () => api.get<{ unread: number }>('/api/notifications/unread-count'),
  markNotificationRead: (id: string) => api.patch<NotificationRecord>(`/api/notifications/${id}/read`),
  markAllNotificationsRead: () => api.post<{ updated: number }>('/api/notifications/read-all'),

  // Analytics
  getAnalytics: (scope: 'patient' | 'asha' | 'doctor' | 'specialist' | 'admin') =>
    api.get<Record<string, unknown>>(`/api/analytics/${scope}`),
  getHeatmap: (metric = 'patients') =>
    api.get<{ metric: string; points: { district: string; taluka?: string; value: number }[] }>(
      '/api/analytics/heatmap', { query: { metric } }
    ),

  // AI
  triage: (body: { symptoms?: string[]; vitals?: Record<string, number>; age?: number; notes?: string }) =>
    api.post<TriageResult>('/api/ai/triage', body),
  checkDrugInteractions: (medicines: string[]) =>
    api.post<DrugInteractionResult>('/api/ai/drug-interactions', { medicines }),
  askAssistant: (question: string, context?: string) =>
    api.post<{
      answer: string | null;
      available: boolean;
      source?: 'ai' | 'knowledge-base';
      reference?: string;
      disclaimer?: string;
    }>('/api/ai/assistant', { question, context }),

  // Offline sync
  syncBatch: (operations: {
    operationId: string;
    entity: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    payload: Record<string, unknown>;
    clientTimestamp?: string;
  }[]) =>
    api.post<{ results: { operationId: string; success: boolean; serverId?: string; error?: string; duplicate?: boolean }[] }>(
      '/api/sync/batch', { operations }
    ),

  // Public (no auth required)
  getPublicFacilities: (params: { search?: string; district?: string } = {}) =>
    api.get<Paginated<FacilityRecord>>('/api/public/facilities', { query: page(params) as never }),
  getPublicMedicines: (params: { search?: string } = {}) =>
    api.get<Paginated<Record<string, unknown>>>('/api/public/medicines', { query: page(params) as never }),
  getEmergencyInfo: () =>
    api.get<{ helplines: { name: string; number: string }[]; guidance: string[] }>('/api/public/emergency'),
  getHealthPrograms: () =>
    api.get<{ code: string; name: string; description: string }[]>('/api/public/health-programs'),

  /** Aggregate platform counts for the landing page. No auth required. */
  getPlatformStats: () =>
    api.get<{
      patients: number;
      facilities: number;
      consultations: number;
      prescriptions: number;
      referrals: number;
      emergencyReferrals: number;
      bedsAvailable: number;
      bedsTotal: number;
      vaccinationsGiven: number;
      screenings: number;
      healthWorkers: number;
      districts: number;
    }>('/api/public/stats'),

  /** Monthly consultation and referral counts for the landing-page chart. */
  getPlatformTrends: () =>
    api.get<{ points: { month: string; consultations: number; referrals: number }[] }>(
      '/api/public/trends'
    ),
};
