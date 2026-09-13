import { z } from 'zod';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dateString = z.string().regex(DATE_RE, 'must be YYYY-MM-DD');
export const timeString = z.string().regex(TIME_RE, 'must be HH:MM (24-hour)');

export const idParamSchema = z.object({ id: z.string().trim().min(1) });

/**
 * An ABHA identifier, in either form a patient may know it: the 14-digit ABHA
 * number (accepted with the spaces or hyphens it is printed with, stored as
 * bare digits) or an ABHA address such as "ramesh.patil@abdm".
 *
 * Structure only. Whether the identifier exists and belongs to this person is
 * a question only ABDM can answer, through the verification APIs — see
 * services/abha/abdmClient.js. Deliberately no checksum: ABDM does not publish
 * a check digit for the ABHA number, and a guessed one would reject real
 * patients. Mirrors shared/src/utils/abha.ts, which the frontend uses.
 */
export const ABHA_ADDRESS_RE =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{2,}[a-zA-Z0-9])@[a-zA-Z][a-zA-Z0-9]{1,}$/;

export const abhaIdentifier = z
  .string()
  .trim()
  .max(60)
  .transform((value) => (value.includes('@') ? value.toLowerCase() : value.replace(/[\s-]/g, '')))
  .refine(
    (value) => (value.includes('@') ? ABHA_ADDRESS_RE.test(value) : /^\d{14}$/.test(value)),
    'must be a 14-digit ABHA number or an ABHA address such as name@abdm'
  );

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchSchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
});
