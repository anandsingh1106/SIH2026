import { z } from 'zod';
import { dateString, searchSchema } from './common.js';

export const listPatientsSchema = searchSchema.extend({
  district: z.string().trim().max(100).optional(),
  taluka: z.string().trim().max(100).optional(),
  village: z.string().trim().max(100).optional(),
  ashaId: z.string().trim().max(80).optional(),
});

export const createPatientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  abhaId: z.string().trim().max(50).optional(),
  dateOfBirth: dateString.optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  district: z.string().trim().max(100).optional(),
  taluka: z.string().trim().max(100).optional(),
  village: z.string().trim().max(100).optional(),
  bloodGroup: z.string().trim().max(10).optional(),
  emergencyContact: z.string().trim().max(160).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
  assignedAshaId: z.string().trim().max(80).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const allergySchema = z.object({
  substance: z.string().trim().min(1).max(160),
  reaction: z.string().trim().max(300).optional(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE']).optional(),
});

export const chronicConditionSchema = z.object({
  condition: z.string().trim().min(1).max(200),
  diagnosedDate: dateString.optional(),
  status: z.enum(['ACTIVE', 'RESOLVED', 'MANAGED']).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const familyMemberSchema = z.object({
  relatedPatientId: z.string().trim().max(80).optional(),
  name: z.string().trim().max(160).optional(),
  relationship: z.string().trim().min(1).max(60),
});
