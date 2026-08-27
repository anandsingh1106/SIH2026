import { z } from 'zod';
import { dateString, paginationSchema } from './common.js';

// ─── Inventory ──────────────────────────────────────────────────────────────

export const listInventorySchema = paginationSchema.extend({
  facilityId: z.string().trim().max(80).optional(),
  medicineId: z.string().trim().max(80).optional(),
  lowStock: z.coerce.boolean().optional(),
  expiringBefore: dateString.optional(),
});

export const medicineOrderSchema = z.object({
  prescriptionId: z.string().trim().min(1),
  facilityId: z.string().trim().min(1).optional(),
  items: z
    .array(
      z.object({
        medicineName: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(1000),
      })
    )
    .min(1)
    .max(30),
});

export const createInventorySchema = z.object({
  medicineId: z.string().trim().min(1),
  facilityId: z.string().trim().min(1),
  batchNumber: z.string().trim().max(60).optional(),
  expiryDate: dateString.optional(),
  quantity: z.number().int().min(0).max(1_000_000).default(0),
  reorderLevel: z.number().int().min(0).max(100_000).default(0),
  unitPrice: z.number().min(0).max(1_000_000).optional(),
  supplier: z.string().trim().max(160).optional(),
});

export const adjustStockSchema = z.object({
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'EXPIRED']),
  quantity: z.number().int().min(1).max(1_000_000),
  reason: z.string().trim().max(300).optional(),
  referenceId: z.string().trim().max(80).optional(),
});

export const transferStockSchema = z.object({
  medicineId: z.string().trim().min(1),
  fromFacilityId: z.string().trim().min(1),
  toFacilityId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(1_000_000),
  notes: z.string().trim().max(300).optional(),
});

// ─── Messaging ──────────────────────────────────────────────────────────────

export const createConversationSchema = z.object({
  subject: z.string().trim().max(200).optional(),
  patientId: z.string().trim().max(80).optional(),
  memberIds: z.array(z.string().trim().max(80)).max(20).default([]),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

// ─── Sync ───────────────────────────────────────────────────────────────────

export const syncBatchSchema = z.object({
  operations: z.array(z.object({
    operationId: z.string().trim().min(1).max(120),
    entity: z.string().trim().min(1).max(60),
    action: z.enum(['CREATE', 'UPDATE', 'DELETE']),
    payload: z.record(z.string(), z.unknown()).default({}),
    clientTimestamp: z.string().max(40).optional(),
  })).min(1).max(100),
});

// ─── Analytics ──────────────────────────────────────────────────────────────

export const analyticsQuerySchema = z.object({
  district: z.string().trim().max(100).optional(),
  facilityId: z.string().trim().max(80).optional(),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
});

export const heatmapQuerySchema = z.object({
  metric: z.enum(['patients', 'ncd_high_risk', 'maternal_high_risk', 'referrals']).default('patients'),
  district: z.string().trim().max(100).optional(),
});

// ─── Queue ──────────────────────────────────────────────────────────────────

export const issueTokenSchema = z.object({
  facilityId: z.string().trim().min(1),
  patientId: z.string().trim().max(80).optional(),
  doctorId: z.string().trim().max(80).optional(),
  appointmentId: z.string().trim().max(80).optional(),
});

export const queueParamSchema = z.object({ facilityId: z.string().trim().min(1) });
export const tokenParamSchema = z.object({ tokenId: z.string().trim().min(1) });

// ─── AI ─────────────────────────────────────────────────────────────────────

export const triageSchema = z.object({
  symptoms: z.array(z.string().trim().max(200)).max(30).default([]),
  vitals: z.object({
    temperature: z.number().min(25).max(45).optional(),
    bloodPressureSystolic: z.number().int().min(50).max(300).optional(),
    bloodPressureDiastolic: z.number().int().min(20).max(200).optional(),
    heartRate: z.number().int().min(20).max(300).optional(),
    respiratoryRate: z.number().int().min(4).max(80).optional(),
    oxygenSaturation: z.number().int().min(50).max(100).optional(),
  }).default({}),
  age: z.number().int().min(0).max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const assistantSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  context: z.string().trim().max(4000).optional(),
});

export const drugInteractionSchema = z.object({
  medicines: z.array(z.string().trim().min(1).max(200)).min(1).max(30),
});

// ─── Audit ──────────────────────────────────────────────────────────────────

export const listAuditSchema = paginationSchema.extend({
  actorId: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(60).optional(),
  action: z.string().trim().max(80).optional(),
});
