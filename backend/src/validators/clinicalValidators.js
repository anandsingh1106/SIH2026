import { z } from 'zod';
import { dateString, paginationSchema, searchSchema } from './common.js';

export const listConsultationsSchema = paginationSchema.extend({
  patientId: z.string().trim().max(80).optional(),
  doctorId: z.string().trim().max(80).optional(),
  facilityId: z.string().trim().max(80).optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

export const createConsultationSchema = z.object({
  patientId: z.string().trim().min(1),
  appointmentId: z.string().trim().max(80).optional(),
  facilityId: z.string().trim().max(80).optional(),
  chiefComplaint: z.string().trim().max(500).optional(),
  symptoms: z.array(z.string().trim().max(120)).max(40).optional(),
  examination: z.string().trim().max(2000).optional(),
  diagnosis: z.string().trim().max(500).optional(),
  icdCode: z.string().trim().max(20).optional(),
  clinicalNotes: z.string().trim().max(4000).optional(),
  treatmentPlan: z.string().trim().max(2000).optional(),
  followUpDate: dateString.optional(),
  isTelemedicine: z.boolean().optional(),
});

export const updateConsultationSchema = createConsultationSchema
  .omit({ patientId: true, appointmentId: true })
  .partial()
  .extend({ status: z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional() });

export const vitalsSchema = z.object({
  // Ranges are deliberately wide — they reject impossible data entry, not
  // clinically unusual values.
  temperature: z.number().min(25).max(45).optional(),
  bloodPressureSystolic: z.number().int().min(50).max(300).optional(),
  bloodPressureDiastolic: z.number().int().min(20).max(200).optional(),
  heartRate: z.number().int().min(20).max(300).optional(),
  respiratoryRate: z.number().int().min(4).max(80).optional(),
  oxygenSaturation: z.number().int().min(50).max(100).optional(),
  weight: z.number().min(0.5).max(400).optional(),
  height: z.number().min(20).max(260).optional(),
  bloodGlucose: z.number().min(10).max(900).optional(),
  hemoglobin: z.number().min(1).max(25).optional(),
  notes: z.string().trim().max(500).optional(),
  consultationId: z.string().trim().max(80).optional(),
  facilityId: z.string().trim().max(80).optional(),
  recordedAt: z.string().max(40).optional(),
});

export const listVitalsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const prescriptionItemSchema = z.object({
  medicineId: z.string().trim().max(80).optional(),
  medicineName: z.string().trim().min(1).max(200),
  dosage: z.string().trim().max(80).optional(),
  frequency: z.string().trim().max(80).optional(),
  duration: z.string().trim().max(80).optional(),
  route: z.string().trim().max(40).optional(),
  timing: z.array(z.string().trim().max(30)).max(6).optional(),
  quantity: z.number().int().min(1).max(1000).optional(),
  instructions: z.string().trim().max(500).optional(),
  instructionsMr: z.string().trim().max(500).optional(),
  instructionsHi: z.string().trim().max(500).optional(),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().trim().min(1),
  consultationId: z.string().trim().max(80).optional(),
  facilityId: z.string().trim().max(80).optional(),
  diagnosis: z.string().trim().max(500).optional(),
  instructions: z.string().trim().max(2000).optional(),
  dietaryInstructions: z.string().trim().max(1000).optional(),
  followUpDate: dateString.optional(),
  items: z.array(prescriptionItemSchema).min(1, 'At least one medicine is required.').max(30),
});

export const listPrescriptionsSchema = paginationSchema.extend({
  patientId: z.string().trim().max(80).optional(),
  doctorId: z.string().trim().max(80).optional(),
  status: z.enum(['ACTIVE', 'DISPENSED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const updatePrescriptionSchema = z.object({
  status: z.enum(['ACTIVE', 'DISPENSED', 'COMPLETED', 'CANCELLED']),
});

export const listMedicinesSchema = searchSchema.extend({
  category: z.string().trim().max(80).optional(),
});

export const createMedicineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  genericName: z.string().trim().max(200).optional(),
  strength: z.string().trim().max(60).optional(),
  dosageForm: z.string().trim().max(60).optional(),
  manufacturer: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  isEssential: z.boolean().optional(),
});
