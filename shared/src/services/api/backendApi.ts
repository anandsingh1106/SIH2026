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

/** A single patient record, as GET /api/patients/:id returns it. */
export interface PatientDetail extends PatientSummary {
  address?: string;
  emergencyContact?: { name: string; phone: string };
  assignedAsha?: { name: string; phone?: string; village?: string };
  allergies: { id: string; substance: string; reaction?: string; severity?: string }[];
  chronicConditions: { id: string; condition: string; status: string; diagnosedDate?: string }[];
}

export interface FamilyMemberRecord {
  id: string;
  relatedPatientId?: string;
  name?: string;
  relationship: string;
  dateOfBirth?: string;
  gender?: string;
  abhaId?: string;
  bloodGroup?: string;
}

export interface MaternalRecord {
  id: string;
  patientId: string;
  patientName?: string;
  /** List responses only. */
  patientPhone?: string;
  patientVillage?: string;
  patientDateOfBirth?: string;
  ancVisitCount?: number;
  latestHemoglobin?: number;
  latestBp?: string;
  lmpDate?: string;
  eddDate?: string;
  gravida?: number;
  parity?: number;
  highRisk: boolean;
  riskFactors: string[];
  jsskRegistered: boolean;
  pmsmaRegistered: boolean;
  outcome?: 'ONGOING' | 'DELIVERED' | 'ABORTED' | 'REFERRED';
}

export interface InventoryRecord {
  id: string;
  medicineId: string;
  name?: string;
  genericName?: string;
  strength?: string;
  facilityId: string;
  facilityName?: string;
  batchNumber?: string;
  expiryDate?: string;
  stock: number;
  reorderLevel: number;
  isLow: boolean;
  unitPrice?: number;
  supplier?: string;
}

export interface AncVisitRecord {
  id: string;
  visitNumber: number;
  date: string;
  weight?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  hemoglobin?: number;
  fundalHeight?: string;
  fetalHeartRate?: number;
  tetanusGiven: boolean;
  ifaTabletsGiven?: number;
  notes?: string;
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
  reason?: string;
  diagnosis?: string;
  referredByName?: string;
  referredTo?: string;
  referredToName?: string;
  sourceFacilityName?: string;
  destinationFacilityName?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
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

export type FacilityType =
  | 'SUB_CENTER' | 'PHC' | 'CHC' | 'DISTRICT_HOSPITAL' | 'SPECIALIST_HOSPITAL' | 'MEDICAL_COLLEGE';

/** A facility as the admin registry returns it, with live bed and staff counts. */
export interface AdminFacilityRecord {
  id: string;
  name: string;
  type: FacilityType;
  address?: string;
  district: string;
  taluka?: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  emergencyAvailable: boolean;
  active: boolean;
  beds: { total: number; available: number; icuTotal: number; icuAvailable: number; ventilators: number };
  doctors: number;
  ashaWorkers: number;
  updatedAt: string;
}

export interface FacilityInput {
  name: string;
  type: FacilityType;
  district: string;
  taluka?: string;
  village?: string;
  address?: string;
  phone?: string;
  email?: string;
  emergencyAvailable?: boolean;
}

export type TreatmentPlanStatus = 'ACTIVE' | 'REVIEW_REQUIRED' | 'COMPLETED' | 'CANCELLED';

export interface TreatmentPlanRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientAbhaId?: string;
  patientVillage?: string;
  ashaName?: string;
  referralId?: string;
  referralCode?: string;
  authorId?: string;
  authorName?: string;
  title: string;
  specialty?: string;
  directives?: string;
  status: TreatmentPlanStatus;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  phases: {
    id: string;
    position: number;
    title: string;
    description?: string;
    targetDate?: string;
    completed: boolean;
    completedAt?: string;
  }[];
}

export interface MessagingContact {
  id: string;
  name: string;
  role: string;
  facilityName?: string;
}

export interface ConversationRecord {
  id: string;
  subject?: string;
  lastMessage?: string;
  unreadCount: number;
  updatedAt: string;
  members: { id: string; name: string; role: string }[];
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  text: string;
  isRead?: boolean;
  timestamp: string;
}

