import { api, Paginated } from '@arogyasetu/shared/services/api';

export interface Appointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  /** Present when the caller is clinical staff; patients do not need it. */
  patient?: string;
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

export interface BookableDoctor {
  id: string;
  name: string;
  role: 'DOCTOR' | 'SPECIALIST';
  facilityId: string;
  facilityName: string;
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

  /** Doctors and specialists who can be booked, optionally at one facility. */
  doctors: (facilityId?: string) =>
    api.get<BookableDoctor[]>('/api/appointments/doctors', { query: { facilityId } }),

  /** STUN, plus a TURN relay when the server has one, for video calls. */
  iceServers: () => api.get<{ iceServers: RTCIceServer[]; relay: boolean }>('/api/appointments/ice-servers'),

  create: (input: NewAppointmentInput) => api.post<Appointment>('/api/appointments', input),

  cancel: (id: string) => api.patch<Appointment>(`/api/appointments/${id}/cancel`),

  reschedule: (id: string, date: string, time: string) =>
    api.patch<Appointment>(`/api/appointments/${id}/reschedule`, { date, time }),
};
