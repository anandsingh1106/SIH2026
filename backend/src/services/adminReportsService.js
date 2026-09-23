import { getDb } from '../db/connection.js';
import { recordAudit } from './auditService.js';
import { villageHotspots } from './analyticsService.js';
import { AuthorizationError, NotFoundError } from '../utils/errors.js';

const PENDING_REFERRAL = "('SENT','ACCEPTED','IN_TRANSIT','ARRIVED','IN_CONSULTATION')";
const pct = (part, whole) => (whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : 0);

function assertAdmin(user) {
  if (user.role !== 'ADMIN') {
    throw new AuthorizationError('This view requires an administrator account.');
  }
}

/** Rows of `{ district, ...counts }` keyed by district. */
function byDistrict(db, sql, params = []) {
  return new Map(db.prepare(sql).all(...params).map((r) => [r.district, r]));
}

/**
 * Per-district figures for the district matrix and map. Everything is counted
 * from platform records: patients by their home district, facilities, beds
 * and stock by the facility's district, staff by their facility's district.
 */
export function districtAnalytics(user) {
  assertAdmin(user);
  const db = getDb();

  const patients = byDistrict(db, `
    SELECT district, COUNT(*) AS patients FROM patients WHERE district IS NOT NULL GROUP BY district`);
  const facilities = byDistrict(db, `
    SELECT district, COUNT(*) AS total,
      SUM(type = 'SUB_CENTER') AS subCenters, SUM(type = 'PHC') AS phcs, SUM(type = 'CHC') AS chcs,
      SUM(type IN ('DISTRICT_HOSPITAL','SPECIALIST_HOSPITAL','MEDICAL_COLLEGE')) AS hospitals,
      SUM(emergency_available) AS emergencyReady
    FROM facilities WHERE active = 1 GROUP BY district`);
  const staff = byDistrict(db, `
    SELECT COALESCE(f.district, u.district) AS district,
      SUM(u.role = 'ASHA') AS ashaWorkers, SUM(u.role IN ('DOCTOR','SPECIALIST')) AS doctors
    FROM users u LEFT JOIN facilities f ON f.id = u.facility_id
    WHERE u.status = 'ACTIVE' AND u.role IN ('ASHA','DOCTOR','SPECIALIST')
    GROUP BY COALESCE(f.district, u.district)`);
  const beds = byDistrict(db, `
    SELECT f.district, COUNT(*) AS total, SUM(b.status = 'OCCUPIED') AS occupied
    FROM beds b JOIN facilities f ON f.id = b.facility_id WHERE f.active = 1 GROUP BY f.district`);
  const stock = byDistrict(db, `
    SELECT f.district, COUNT(*) AS lines, SUM(i.quantity > i.reorder_level) AS healthy, SUM(i.quantity = 0) AS stockedOut
    FROM inventory i JOIN facilities f ON f.id = i.facility_id GROUP BY f.district`);
  const referrals = byDistrict(db, `
    SELECT p.district, COUNT(*) AS total,
      SUM(r.status = 'COMPLETED') AS completed,
      SUM(r.status IN ${PENDING_REFERRAL}) AS pending,
      SUM(r.urgency = 'EMERGENCY') AS emergency,
      AVG(CASE WHEN r.accepted_at >= r.created_at
        THEN (julianday(r.accepted_at) - julianday(r.created_at)) * 24 END) AS acceptHours
    FROM referrals r JOIN patients p ON p.id = r.patient_id WHERE p.district IS NOT NULL GROUP BY p.district`);
  const clinical = byDistrict(db, `
    SELECT p.district,
      (SELECT COUNT(*) FROM consultations c JOIN patients p2 ON p2.id = c.patient_id WHERE p2.district = p.district) AS consultations,
      (SELECT COUNT(*) FROM consultations c JOIN patients p2 ON p2.id = c.patient_id
         WHERE p2.district = p.district AND c.is_telemedicine = 1) AS teleconsultations,
      (SELECT COUNT(*) FROM home_visits h JOIN patients p2 ON p2.id = h.patient_id WHERE p2.district = p.district) AS homeVisits,
      (SELECT COUNT(*) FROM maternal_records m JOIN patients p2 ON p2.id = m.patient_id
         WHERE p2.district = p.district AND m.high_risk = 1 AND COALESCE(m.outcome, 'ONGOING') = 'ONGOING') AS highRiskMaternal,
      (SELECT COUNT(DISTINCT n.patient_id) FROM ncd_screenings n JOIN patients p2 ON p2.id = n.patient_id
         WHERE p2.district = p.district AND n.risk_category = 'HIGH') AS ncdHighRisk,
      (SELECT COUNT(*) FROM vaccinations v JOIN patients p2 ON p2.id = v.patient_id
         WHERE p2.district = p.district AND v.status = 'GIVEN') AS vaccinesGiven,
      (SELECT COUNT(*) FROM vaccinations v JOIN patients p2 ON p2.id = v.patient_id
         WHERE p2.district = p.district AND v.status IN ('DUE','OVERDUE')) AS vaccinesDue
    FROM patients p WHERE p.district IS NOT NULL GROUP BY p.district`);
  const destinations = db.prepare(`
    SELECT p.district, COALESCE(f.name, 'Not yet assigned') AS facility, COUNT(*) AS count
    FROM referrals r JOIN patients p ON p.id = r.patient_id
    LEFT JOIN facilities f ON f.id = r.destination_facility_id
    WHERE p.district IS NOT NULL
    GROUP BY p.district, facility ORDER BY count DESC
  `).all();

  const names = new Set([...patients.keys(), ...facilities.keys()].filter(Boolean));

  return [...names].map((district) => {
    const f = facilities.get(district) ?? {};
    const b = beds.get(district) ?? {};
    const s = stock.get(district) ?? {};
    const r = referrals.get(district) ?? {};
    const c = clinical.get(district) ?? {};
    const st = staff.get(district) ?? {};
    const vaccineTotal = (c.vaccinesGiven ?? 0) + (c.vaccinesDue ?? 0);
    return {
      district,
      patients: patients.get(district)?.patients ?? 0,
      facilities: {
        total: f.total ?? 0, subCenters: f.subCenters ?? 0, phcs: f.phcs ?? 0, chcs: f.chcs ?? 0,
        hospitals: f.hospitals ?? 0, emergencyReady: f.emergencyReady ?? 0,
      },
      ashaWorkers: st.ashaWorkers ?? 0,
      doctors: st.doctors ?? 0,
      beds: { total: b.total ?? 0, occupied: b.occupied ?? 0, occupancyRate: pct(b.occupied ?? 0, b.total ?? 0) },
      stock: {
        lines: s.lines ?? 0, stockedOut: s.stockedOut ?? 0,
        // Share of stock lines above their reorder level; null when nothing is stocked.
        availabilityRate: s.lines ? pct(s.healthy ?? 0, s.lines) : null,
      },
      referrals: {
        total: r.total ?? 0, completed: r.completed ?? 0, pending: r.pending ?? 0, emergency: r.emergency ?? 0,
        avgAcceptHours: r.acceptHours == null ? null : Number(r.acceptHours.toFixed(1)),
        topDestinations: destinations
          .filter((d) => d.district === district)
          .slice(0, 3)
          .map((d) => ({ facility: d.facility, count: d.count, share: pct(d.count, r.total ?? 0) })),
      },
      consultations: c.consultations ?? 0,
      teleconsultations: c.teleconsultations ?? 0,
      homeVisits: c.homeVisits ?? 0,
      highRiskMaternal: c.highRiskMaternal ?? 0,
      ncdHighRisk: c.ncdHighRisk ?? 0,
      immunization: {
        given: c.vaccinesGiven ?? 0, due: c.vaccinesDue ?? 0, coverageRate: pct(c.vaccinesGiven ?? 0, vaccineTotal),
      },
    };
  }).sort((a, b) => b.patients - a.patients || a.district.localeCompare(b.district));
}

