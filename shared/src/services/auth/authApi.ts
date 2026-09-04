import { api, ApiError, Paginated } from '../api/apiClient';
import { User, UserRole } from '../../types';

export { ApiError as AuthApiError };

export interface SessionProfile {
  name: string;
  /**
   * What the user says they are. Never granted on this basis: the API always
   * provisions a PATIENT and files anything else as a request for review.
   */
  role: UserRole;
  phone?: string;
  district?: string;
  taluka?: string;
  village?: string;
  abhaId?: string;
  /** Claimed credential, recorded on the staff request for a reviewer. */
  registrationNumber?: string;
  facilityName?: string;
}

export type StaffRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface StaffAccessRequest {
  id: string;
  requestedRole: string;
  status: StaffRequestStatus;
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

export type MfaAction = 'none' | 'enrol' | 'verify';

export interface MfaState {
  /** Whether this role must have 2FA at all. */
  required: boolean;
  /** Whether a verified factor exists on the account. */
  enrolled: boolean;
  /** Whether a second factor was presented for *this* session. */
  satisfied: boolean;
  action: MfaAction;
}

export interface SessionResult {
  user: User;
  mfa: MfaState;
  /**
   * The same session JWT the web app receives as an httpOnly cookie, sent
   * here too so a client with no cookie jar (React Native) can store it and
   * send it back as `Authorization: Bearer <token>`. The web app ignores it.
   */
  sessionToken?: string;
}

export interface MfaStatus {
  required: boolean;
  enrolled: boolean;
  satisfied: boolean;
  recoveryCodesRemaining: number;
}

export const authApi = {
  /**
   * Exchanges a Supabase access token for this app's session cookie.
   * Profile fields are only needed the first time an account signs in.
   */
  createSession: (accessToken: string, profile?: SessionProfile) =>
    api.post<SessionResult>('/api/auth/session', { accessToken, ...profile }),

  me: () => api.get<SessionResult>('/api/auth/me'),

  logout: () => api.post<{ message: string }>('/api/auth/logout'),

  mfa: {
    status: () => api.get<MfaStatus>('/api/auth/mfa/status'),

    /**
     * Finishes enrolment. Returns the recovery codes, which are shown once and
     * never retrievable again.
     */
    completeEnrolment: (accessToken: string) =>
      api.post<{ recoveryCodes: string[] }>('/api/auth/mfa/enrol/complete', { accessToken }),

    /** Upgrades a password-only session once a TOTP code has been accepted. */
    verify: (accessToken: string) =>
      api.post<{ verified: boolean }>('/api/auth/mfa/verify', { accessToken }),

    /** Signs in with a recovery code when the authenticator is unavailable. */
    useRecoveryCode: (code: string) =>
      api.post<{ verified: boolean; remaining: number }>('/api/auth/mfa/recovery', { code }),

    regenerateRecoveryCodes: () =>
      api.post<{ recoveryCodes: string[] }>('/api/auth/mfa/recovery-codes'),

    /** Admin reset for a user who lost both their device and their codes. */
    resetForUser: (userId: string) =>
      api.post<{ message: string; factorsRemoved: number }>(`/api/auth/mfa/reset/${userId}`),
  },
};

/**
 * Staff access requests.
 *
 * Public signup only ever creates a patient account; this is how someone asks
 * for a clinical role, and how an administrator decides.
 */
export const staffAccessApi = {
  request: (body: {
    requestedRole: string;
    registrationNumber?: string;
    facilityName?: string;
    designation?: string;
    note?: string;
  }) => api.post<StaffAccessRequest>('/api/staff-access/requests', body),

  mine: () => api.get<{ request: StaffAccessRequest | null }>('/api/staff-access/requests/mine'),

  withdraw: (id: string) => api.delete<{ status: string }>(`/api/staff-access/requests/${id}`),

  // Admin review queue.
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<Paginated<AdminStaffRequest>>('/api/staff-access/requests', { query: params }),

  approve: (id: string, body?: { reviewNote?: string; facilityId?: string }) =>
    api.post<{ grantedRole: string; requiresReauth: boolean }>(
      `/api/staff-access/requests/${id}/approve`, body
    ),

  reject: (id: string, body?: { reviewNote?: string }) =>
    api.post<{ status: string }>(`/api/staff-access/requests/${id}/reject`, body),

  setRole: (userId: string, role: string) =>
    api.patch<{ role: string }>(`/api/staff-access/users/${userId}/role`, { role }),
};

export interface AdminStaffRequest {
  id: string;
  status: StaffRequestStatus;
  requestedRole: string;
  currentRole: string;
  applicant: { id: string; name: string; email?: string; phone?: string; district?: string };
  registrationNumber?: string;
  credentialHint?: string;
  facility?: string;
  facilityMatched: boolean;
  designation?: string;
  note?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}
