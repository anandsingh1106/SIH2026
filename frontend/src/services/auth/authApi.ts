import { api, ApiError } from '../api/apiClient';
import { User, UserRole } from '../../types';

export { ApiError as AuthApiError };

export interface SessionProfile {
  name: string;
  role: UserRole;
  phone?: string;
  district?: string;
  taluka?: string;
  village?: string;
  abhaId?: string;
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