export interface StaffRecord {
  id: string;
  name: string;
  role: string;
  status: string;
  facility?: string;
  facilityId?: string;
  district?: string;
  taluka?: string;
  phone: string;
  email?: string;
  mfaEnrolled: boolean;
  lastLoginAt?: string;
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

export interface AshaAnalytics {
  assignedPatients: number;
  tasksOpen: number;
  tasksCompleted: number;
  homeVisits: number;
  highRiskMaternal: number;
  vaccinationsDue: number;
  ncdHighRisk: number;
}

export interface VillageHotspot {
  district: string;
  taluka?: string;
  village: string;
  highRiskMaternal: number;
  severeAnaemia: number;
  ncdHighRisk: number;
  overdueVaccines: number;
  score: number;
}

export interface AdminAnalytics {
  patients: { total: number; registeredInPeriod: number };
  facilities: { total: number; byType: { type: string; count: number }[] };
  staff: { role: string; count: number }[];
  appointments: { total: number; completed: number; cancelled: number };
  referrals: {
    total: number; completed: number; pending: number; completionRate: number;
    byUrgency: { urgency: string; count: number }[];
  };
  maternal: { active: number; highRisk: number; ancVisits: number };
  immunization: { given: number; due: number; coverageRate: number };
  ncd: {
    screenings: number; byRisk: { risk_category: string; count: number }[];
    suspectedDiabetes: number; suspectedHypertension: number;
  };
  beds: { total: number; occupied: number; available: number; occupancyRate: number };
  inventory: { items: number; lowStock: number; expiringSoon: number };
  districts: { district: string; patients: number }[];
  trends: {
    key: string; month: string; registrations: number; consultations: number; referrals: number;
    screenings: number; ancVisits: number; vaccinesGiven: number;
  }[];
  topDiagnoses: { diagnosis: string; count: number }[];
  referralTurnaroundHours: number | null;
  hotspots: VillageHotspot[];
}

export interface DistrictAnalyticsRecord {
  district: string;
  patients: number;
  facilities: { total: number; subCenters: number; phcs: number; chcs: number; hospitals: number; emergencyReady: number };
  ashaWorkers: number;
  doctors: number;
  beds: { total: number; occupied: number; occupancyRate: number };
  stock: { lines: number; stockedOut: number; availabilityRate: number | null };
  referrals: {
    total: number; completed: number; pending: number; emergency: number; avgAcceptHours: number | null;
    topDestinations: { facility: string; count: number; share: number }[];
  };
  consultations: number;
  teleconsultations: number;
  homeVisits: number;
  highRiskMaternal: number;
  ncdHighRisk: number;
  immunization: { given: number; due: number; coverageRate: number };
}

export interface HealthSignal {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'moderate';
  title: string;
  location: string;
  evidence: string;
  recommendedAction: string;
  link: string;
  count: number;
}

export type ReportType = 'maternal-child' | 'ncd' | 'immunization' | 'referrals' | 'inventory' | 'facilities';

export interface ReportDefinition {
  type: ReportType;
  category: string;
  title: string;
  description: string;
}

export interface ReportTable extends ReportDefinition {
  generatedAt: string;
  columns: string[];
  rows: (string | number | null)[][];
}

export interface DoctorAnalytics {
  todaysAppointments: number;
  consultations: number;
  teleconsultations: number;
  prescriptionsIssued: number;
  pendingLabResults: number;
  referralsMade: number;
  openTasks: number;
  weekly: { from: string; to: string; week: string; opd: number; tele: number }[];
  topDiagnoses: { diagnosis: string; count: number; percent: number }[];
  antibiotic: { prescriptions: number; withAntibiotic: number; rate: number };
  followUps: { due: number; kept: number; rate: number };
}

export type HeatmapMetric =
  | 'patients' | 'ncd_high_risk' | 'maternal_high_risk' | 'referrals' | 'vaccinations_overdue' | 'severe_anaemia';

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
  getPatient: (id: string) => api.get<PatientDetail>(`/api/patients/${id}`),
  createPatient: (body: Partial<PatientSummary> & { name: string }) =>
    api.post<PatientSummary>('/api/patients', body),
  updatePatient: (id: string, body: Partial<PatientSummary> & { emergencyContact?: string; emergencyContactPhone?: string }) =>
    api.patch<PatientSummary>(`/api/patients/${id}`, body),
  getVitals: (patientId: string) => api.get<VitalsRecord[]>(`/api/patients/${patientId}/vitals`),
  recordVitals: (patientId: string, body: Record<string, unknown>) =>
    api.post<VitalsRecord>(`/api/patients/${patientId}/vitals`, body),
  getFamilyMembers: (patientId: string) =>
    api.get<FamilyMemberRecord[]>(`/api/patients/${patientId}/family`),
  addFamilyMember: (patientId: string, body: {
    relatedPatientId?: string;
    name?: string;
    relationship: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    abhaId?: string;
  }) =>
    api.post<FamilyMemberRecord>(`/api/patients/${patientId}/family`, body),

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
  arriveReferral: (id: string, note?: string) => api.post<ReferralRecord>(`/api/referrals/${id}/arrive`, { note }),
  setReferralStatus: (id: string, status: string, note?: string) =>
    api.patch<ReferralRecord>(`/api/referrals/${id}`, { status, note }),

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

