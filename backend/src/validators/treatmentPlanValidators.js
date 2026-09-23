import { z } from 'zod';
import { dateString, paginationSchema } from './common.js';

export const PLAN_STATUSES = ['ACTIVE', 'REVIEW_REQUIRED', 'COMPLETED', 'CANCELLED'];

export const listPlansSchema = paginationSchema.extend({
  patientId: z.string().trim().min(1).optional(),
  status: z.enum(PLAN_STATUSES).optional(),
  // A query string is text, and z.coerce.boolean() would read "false" as true.
  mine: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

const phaseSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(600).optional(),
  targetDate: dateString.optional(),
});

export const createPlanSchema = z.object({
  patientId: z.string().trim().min(1),
  referralId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(3).max(200),
  specialty: z.string().trim().max(100).optional(),
  directives: z.string().trim().max(2000).optional(),
  startDate: dateString.optional(),
  phases: z.array(phaseSchema).min(1, 'Add at least one phase.').max(12),
});

export const updatePlanSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    specialty: z.string().trim().max(100).optional(),
    directives: z.string().trim().max(2000).optional(),
    status: z.enum(PLAN_STATUSES).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to update.');

export const phaseParamSchema = z.object({
  id: z.string().trim().min(1),
  phaseId: z.string().trim().min(1),
});

export const phaseUpdateSchema = z.object({ completed: z.boolean() });
