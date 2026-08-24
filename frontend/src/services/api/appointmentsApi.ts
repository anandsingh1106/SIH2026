export interface Appointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  specialty: string;
  facility: string;
  type: 'in-person' | 'telemedicine';
  status: 'upcoming' | 'completed' | 'cancelled';
  reason: string;
  tokenNumber?: number;
}

export interface NewAppointmentInput {
  doctor: string;
  specialty: string;
  facility: string;
  date: string;
  time: string;
  type: 'in-person' | 'telemedicine';
  reason?: string;
}

const BASE_URL = '/api/appointments';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error || 'Something went wrong.');
  }

  return body as T;
}

export const appointmentsApi = {
  list: () => request<Appointment[]>(''),

  create: (input: NewAppointmentInput) =>
    request<Appointment>('', { method: 'POST', body: JSON.stringify(input) }),

  cancel: (id: string) => request<Appointment>(`/${id}/cancel`, { method: 'PATCH' }),

  reschedule: (id: string, date: string, time: string) =>
    request<Appointment>(`/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ date, time }),
    }),
};