  // Maternal health (ANC / high-risk pregnancy tracking)
  getMaternalRecords: (params: { patientId?: string; highRisk?: boolean; page?: number; limit?: number } = {}) =>
    api.get<Paginated<MaternalRecord>>('/api/maternal-records', { query: page(params) as never }),
  createMaternalRecord: (body: {
    patientId: string;
    lmpDate?: string;
    eddDate?: string;
    gravida?: number;
    parity?: number;
    highRisk?: boolean;
    riskFactors?: string[];
    jsskRegistered?: boolean;
    pmsmaRegistered?: boolean;
  }) => api.post<MaternalRecord>('/api/maternal-records', body),
  addAncVisit: (maternalRecordId: string, body: {
    visitDate: string;
    visitNumber?: number;
    weight?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    hemoglobin?: number;
    fundalHeight?: string;
    fetalHeartRate?: number;
    tetanusGiven?: boolean;
    ifaTabletsGiven?: number;
    notes?: string;
  }) => api.post<AncVisitRecord>(`/api/maternal-records/${maternalRecordId}/anc-visits`, body),

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
  getInventory: (params: { facilityId?: string; lowStock?: boolean; limit?: number } = {}) =>
    api.get<Paginated<InventoryRecord>>('/api/inventory', { query: page(params) as never }),
  adjustStock: (inventoryId: string, body: {
    type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'EXPIRED';
    quantity: number;
    reason?: string;
  }) => api.post<InventoryRecord>(`/api/inventory/${inventoryId}/adjust`, body),

  // Notifications
  getNotifications: (params: { unreadOnly?: boolean } = {}) =>
    api.get<Paginated<NotificationRecord>>('/api/notifications', { query: page(params) as never }),
  getUnreadCount: () => api.get<{ unread: number }>('/api/notifications/unread-count'),
  markNotificationRead: (id: string) => api.patch<NotificationRecord>(`/api/notifications/${id}/read`),
  markAllNotificationsRead: () => api.post<{ updated: number }>('/api/notifications/read-all'),
  /** Pages the patient's ASHA and the patient with a CRITICAL notification. */
  sendUrgentAlert: (patientId: string, message: string, title?: string) =>
    api.post<{ patientId: string; patientName: string; notified: ('ASHA' | 'PATIENT')[] }>(
      '/api/notifications/urgent-alert', { patientId, title, message }
    ),

  // Messaging
  getMessagingContacts: () => api.get<MessagingContact[]>('/api/conversations/contacts'),
  getConversations: () => api.get<Paginated<ConversationRecord>>('/api/conversations', { query: { limit: 100 } }),
  createConversation: (memberIds: string[], subject?: string) =>
    api.post<{ id: string; subject?: string }>('/api/conversations', { memberIds, subject }),
  getConversationMessages: (conversationId: string) =>
    api.get<Paginated<ChatMessageRecord>>(`/api/conversations/${conversationId}/messages`, { query: { limit: 100 } }),
  sendChatMessage: (conversationId: string, body: string) =>
    api.post<ChatMessageRecord>(`/api/conversations/${conversationId}/messages`, { body }),
  markMessageRead: (messageId: string) => api.patch<{ id: string; isRead: boolean }>(`/api/messages/${messageId}/read`),

