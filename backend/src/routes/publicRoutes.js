import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { validate } from '../middleware/validate.js';
import { publicLimiter } from '../config/rateLimits.js';
import { searchSchema } from '../validators/common.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { toPublicFacility } from '../utils/mappers.js';

const router = Router();

// These endpoints are unauthenticated, so they expose directory information
// only — never patient data (§40).
router.use(publicLimiter);

const facilityQuery = searchSchema.extend({
  district: z.string().trim().max(100).optional(),
  type: z.enum(['SUB_CENTER', 'PHC', 'CHC', 'DISTRICT_HOSPITAL', 'SPECIALIST_HOSPITAL', 'MEDICAL_COLLEGE']).optional(),
  emergencyOnly: z.coerce.boolean().optional(),
});

router.get('/facilities', validate({ query: facilityQuery }), (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, search, district, type, emergencyOnly } = req.validatedQuery;

    const where = ['active = 1'];
    const params = [];
    if (search) { where.push('(name LIKE ? OR district LIKE ? OR taluka LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (district) { where.push('district = ?'); params.push(district); }
    if (type) { where.push('type = ?'); params.push(type); }
    if (emergencyOnly) where.push('emergency_available = 1');

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const total = db.prepare(`SELECT COUNT(*) AS c FROM facilities ${whereSql}`).get(...params).c;
    const items = db
      .prepare(`SELECT * FROM facilities ${whereSql} ORDER BY name LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    return sendPaginated(res, items.map(toPublicFacility), { page, limit, total });
  } catch (err) { next(err); }
});

router.get('/medicines', validate({ query: searchSchema }), (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, search } = req.validatedQuery;

    const where = ['active = 1'];
    const params = [];
    if (search) { where.push('(name LIKE ? OR generic_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const total = db.prepare(`SELECT COUNT(*) AS c FROM medicines ${whereSql}`).get(...params).c;
    const items = db
      .prepare(`SELECT id, name, generic_name, strength, dosage_form, category, is_essential
                FROM medicines ${whereSql} ORDER BY name LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    return sendPaginated(res, items.map((m) => ({
      id: m.id, name: m.name, genericName: m.generic_name || undefined,
      strength: m.strength || undefined, dosageForm: m.dosage_form || undefined,
      category: m.category || undefined, isEssential: !!m.is_essential,
    })), { page, limit, total });
  } catch (err) { next(err); }
});

/**
 * Aggregate bed availability by facility — a count, never a patient reference.
 */
router.get('/bed-availability', (req, res, next) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(`
        SELECT f.id AS facility_id, f.name AS facility_name, f.district, b.type,
               COUNT(*) AS total,
               SUM(CASE WHEN b.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available
        FROM beds b JOIN facilities f ON f.id = b.facility_id
        WHERE f.active = 1
        GROUP BY f.id, b.type ORDER BY f.name, b.type
      `)
      .all();

    return sendSuccess(res, rows.map((r) => ({
      facilityId: r.facility_id, facilityName: r.facility_name,
      district: r.district, type: r.type, total: r.total, available: r.available,
    })));
  } catch (err) { next(err); }
});

router.get('/emergency', (_req, res) => {
  // Static public-interest contact information.
  return sendSuccess(res, {
    helplines: [
      { name: 'Ambulance (National Emergency)', number: '108' },
      { name: 'National Emergency Number', number: '112' },
      { name: 'Maternal & Child Health Helpline', number: '104' },
      { name: 'Blood Bank Helpline (Maharashtra)', number: '104' },
      { name: 'COVID / Public Health Helpline', number: '1075' },
    ],
    guidance: [
      'For chest pain, breathing difficulty, severe bleeding, seizures or loss of consciousness, call 108 immediately.',
      'Keep the patient calm and do not give food or water to an unconscious person.',
      'Carry any existing prescriptions and the ABHA ID if available.',
    ],
  });
});

/**
 * Aggregate platform counts for the public landing page.
 *
 * Counts only — no patient-identifiable data, so this is safe to serve
 * unauthenticated (§40).
 */
router.get('/stats', (_req, res, next) => {
  try {
    const db = getDb();
    const count = (sql) => db.prepare(sql).get().c;

    return sendSuccess(res, {
      patients: count('SELECT COUNT(*) c FROM patients'),
      facilities: count('SELECT COUNT(*) c FROM facilities WHERE active = 1'),
      consultations: count('SELECT COUNT(*) c FROM consultations'),
      prescriptions: count('SELECT COUNT(*) c FROM prescriptions'),
      referrals: count('SELECT COUNT(*) c FROM referrals'),
      emergencyReferrals: count("SELECT COUNT(*) c FROM referrals WHERE urgency = 'EMERGENCY'"),
      bedsAvailable: count("SELECT COUNT(*) c FROM beds WHERE status = 'AVAILABLE'"),
      bedsTotal: count('SELECT COUNT(*) c FROM beds'),
      vaccinationsGiven: count("SELECT COUNT(*) c FROM vaccinations WHERE status = 'GIVEN'"),
      screenings: count('SELECT COUNT(*) c FROM ncd_screenings'),
      healthWorkers: count("SELECT COUNT(*) c FROM users WHERE role IN ('ASHA','DOCTOR','SPECIALIST') AND status = 'ACTIVE'"),
      districts: count('SELECT COUNT(DISTINCT district) c FROM facilities WHERE district IS NOT NULL'),
    });
  } catch (err) { next(err); }
});

/**
 * Monthly consultation and referral counts for the landing-page chart.
 *
 * Aggregate counts only, so this is safe to serve unauthenticated. Months with
 * no activity are returned as zero rather than omitted, so the line does not
 * skip gaps.
 */
router.get('/trends', (_req, res, next) => {
  try {
    const db = getDb();

    const months = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        month: d.toLocaleString('en-US', { month: 'short' }),
      });
    }

    const byMonth = (table) =>
      Object.fromEntries(
        db.prepare(
          `SELECT substr(created_at, 1, 7) AS m, COUNT(*) AS c FROM ${table} GROUP BY m`
        ).all().map((r) => [r.m, r.c])
      );

    const consultations = byMonth('consultations');
    const referrals = byMonth('referrals');

    return sendSuccess(res, {
      points: months.map((m) => ({
        month: m.month,
        consultations: consultations[m.key] ?? 0,
        referrals: referrals[m.key] ?? 0,
      })),
    });
  } catch (err) { next(err); }
});

router.get('/health-programs', (_req, res) => {
  return sendSuccess(res, [
    { code: 'JSSK', name: 'Janani Shishu Suraksha Karyakram',
      description: 'Free delivery, caesarean section, drugs, diagnostics, diet and transport for pregnant women and sick newborns in public health facilities.' },
    { code: 'PMSMA', name: 'Pradhan Mantri Surakshit Matritva Abhiyan',
      description: 'Assured, comprehensive and quality antenatal care on the 9th of every month.' },
    { code: 'NPCDCS', name: 'National Programme for Prevention and Control of NCDs',
      description: 'Population-based screening for diabetes, hypertension and common cancers using the CBAC checklist.' },
    { code: 'UIP', name: 'Universal Immunisation Programme',
      description: 'Free vaccination against vaccine-preventable diseases for children and pregnant women.' },
    { code: 'MJPJAY', name: 'Mahatma Jyotirao Phule Jan Arogya Yojana',
      description: 'Cashless tertiary treatment cover for eligible families in Maharashtra.' },
  ]);
});

export default router;
