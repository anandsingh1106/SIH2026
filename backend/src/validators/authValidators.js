import { z } from 'zod';

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