/**
 * Signals worth an administrator's attention, each computed by a fixed rule
 * from current records. No model and no confidence score: every signal lists
 * the counts it was raised from, so it can be checked.
 */
export function healthSignals(user) {
  assertAdmin(user);
  const db = getDb();
  const signals = [];
  const today = new Date().toISOString().slice(0, 10);
  const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

  // Emergency referrals nobody has accepted yet.
  const waiting = db.prepare(`
    SELECT COUNT(*) AS c, MIN(r.created_at) AS oldest, GROUP_CONCAT(DISTINCT COALESCE(f.name, 'unassigned')) AS dest
    FROM referrals r LEFT JOIN facilities f ON f.id = r.destination_facility_id
    WHERE r.urgency = 'EMERGENCY' AND r.status = 'SENT'
  `).get();
  if (waiting.c > 0) {
    const hours = Math.max(0, Math.round((Date.now() - new Date(waiting.oldest).getTime()) / 3600000));
    signals.push({
      id: 'referrals:emergency-waiting', category: 'Referral Delay', severity: 'critical',
      title: `${waiting.c} emergency ${waiting.c === 1 ? 'referral is' : 'referrals are'} waiting for acceptance`,
      location: waiting.dest,
      evidence: `The oldest has waited about ${hours} ${hours === 1 ? 'hour' : 'hours'} with status SENT.`,
      recommendedAction: 'Call the receiving facility to accept or redirect the patient, and confirm 108 transport.',
      link: '/admin/dashboard', count: waiting.c,
    });
  }

  // Severe anaemia in an ongoing pregnancy.
  const anaemia = db.prepare(`
    SELECT COUNT(DISTINCT m.id) AS c, GROUP_CONCAT(DISTINCT p.village) AS villages
    FROM anc_visits a JOIN maternal_records m ON m.id = a.maternal_record_id JOIN patients p ON p.id = m.patient_id
    WHERE a.hemoglobin IS NOT NULL AND a.hemoglobin < 7 AND COALESCE(m.outcome, 'ONGOING') = 'ONGOING'
  `).get();
  if (anaemia.c > 0) {
    signals.push({
      id: 'maternal:severe-anaemia', category: 'Maternal Risk', severity: 'critical',
      title: `${anaemia.c} ${anaemia.c === 1 ? 'pregnancy has' : 'pregnancies have'} haemoglobin below 7 g/dL`,
      location: anaemia.villages || 'Village not recorded',
      evidence: 'Severe anaemia recorded at an ANC visit in a pregnancy that is still ongoing.',
      recommendedAction: 'Refer for parenteral iron or transfusion assessment at the FRU and recheck Hb within two weeks.',
      link: '/admin/heatmaps', count: anaemia.c,
    });
  }

  // High-risk pregnancies close to their due date.
  const dueSoon = db.prepare(`
    SELECT COUNT(*) AS c, GROUP_CONCAT(DISTINCT p.village) AS villages
    FROM maternal_records m JOIN patients p ON p.id = m.patient_id
    WHERE m.high_risk = 1 AND COALESCE(m.outcome, 'ONGOING') = 'ONGOING'
      AND m.edd_date IS NOT NULL AND m.edd_date BETWEEN ? AND ?
  `).get(today, inDays(30));
  if (dueSoon.c > 0) {
    signals.push({
      id: 'maternal:high-risk-due', category: 'Maternal Risk', severity: 'high',
      title: `${dueSoon.c} high-risk ${dueSoon.c === 1 ? 'pregnancy is' : 'pregnancies are'} due within 30 days`,
      location: dueSoon.villages || 'Village not recorded',
      evidence: 'Flagged high risk, delivery date within the next 30 days, outcome not yet recorded.',
      recommendedAction: 'Confirm a birth plan at a CHC or higher facility and pre-book JSSK transport.',
      link: '/admin/heatmaps', count: dueSoon.c,
    });
  }

  // Stock at or below its reorder level, one signal per facility.
  const lowStock = db.prepare(`
    SELECT f.name AS facility, COUNT(*) AS c, SUM(i.quantity = 0) AS out,
      GROUP_CONCAT(m.name || ' (' || i.quantity || ')', ', ') AS items
    FROM inventory i JOIN facilities f ON f.id = i.facility_id JOIN medicines m ON m.id = i.medicine_id
    WHERE i.quantity <= i.reorder_level GROUP BY f.id ORDER BY out DESC, c DESC
  `).all();
  for (const row of lowStock) {
    signals.push({
      id: `stock:${row.facility}`, category: 'Supply Chain', severity: row.out > 0 ? 'critical' : 'high',
      title: `${row.c} ${row.c === 1 ? 'medicine is' : 'medicines are'} at or below reorder level`,
      location: row.facility,
      evidence: `Units left: ${row.items}.`,
      recommendedAction: 'Raise an indent to the district warehouse, or transfer stock from a nearby facility.',
      link: '/admin/inventory', count: row.c,
    });
  }

  // Batches expiring soon.
  const expiring = db.prepare(`
    SELECT f.name AS facility, COUNT(*) AS c, SUM(i.quantity) AS units, MIN(i.expiry_date) AS first
    FROM inventory i JOIN facilities f ON f.id = i.facility_id
    WHERE i.expiry_date IS NOT NULL AND i.expiry_date <= ? AND i.quantity > 0 GROUP BY f.id
  `).all(inDays(60));
  for (const row of expiring) {
    signals.push({
      id: `expiry:${row.facility}`, category: 'Supply Chain', severity: row.first <= today ? 'high' : 'moderate',
      title: `${row.c} ${row.c === 1 ? 'batch expires' : 'batches expire'} within 60 days`,
      location: row.facility,
      evidence: `${row.units} units in total; the first expires on ${row.first}.`,
      recommendedAction: 'Dispense these batches first or return them to the warehouse before expiry.',
      link: '/admin/inventory', count: row.c,
    });
  }

  // Wards running out of free beds.
  const pressure = db.prepare(`
    SELECT f.name AS facility, COUNT(*) AS total, SUM(b.status = 'OCCUPIED') AS occupied
    FROM beds b JOIN facilities f ON f.id = b.facility_id WHERE f.active = 1
    GROUP BY f.id HAVING total >= 4 AND occupied * 1.0 / total >= 0.8
  `).all();
  for (const row of pressure) {
    signals.push({
      id: `beds:${row.facility}`, category: 'Bed Capacity', severity: row.occupied === row.total ? 'critical' : 'high',
      title: `Bed occupancy at ${pct(row.occupied, row.total)}%`,
      location: row.facility,
      evidence: `${row.occupied} of ${row.total} beds occupied.`,
      recommendedAction: 'Route new non-critical referrals to the next facility with free beds and review discharges.',
      link: '/admin/facilities', count: row.occupied,
    });
  }

  // Villages with several overdue vaccine doses.
  const overdue = db.prepare(`
    SELECT p.village, p.taluka, COUNT(*) AS c FROM vaccinations v JOIN patients p ON p.id = v.patient_id
    WHERE v.status = 'OVERDUE' AND p.village IS NOT NULL GROUP BY p.village, p.taluka HAVING c >= 2 ORDER BY c DESC LIMIT 3
  `).all();
  for (const row of overdue) {
    signals.push({
      id: `vaccines:${row.village}`, category: 'Immunization', severity: row.c >= 4 ? 'high' : 'moderate',
      title: `${row.c} vaccine doses overdue`,
      location: [row.village, row.taluka].filter(Boolean).join(', '),
      evidence: `${row.c} scheduled doses in this village are past their due date.`,
      recommendedAction: 'Ask the ASHA to line these children up for the next Village Health and Nutrition Day.',
      link: '/admin/heatmaps', count: row.c,
    });
  }

  // High-risk NCD screens with no consultation since.
  const unseen = db.prepare(`
    SELECT COUNT(DISTINCT n.patient_id) AS c FROM ncd_screenings n
    WHERE n.risk_category = 'HIGH' AND n.referral_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM consultations c WHERE c.patient_id = n.patient_id AND substr(c.created_at, 1, 10) >= n.screening_date)
  `).get();
  if (unseen.c > 0) {
    signals.push({
      id: 'ncd:unseen', category: 'NCD Follow-up', severity: unseen.c >= 5 ? 'high' : 'moderate',
      title: `${unseen.c} high-risk NCD ${unseen.c === 1 ? 'screen has' : 'screens have'} not been seen by a doctor`,
      location: 'All districts',
      evidence: 'CBAC high risk, not referred, and no consultation recorded since the screening date.',
      recommendedAction: 'Schedule a PHC visit for confirmation of diabetes or hypertension and start treatment.',
      link: '/admin/heatmaps', count: unseen.c,
    });
  }

  const RANK = { critical: 0, high: 1, moderate: 2 };
  return {
    generatedAt: new Date().toISOString(),
    signals: signals.sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.count - a.count),
    hotspots: villageHotspots(db, 5),
  };
}

