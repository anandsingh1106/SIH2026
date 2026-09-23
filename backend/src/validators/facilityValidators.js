import { z } from 'zod';
import { searchSchema } from './common.js';

export const FACILITY_TYPES = [
  'SUB_CENTER', 'PHC', 'CHC', 'DISTRICT_HOSPITAL', 'SPECIALIST_HOSPITAL', 'MEDICAL_COLLEGE',
];

const optionalText = (max) => z.string().trim().max(max).optional();

export const listFacilitiesSchema = searchSchema.extend({
  district: optionalText(100),
  type: z.enum(FACILITY_TYPES).optional(),
  // A query string is text, and z.coerce.boolean() would read "false" as true.
  includeInactive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const facilityFields = {
  name: z.string().trim().min(3).max(160),
  type: z.enum(FACILITY_TYPES),
  address: optionalText(300),
  district: z.string().trim().min(2).max(100),
  taluka: optionalText(100),
  village: optionalText(100),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{6,20}$/, 'must be a phone number').optional().or(z.literal('')),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  emergencyAvailable: z.boolean().optional(),
};

export const createFacilitySchema = z.object(facilityFields);

export const updateFacilitySchema = z
  .object({
    ...Object.fromEntries(Object.entries(facilityFields).map(([k, v]) => [k, v.optional()])),
    active: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to update.');
