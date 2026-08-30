/**
 * Translation between database enums and the shapes the existing React
 * frontend already consumes. Preserving these contracts (§56) means the
 * frontend keeps working while the database uses stricter uppercase enums.
 */

export const roleToApi = (role) => String(role || '').toLowerCase();

export const roleFromApi = (role) => String(role || '').toUpperCase();

const APPT_TYPE_TO_API = { IN_PERSON: 'in-person', TELEMEDICINE: 'telemedicine' };
const APPT_TYPE_FROM_API = { 'in-person': 'IN_PERSON', telemedicine: 'TELEMEDICINE' };

// The frontend only distinguishes upcoming / completed / cancelled.
const APPT_STATUS_TO_API = {
  BOOKED: 'upcoming',
  CONFIRMED: 'upcoming',
  CHECKED_IN: 'upcoming',
  IN_PROGRESS: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'cancelled',
};

export const apptTypeToApi = (t) => APPT_TYPE_TO_API[t] ?? 'in-person';
export const apptTypeFromApi = (t) => APPT_TYPE_FROM_API[t] ?? 'IN_PERSON';
export const apptStatusToApi = (s) => APPT_STATUS_TO_API[s] ?? 'upcoming';

/** Shapes a users row for API responses, omitting internal columns. */
export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || undefined,
    role: roleToApi(row.role),
    district: row.district || undefined,
    taluka: row.taluka || undefined,
    village: row.village || undefined,
    abhaId: row.abha_id || undefined,
    facilityId: row.facility_id || undefined,
    facilityName: row.facility_name || undefined,
    isVerified: true,
    // Enrolment state only — never the factor itself or any recovery code.
    mfaEnrolled: Boolean(row.mfa_enrolled_at),
  };
}

/** Shapes an appointments row into the object the frontend already renders. */
export function toPublicAppointment(row) {
  if (!row) return null;
  return {
    id: row.id,
    date: row.appointment_date,
    time: row.appointment_time,
    doctor: row.doctor_name || row.doctor || '',
    specialty: row.specialty || '',
    facility: row.facility_name || row.facility || '',
    type: apptTypeToApi(row.type),
    status: apptStatusToApi(row.status),
    reason: row.reason || '',
    tokenNumber: row.token_number ?? undefined,
  };
}

export function toPublicFacility(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    address: row.address || undefined,
    district: row.district,
    taluka: row.taluka || undefined,
    village: row.village || undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    phone: row.phone || undefined,
    emergencyAvailable: !!row.emergency_available,
  };
}

export function toPublicPatient(row) {
  if (!row) return null;
  return {
    id: row.id,
    abhaId: row.abha_id || undefined,
    name: row.name,
    dateOfBirth: row.date_of_birth || undefined,
    gender: row.gender ? row.gender.toLowerCase() : undefined,
    phone: row.phone || undefined,
    address: row.address || undefined,
    district: row.district || undefined,
    taluka: row.taluka || undefined,
    village: row.village || undefined,
    bloodGroup: row.blood_group || undefined,
    emergencyContact: row.emergency_contact
      ? { name: row.emergency_contact, phone: row.emergency_contact_phone || '' }
      : undefined,
    assignedAshaId: row.assigned_asha_id || undefined,
    registeredDate: row.created_at,
  };
}