// ─── Report exports ─────────────────────────────────────────────────────────

export const REPORT_CATALOGUE = [
  { type: 'maternal-child', category: 'HMIS', title: 'Maternal and child health summary by district',
    description: 'Pregnancies registered, high risk, ANC visits, severe anaemia and vaccine doses given and due.' },
  { type: 'ncd', category: 'NCD', title: 'NCD screening outcomes by district',
    description: 'CBAC screenings by risk category, suspected diabetes and hypertension, and referrals made.' },
  { type: 'immunization', category: 'Immunization', title: 'Immunization coverage by vaccine',
    description: 'Doses given, due and overdue for each vaccine and dose, with coverage.' },
  { type: 'referrals', category: 'Referrals', title: 'Referral register',
    description: 'Every referral with urgency, status, facilities and time to acceptance. No patient names.' },
  { type: 'inventory', category: 'Supply', title: 'Medicine stock status',
    description: 'Stock on hand by facility and batch against reorder level and expiry.' },
  { type: 'facilities', category: 'Infrastructure', title: 'Facility readiness',
    description: 'Each facility with beds, free beds, doctors, ASHA workers and emergency readiness.' },
];

// node:sqlite returns rows as objects keyed by column, in select order, so each
// row is flattened with Object.values. Two columns with the same name (f.name
// and m.name) would collapse into one key, so such columns carry an alias.
const REPORT_BUILDERS = {
  'maternal-child': (db) => ({
    columns: ['District', 'Pregnancies registered', 'High risk', 'ANC visits', 'Severe anaemia (Hb < 7)',
      'Vaccine doses given', 'Vaccine doses due or overdue'],
    rows: db.prepare(`
      SELECT p.district,
        COUNT(DISTINCT m.id),
        COUNT(DISTINCT CASE WHEN m.high_risk = 1 THEN m.id END),
        (SELECT COUNT(*) FROM anc_visits a JOIN maternal_records m2 ON m2.id = a.maternal_record_id
           JOIN patients p2 ON p2.id = m2.patient_id WHERE p2.district = p.district),
        (SELECT COUNT(DISTINCT m2.id) FROM anc_visits a JOIN maternal_records m2 ON m2.id = a.maternal_record_id
           JOIN patients p2 ON p2.id = m2.patient_id WHERE p2.district = p.district AND a.hemoglobin < 7),
        (SELECT COUNT(*) FROM vaccinations v JOIN patients p2 ON p2.id = v.patient_id
           WHERE p2.district = p.district AND v.status = 'GIVEN'),
        (SELECT COUNT(*) FROM vaccinations v JOIN patients p2 ON p2.id = v.patient_id
           WHERE p2.district = p.district AND v.status IN ('DUE','OVERDUE'))
      FROM patients p LEFT JOIN maternal_records m ON m.patient_id = p.id
      WHERE p.district IS NOT NULL GROUP BY p.district ORDER BY p.district
    `).all().map(Object.values),
  }),
  ncd: (db) => ({
    columns: ['District', 'Screenings', 'Low risk', 'Moderate risk', 'High risk',
      'Suspected diabetes', 'Suspected hypertension', 'Referred'],
    rows: db.prepare(`
      SELECT p.district, COUNT(*), SUM(n.risk_category = 'LOW'), SUM(n.risk_category = 'MODERATE'),
        SUM(n.risk_category = 'HIGH'), SUM(n.suspected_diabetes), SUM(n.suspected_hypertension),
        SUM(n.referral_id IS NOT NULL)
      FROM ncd_screenings n JOIN patients p ON p.id = n.patient_id
      WHERE p.district IS NOT NULL GROUP BY p.district ORDER BY p.district
    `).all().map(Object.values),
  }),
  immunization: (db) => ({
    columns: ['Vaccine', 'Dose', 'Given', 'Due', 'Overdue', 'Coverage %'],
    rows: db.prepare(`
      SELECT vaccine_name, COALESCE(dose, ''), SUM(status = 'GIVEN'), SUM(status = 'DUE'), SUM(status = 'OVERDUE'),
        ROUND(100.0 * SUM(status = 'GIVEN') / NULLIF(SUM(status IN ('GIVEN','DUE','OVERDUE')), 0), 1)
      FROM vaccinations GROUP BY vaccine_name, dose ORDER BY vaccine_name, dose
    `).all().map(Object.values),
  }),
  referrals: (db) => ({
    columns: ['Referral code', 'Created', 'Patient district', 'Specialty', 'Urgency', 'Status',
      'From facility', 'To facility', 'Accepted', 'Completed', 'Hours to accept'],
    rows: db.prepare(`
      SELECT r.referral_code, substr(r.created_at, 1, 10), COALESCE(p.district, ''), COALESCE(r.specialty, ''),
        r.urgency, r.status, COALESCE(sf.name, ''), COALESCE(df.name, ''),
        COALESCE(substr(r.accepted_at, 1, 16), ''), COALESCE(substr(r.completed_at, 1, 16), ''),
        CASE WHEN r.accepted_at >= r.created_at
          THEN ROUND((julianday(r.accepted_at) - julianday(r.created_at)) * 24, 1) ELSE '' END
      FROM referrals r JOIN patients p ON p.id = r.patient_id
      LEFT JOIN facilities sf ON sf.id = r.source_facility_id
      LEFT JOIN facilities df ON df.id = r.destination_facility_id
      ORDER BY r.created_at DESC
    `).all().map(Object.values),
  }),
  inventory: (db) => ({
    columns: ['Facility', 'Medicine', 'Strength', 'Batch', 'Expiry', 'Units on hand', 'Reorder level', 'Status'],
    rows: db.prepare(`
      SELECT f.name AS facility, m.name AS medicine, COALESCE(m.strength, ''), COALESCE(i.batch_number, ''), COALESCE(i.expiry_date, ''),
        i.quantity, i.reorder_level,
        CASE WHEN i.quantity = 0 THEN 'Stocked out' WHEN i.quantity <= i.reorder_level THEN 'Reorder' ELSE 'OK' END
      FROM inventory i JOIN facilities f ON f.id = i.facility_id JOIN medicines m ON m.id = i.medicine_id
      ORDER BY f.name, m.name
    `).all().map(Object.values),
  }),
  facilities: (db) => ({
    columns: ['Facility', 'Type', 'District', 'Taluka', 'Beds', 'Beds free', 'Doctors', 'ASHA workers', '24/7 emergency'],
    rows: db.prepare(`
      SELECT f.name, f.type, f.district, COALESCE(f.taluka, ''),
        (SELECT COUNT(*) FROM beds b WHERE b.facility_id = f.id),
        (SELECT COUNT(*) FROM beds b WHERE b.facility_id = f.id AND b.status = 'AVAILABLE'),
        (SELECT COUNT(*) FROM users u WHERE u.facility_id = f.id AND u.status = 'ACTIVE' AND u.role IN ('DOCTOR','SPECIALIST')),
        (SELECT COUNT(*) FROM users u WHERE u.facility_id = f.id AND u.status = 'ACTIVE' AND u.role = 'ASHA'),
        CASE WHEN f.emergency_available = 1 THEN 'Yes' ELSE 'No' END
      FROM facilities f WHERE f.active = 1 ORDER BY f.district, f.name
    `).all().map(Object.values),
  }),
};

export function reportCatalogue(user) {
  assertAdmin(user);
  return REPORT_CATALOGUE;
}

/** Builds one report's table. Exports leave the platform, so each is audited. */
export function buildReport(user, type, requestMeta = {}) {
  assertAdmin(user);
  const entry = REPORT_CATALOGUE.find((r) => r.type === type);
  if (!entry) throw new NotFoundError('Report');

  const db = getDb();
  const { columns, rows } = REPORT_BUILDERS[type](db);
  recordAudit({
    actorId: user.id, action: 'EXPORT_REPORT', entityType: 'report', entityId: type,
    newValues: { rows: rows.length }, ...requestMeta,
  });

  return { ...entry, generatedAt: new Date().toISOString(), columns, rows };
}
