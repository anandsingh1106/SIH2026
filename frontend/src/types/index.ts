export type UserRole = 'patient' | 'asha' | 'doctor' | 'specialist' | 'admin';

export type Priority = 'critical' | 'high' | 'moderate' | 'low';

export interface User {
  id: string;
  name: string;
  nameMr?: string;
  nameHi?: string;
  email?: string;
  phone: string;
  role: UserRole;
  abhaId?: string;
  facilityId?: string;
  facilityName?: string;
  district: string;
  taluka?: string;
  village?: string;
  avatar?: string;
  isVerified: boolean;
  qualifications?: string;
  specialization?: string;
}

export interface Vitals {
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  bloodSugarRandom?: number;
  hemoglobin?: number;
}

export interface Patient {
  id: string;
  abhaId: string;
  name: string;
  nameMr?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone: string;
  address: string;
  village: string;
  taluka: string;
  district: string;
  pincode: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  vitals?: Vitals;
  riskCategory: 'normal' | 'moderate' | 'high' | 'critical';
  assignedAshaId?: string;
  registeredDate: string;
  familyMembers?: {
    id: string;
    name: string;
    relationship: string;
    age: number;
    gender: string;
    abhaId?: string;
  }[];
}

export type ReferralStatus =
  | 'created'
  | 'accepted'
  | 'scheduled'
  | 'in_transit'
  | 'arrived'
  | 'consultation'
  | 'treatment'
  | 'follow_up'
  | 'closed';

export interface Referral {
  id: string;
  referralCode: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  referringFacilityId: string;
  referringFacilityName: string;
  referringDoctorName: string;
  targetFacilityId: string;
  targetFacilityName: string;
  specialty: string;
  priority: Priority;
  status: ReferralStatus;
  clinicalSummary: string;
  provisionalDiagnosis: string;
  aiPriorityScore: number;
  aiRationale?: string;
  assignedSpecialistId?: string;
  assignedSpecialistName?: string;
  allocatedBedId?: string;
  createdAt: string;
  updatedAt: string;
  history: {
    status: ReferralStatus;
    timestamp: string;
    note?: string;
    updatedBy: string;
  }[];
}

export interface PrescribedMedicine {
  name: string;
  genericName: string;
  dosage: string;
  frequency: string; // e.g. "1-0-1"
  duration: string;  // e.g. "5 days"
  instructions: string; // e.g. "After food"
  instructionsMr: string;
  instructionsHi: string;
  timing: ('morning' | 'afternoon' | 'night')[];
  takeWith: 'before_food' | 'after_food' | 'with_food';
  quantity: number;
}

export interface Prescription {
  id: string;
  consultationId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  facilityName: string;
  date: string;
  medicines: PrescribedMedicine[];
  generalAdvice: string;
  generalAdviceMr?: string;
  generalAdviceHi?: string;
  dietaryInstructions?: string;
  followUpDate?: string;
  warnings?: string[];
}

export interface LabOrder {
  id: string;
  consultationId?: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  facilityName: string;
  testName: string;
  category: 'Pathology' | 'Radiology' | 'Biochemistry' | 'Microbiology';
  dateOrdered: string;
  priority: Priority;
  status: 'ordered' | 'sample_collected' | 'processing' | 'completed';
  result?: string;
  referenceRange?: string;
  unit?: string;
  isAbnormal?: boolean;
  notes?: string;
  completedDate?: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  facilityId: string;
  facilityName: string;
  date: string;
  tokenNumber: number;
  symptoms: string[];
  vitals: Vitals;
  examinationNotes: string;
  assessment: string;
  diagnosis: string;
  icdCode?: string;
  prescription?: Prescription;
  labOrders?: LabOrder[];
  referralId?: string;
  isTelemedicine?: boolean;
  followUpDays?: number;
}

export interface Bed {
  id: string;
  facilityId: string;
  facilityName: string;
  department: string;
  bedNumber: string;
  type: 'general' | 'icu' | 'ventilator' | 'emergency' | 'isolation';
  isOccupied: boolean;
  status?: 'available' | 'occupied' | 'reserved';
  patientId?: string;
  patientName?: string;
  allocatedAt?: string;
}