  // Staff directory (admin only)
  getStaff: (params: { role?: string; district?: string; search?: string } = {}) =>
    api.get<Paginated<StaffRecord>>('/api/staff-access/staff', { query: page(params) as never }),

  // Treatment plans
  getTreatmentPlans: (params: { patientId?: string; status?: TreatmentPlanStatus; mine?: boolean; limit?: number } = {}) =>
    api.get<Paginated<TreatmentPlanRecord>>('/api/treatment-plans', { query: page(params) as never }),
  createTreatmentPlan: (body: {
    patientId: string;
    referralId?: string;
    title: string;
    specialty?: string;
    directives?: string;
    startDate?: string;
    phases: { title: string; description?: string; targetDate?: string }[];
  }) => api.post<TreatmentPlanRecord>('/api/treatment-plans', body),
  updateTreatmentPlan: (id: string, body: { title?: string; specialty?: string; directives?: string; status?: TreatmentPlanStatus }) =>
    api.patch<TreatmentPlanRecord>(`/api/treatment-plans/${id}`, body),
  setTreatmentPhase: (planId: string, phaseId: string, completed: boolean) =>
    api.patch<TreatmentPlanRecord>(`/api/treatment-plans/${planId}/phases/${phaseId}`, { completed }),

  // Facility registry (admin only)
  getFacilities: (params: { search?: string; type?: FacilityType; district?: string; includeInactive?: boolean; limit?: number } = {}) =>
    api.get<Paginated<AdminFacilityRecord>>('/api/facilities', { query: page(params) as never }),
  createFacility: (body: FacilityInput) => api.post<AdminFacilityRecord>('/api/facilities', body),
  updateFacility: (id: string, body: Partial<FacilityInput> & { active?: boolean }) =>
    api.patch<AdminFacilityRecord>(`/api/facilities/${id}`, body),

  // Analytics
  getAnalytics: (scope: 'patient' | 'asha' | 'doctor' | 'specialist' | 'admin') =>
    api.get<Record<string, unknown>>(`/api/analytics/${scope}`),
  getAshaAnalytics: () => api.get<AshaAnalytics>('/api/analytics/asha'),
  getDoctorAnalytics: () => api.get<DoctorAnalytics>('/api/analytics/doctor'),
  getAshaHouseholds: () =>
    api.get<{
      patientId: string;
      name: string;
      gender?: string;
      dateOfBirth?: string;
      phone?: string;
      village?: string;
      taluka?: string;
      district?: string;
      address?: string;
      householdId?: string;
      lastVisit?: string;
      vaccinesDue: number;
      status: 'critical' | 'high_risk' | 'due' | 'routine';
      alerts: string[];
    }[]>('/api/analytics/asha/households'),
  getAshaMonthlyReport: (month: string) =>
    api.get<{
      month: string;
      assignedPatients: number;
      rows: { key: string; indicator: string; value: number }[];
      pending: { vaccinesDue: number; highRiskPregnancies: number; openTasks: number };
    }>('/api/analytics/asha/monthly', { query: { month } }),
  getAdminAnalytics: (params: { from?: string; to?: string; district?: string } = {}) =>
    api.get<AdminAnalytics>('/api/analytics/admin', { query: params }),
  getDistrictAnalytics: () => api.get<DistrictAnalyticsRecord[]>('/api/analytics/districts'),
  getHealthSignals: () =>
    api.get<{ generatedAt: string; signals: HealthSignal[]; hotspots: VillageHotspot[] }>('/api/analytics/insights'),
  getReportCatalogue: () => api.get<ReportDefinition[]>('/api/analytics/reports'),
  getReport: (type: ReportType) => api.get<ReportTable>(`/api/analytics/reports/${type}`),
  getHeatmap: (metric: HeatmapMetric = 'patients') =>
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
