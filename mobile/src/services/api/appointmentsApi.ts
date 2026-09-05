import { api, Paginated } from '@arogyasetu/shared/services/api';

/**
 * Mirrors frontend/src/services/api/appointmentsApi.ts. Not moved to
 * shared/ since only this one screen and the admin/facility pages (web-only)
 * use it — kept as a local duplicate of a file that has no browser
 * dependency of its own, built entirely on the shared api client.
 */
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
  doctor?: string;
  doctorId?: string;
  facility?: string;
  facilityId?: string;
  specialty?: string;
  date: string;
  time: string;
  type: 'in-person' | 'telemedicine';
  reason?: string;
}

export interface ListAppointmentsParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export const appointmentsApi = {
  list: (params: ListAppointmentsParams = {}) =>
    api.get<Paginated<Appointment>>('/api/appointments', {
      query: { page: params.page ?? 1, limit: params.limit ?? 50, from: params.from, to: params.to },
    }),

  get: (id: string) => api.get<Appointment>(`/api/appointments/${id}`),

  create: (input: NewAppointmentInput) => api.post<Appointment>('/api/appointments', input),

  cancel: (id: string) => api.patch<Appointment>(`/api/appointments/${id}/cancel`),

  reschedule: (id: string, date: string, time: string) =>
    api.patch<Appointment>(`/api/appointments/${id}/reschedule`, { date, time }),
};