export interface Facility {
  id: string;
  name: string;
  nameMr?: string;
  type: 'PHC' | 'CHC' | 'Sub-District Hospital' | 'District Hospital' | 'GMC' | 'Private Empaneled';
  district: string;
  taluka: string;
  address: string;
  phone: string;
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  ventilators: number;
  availableVentilators: number;
  emergencyReady: boolean;
  bloodBankAvailable: boolean;
  oxygenAvailable: boolean;
  services: string[];
  doctorsCount: number;
  distanceKm?: number;
  latitude: number;
  longitude: number;
}

/** One prescribed medicine, with its position in pharmacy stock. */
export interface MedicineAvailability {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  available: boolean;
  inStock: number;
  unitPrice: number | null;
  estimatedCost: number | null;
  facilityName: string | null;
  facilityId: string | null;
}

export interface MedicineOrder {
  orderCode: string;
  prescriptionId: string;
  items: { medicineName: string; quantity: number }[];
  placedAt: string;
  status: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  dosage: string;
  stock: number;
  minThreshold: number;
  batchNumber: string;
  expiryDate: string;
  facilityId: string;
  facilityName: string;
  district: string;
  isEssential: boolean;
  pricePerUnit: number;
  unit?: string;
}

export interface Task {
  id: string;
  ashaId: string;
  patientId: string;
  patientName: string;
  title: string;
  titleMr?: string;
  description: string;
  priority: Priority;
  dueDate: string;
  dueTime: string;
  type: 'home_visit' | 'immunization' | 'anc_checkup' | 'ncd_screening' | 'follow_up' | 'danger_sign_check';
  status: 'pending' | 'completed' | 'rescheduled';
  village: string;
  householdNumber: string;
}

export interface HomeVisit {
  id: string;
  ashaId: string;
  patientId: string;
  patientName: string;
  date: string;
  vitals: Vitals;
  observations: string;
  dangerSignsIdentified: string[];
  screeningOutcome: string;
  referralRecommended: boolean;
  notes: string;
  nextVisitDate: string;
  syncStatus: 'synced' | 'pending';
}

export interface MaternalCareRecord {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  village: string;
  gravida: number;
  para: number;
  lmpDate: string;
  eddDate: string;
  gestationalWeeks: number;
  highRisk: boolean;
  riskFactors: string[];
  ancVisits: {
    visitNumber: number;
    date: string;
    vitals: Vitals;
    hemoglobin: number;
    weightGain: number;
    fundalHeight: string;
    fetalHeartRate?: number;
    tetanusToxoidGiven: boolean;
    ifaTabletsGiven: number;
    notes: string;
  }[];
  jssyEligible: boolean;
  pmsmaRegistered: boolean;
}

export interface ImmunizationRecord {
  id: string;
  childName: string;
  motherName: string;
  dob: string;
  gender: 'male' | 'female';
  village: string;
  vaccines: {
    name: string;
    dueAge: string;
    dueDate: string;
    givenDate?: string;
    status: 'given' | 'due' | 'overdue';
    batchNumber?: string;
  }[];
}

export interface NcdScreeningRecord {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  date: string;
  cbacScore: number;
  bpSystolic: number;
  bpDiastolic: number;
  bloodSugarRandom: number;
  tobaccoUse: boolean;
  alcoholUse: boolean;
  waistCircumference: number;
  riskStatus: 'normal' | 'moderate' | 'high';
  referralId?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  role?: UserRole;
  title: string;
  message: string;
  category: 'emergency' | 'referral' | 'appointment' | 'medicine' | 'system' | 'task' | 'message';
  priority: Priority;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  attachment?: {
    name: string;
    type: string;
    size: string;
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  status: 'success' | 'warning' | 'failure';
  ipAddress: string;
  details: string;
}

export interface SyncOperation {
  id: string;
  entity: 'patient' | 'home_visit' | 'referral' | 'task' | 'ncd' | 'maternal';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
  retryCount: number;
}
