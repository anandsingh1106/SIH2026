import { z } from 'zod';
import { paginationSchema } from './common.js';

// ─── Referrals ──────────────────────────────────────────────────────────────

export const listReferralsSchema = paginationSchema.extend({
  status: z.enum(['CREATED', 'SENT', 'ACCEPTED', 'REJECTED', 'IN_TRANSIT',
                  'ARRIVED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED']).optional(),
  urgency: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).optional(),
  destinationFacilityId: z.string().trim().max(80).optional(),
  sourceFacilityId: z.string().trim().max(80).optional(),
});

export const createReferralSchema = z.object({
  patientId: z.string().trim().min(1),
  destinationFacilityId: z.string().trim().max(80).optional(),
  sourceFacilityId: z.string().trim().max(80).optional(),
  referredTo: z.string().trim().max(80).optional(),
  specialty: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(500).optional(),
  urgency: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
  clinicalSummary: z.string().trim().max(4000).optional(),
  diagnosis: z.string().trim().max(500).optional(),
});

export const referralTransitionSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const referralStatusSchema = z.object({
  status: z.enum(['SENT', 'ACCEPTED', 'REJECTED', 'IN_TRANSIT', 'ARRIVED',
                  'IN_CONSULTATION', 'COMPLETED', 'CANCELLED']),
  note: z.string().trim().max(1000).optional(),
});

// ─── Labs ───────────────────────────────────────────────────────────────────

export const listLabOrdersSchema = paginationSchema.extend({
  patientId: z.string().trim().max(80).optional(),
  facilityId: z.string().trim().max(80).optional(),
  status: z.enum(['ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED']).optional(),
});

export const createLabOrderSchema = z.object({
  patientId: z.string().trim().min(1),
  testName: z.string().trim().min(1).max(200),
  category: z.string().trim().max(80).optional(),
  priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
  consultationId: z.string().trim().max(80).optional(),
  facilityId: z.string().trim().max(80).optional(),
  labTestId: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateLabOrderSchema = z.object({
  status: z.enum(['SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED']),
});

export const labResultSchema = z.object({
  result: z.string().trim().max(500).optional(),
  unit: z.string().trim().max(40).optional(),
  referenceRange: z.string().trim().max(120).optional(),
  abnormalFlag: z.enum(['NORMAL', 'LOW', 'HIGH', 'CRITICAL']).optional(),
  notes: z.string().trim().max(1000).optional(),
});

// ─── Beds ───────────────────────────────────────────────────────────────────

export const listBedsSchema = paginationSchema.extend({
  facilityId: z.string().trim().max(80).optional(),
  type: z.enum(['GENERAL', 'ICU', 'VENTILATOR', 'PEDIATRIC', 'MATERNITY', 'EMERGENCY']).optional(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE']).optional(),
});

export const createBedSchema = z.object({
  facilityId: z.string().trim().min(1),
  bedNumber: z.string().trim().min(1).max(40),
  ward: z.string().trim().max(80).optional(),
  type: z.enum(['GENERAL', 'ICU', 'VENTILATOR', 'PEDIATRIC', 'MATERNITY', 'EMERGENCY']).default('GENERAL'),
});

export const allocateBedSchema = z.object({
  patientId: z.string().trim().min(1),
  referralId: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const bedStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'RESERVED', 'MAINTENANCE']),
});

// ─── Notifications ──────────────────────────────────────────────────────────

export const listNotificationsSchema = paginationSchema.extend({
  unreadOnly: z.coerce.boolean().default(false),
});
