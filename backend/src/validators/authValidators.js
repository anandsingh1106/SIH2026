import { z } from 'zod';
import { paginationSchema } from './common.js';

// The frontend sends lowercase roles; the database stores them uppercase.
export const apiRoleSchema = z.enum(['patient', 'asha', 'doctor', 'specialist', 'admin']);

export const supabaseLoginSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required.'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120).optional(),
  role: apiRoleSchema.optional(),
  phone: z.string().trim().max(20).optional(),
  district: z.string().trim().max(100).optional(),
  taluka: z.string().trim().max(100).optional(),
  village: z.string().trim().max(100).optional(),
  abhaId: z.string().trim().max(50).optional(),
});

/** Enrolment and step-up both prove themselves with a Supabase access token. */
export const mfaTokenSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required.'),
});

/**
 * Recovery codes are shown grouped (XXXXX-XXXXX) but users retype them in all
 * sorts of ways, so formatting is normalised server-side rather than rejected.
 */
export const mfaRecoverySchema = z.object({
  code: z.string().trim().min(8, 'Enter your full recovery code.').max(32),
});

export const userIdParamSchema = z.object({
  userId: z.string().trim().min(1),
});

// ─── Staff access requests ──────────────────────────────────────────────────

/** Roles a user may request. PATIENT is the default and is never requested. */
export const requestableRoleSchema = z.enum(['ASHA', 'DOCTOR', 'SPECIALIST', 'ADMIN']);

export const staffRequestSchema = z.object({
  requestedRole: requestableRoleSchema,
  // Recorded for the reviewer to check against the official register. Not
  // mandatory: a reviewer may know the applicant, and forcing the field would
  // only teach people to type nonsense into it.
  registrationNumber: z.string().trim().max(60).optional(),
  facilityName: z.string().trim().max(150).optional(),
  designation: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

export const reviewRequestSchema = z.object({
  reviewNote: z.string().trim().max(500).optional(),
  facilityId: z.string().trim().max(60).optional(),
});

export const listRequestsSchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'ALL']).default('PENDING'),
});

export const setRoleSchema = z.object({
  role: z.enum(['PATIENT', 'ASHA', 'DOCTOR', 'SPECIALIST', 'ADMIN']),
});
