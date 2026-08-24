import { z } from 'zod';
import { dateString, paginationSchema } from './common.js';

export const listHomeVisitsSchema = paginationSchema.extend({
  patientId: z.string().trim().max(80).optional(),
  ashaId: z.string().trim().max(80).optional(),
});

export const createHomeVisitSchema = z.object({
  patientId: z.string().trim().min(1),
  visitDate: dateString,
  householdId: z.string().trim().max(80).optional(),
  purpose: z.string().trim().max(200).optional(),
  observations: z.string().trim().max(2000).optional(),
  symptoms: z.array(z.string().trim().max(120)).max(30).optional(),
  dangerSigns: z.array(z.string().trim().max(120)).max(30).optional(),
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
  referralRecommended: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
  nextVisitDate: dateString.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const listTasksSchema = paginationSchema.extend({
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().trim().max(80).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  assignedTo: z.string().trim().max(80).optional(),
  patientId: z.string().trim().max(80).optional(),
  facilityId: z.string().trim().max(80).optional(),
  type: z.string().trim().max(60).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: dateString.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: dateString.optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

export const listVaccinationsSchema = paginationSchema.extend({
  patientId: z.string().trim().max(80).optional(),
  status: z.enum(['DUE', 'GIVEN', 'OVERDUE', 'SKIPPED']).optional(),
  dueBefore: dateString.optional(),
});

export const scheduleVaccinationSchema = z.object({
  patientId: z.string().trim().min(1),
  vaccineName: z.string().trim().min(1).max(120),
  dose: z.string().trim().max(40).optional(),
  scheduledDate: dateString.optional(),
  notes: z.string().trim().max(500).optional(),
});

export const administerVaccinationSchema = z.object({
  administeredDate: dateString.optional(),
  batchNumber: z.string().trim().max(60).optional(),
  facilityId: z.string().trim().max(80).optional(),
});

export const listMaternalSchema = paginationSchema.extend({
  patientId: z.string().trim().max(80).optional(),
  highRisk: z.coerce.boolean().optional(),
});

export const createMaternalSchema = z.object({
  patientId: z.string().trim().min(1),
  lmpDate: dateString.optional(),
  eddDate: dateString.optional(),
  gravida: z.number().int().min(0).max(20).optional(),
  parity: z.number().int().min(0).max(20).optional(),
  highRisk: z.boolean().optional(),
  riskFactors: z.array(z.string().trim().max(120)).max(20).optional(),
  jsskRegistered: z.boolean().optional(),
  pmsmaRegistered: z.boolean().optional(),
});

export const ancVisitSchema = z.object({
  visitDate: dateString,
  visitNumber: z.number().int().min(1).max(20).optional(),
  weight: z.number().min(20).max(200).optional(),
  bloodPressureSystolic: z.number().int().min(50).max(300).optional(),
  bloodPressureDiastolic: z.number().int().min(20).max(200).optional(),
  hemoglobin: z.number().min(1).max(25).optional(),
  fundalHeight: z.string().trim().max(40).optional(),
  fetalHeartRate: z.number().int().min(60).max(220).optional(),
  tetanusGiven: z.boolean().optional(),
  ifaTabletsGiven: z.number().int().min(0).max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const listNcdSchema = paginationSchema.extend({
  patientId: z.string().trim().max(80).optional(),
  riskCategory: z.enum(['LOW', 'MODERATE', 'HIGH']).optional(),
});

export const createNcdSchema = z.object({
  patientId: z.string().trim().min(1),
  screeningDate: dateString.optional(),
  age: z.number().int().min(0).max(120).optional(),
  bloodPressureSystolic: z.number().int().min(50).max(300).optional(),
  bloodPressureDiastolic: z.number().int().min(20).max(200).optional(),
  bloodGlucose: z.number().min(10).max(900).optional(),
  bmi: z.number().min(5).max(80).optional(),
  waistCircumference: z.number().min(30).max(200).optional(),
  tobaccoUse: z.boolean().optional(),
  alcoholUse: z.boolean().optional(),
  physicalActivityAdequate: z.boolean().optional(),
  familyHistory: z.boolean().optional(),
  facilityId: z.string().trim().max(80).optional(),
});
