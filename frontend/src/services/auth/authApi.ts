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

export const authApi = {
  /**
   * Exchanges a Supabase access token for this app's session cookie.
   * Profile fields are only needed the first time an account signs in.
   */
  createSession: (accessToken: string, profile?: SessionProfile) =>
    api.post<{ user: User }>('/api/auth/session', { accessToken, ...profile }),

  me: () => api.get<{ user: User }>('/api/auth/me'),

  logout: () => api.post<{ message: string }>('/api/auth/logout'),
};
