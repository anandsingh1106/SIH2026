import { User, UserRole } from '../../types';

const BASE_URL = '/api/auth';

export class AuthApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new AuthApiError(body.message || body.error || 'Something went wrong.', res.status, body.error);
  }

  return body as T;
}

export interface PhoneLoginProfile {
  name: string;
  role: UserRole;
  district?: string;
  taluka?: string;
  village?: string;
  abhaId?: string;
  email?: string;
}

export const authApi = {
  phoneLogin: (idToken: string, profile?: PhoneLoginProfile) =>
    request<{ user: User }>('/phone-login', {
      method: 'POST',
      body: JSON.stringify({ idToken, ...profile }),
    }),

  me: () => request<{ user: User }>('/me'),

  logout: () => request<{ message: string }>('/logout', { method: 'POST' }),
};
