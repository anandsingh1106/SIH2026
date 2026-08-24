import { z } from 'zod';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dateString = z.string().regex(DATE_RE, 'must be YYYY-MM-DD');
export const timeString = z.string().regex(TIME_RE, 'must be HH:MM (24-hour)');

export const idParamSchema = z.object({ id: z.string().trim().min(1) });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchSchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
});
