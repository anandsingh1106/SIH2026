import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listAppointmentsSchema = paginationSchema.extend({
  status: z.enum(['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  doctorId: z.string().trim().min(1).optional(),
  facilityId: z.string().trim().min(1).optional(),
  from: z.string().regex(DATE_RE, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(DATE_RE, 'to must be YYYY-MM-DD').optional(),
});

export const createAppointmentSchema = z.object({
  patientId: z.string().trim().min(1).optional(),
  doctorId: z.string().trim().min(1).optional(),
  facilityId: z.string().trim().min(1).optional(),
  // The frontend sends a facility/doctor name rather than an id today; both are
  // accepted so existing screens keep working.
  doctor: z.string().trim().max(160).optional(),
  facility: z.string().trim().max(200).optional(),
  specialty: z.string().trim().max(120).optional(),
  date: z.string().regex(DATE_RE, 'date must be YYYY-MM-DD'),
  time: z.string().regex(TIME_RE, 'time must be HH:MM (24-hour)'),
  type: z.enum(['in-person', 'telemedicine']).default('in-person'),
  reason: z.string().trim().max(500).optional(),
});

export const rescheduleSchema = z.object({
  date: z.string().regex(DATE_RE, 'date must be YYYY-MM-DD'),
  time: z.string().regex(TIME_RE, 'time must be HH:MM (24-hour)'),
});

export const idParamSchema = z.object({
  id: z.string().trim().min(1),
});
