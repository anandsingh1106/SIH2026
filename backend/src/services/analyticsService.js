import { getDb } from '../db/connection.js';
import { accessiblePatientIds } from './accessControlService.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { AuthorizationError } from '../utils/errors.js';

const count = (db, sql, params = []) => db.prepare(sql).get(...params)?.c ?? 0;

/** Aggregate counts small enough to identify individuals are suppressed (§35). */
const MIN_CELL_SIZE = 1;

export function patientAnalytics(user) {
  const db = getDb();
  const self = patientRepository.findByUserId(user.id, db);
  if (!self) {
    return { appointments: 0, prescriptions: 0, labOrders: 0, vaccinationsDue: 0, referrals: 0 };
  }

  return {
    appointments: count(db, "SELECT COUNT(*) c FROM appointments WHERE patient_id = ? AND status NOT IN ('CANCELLED','NO_SHOW')", [self.id]),
    upcomingAppointments: count(db, "SELECT COUNT(*) c FROM appointments WHERE patient_id = ? AND status IN ('BOOKED','CONFIRMED')", [self.id]),
    prescriptions: count(db, 'SELECT COUNT(*) c FROM prescriptions WHERE patient_id = ?', [self.id]),
    labOrders: count(db, 'SELECT COUNT(*) c FROM lab_orders WHERE patient_id = ?', [self.id]),
    pendingLabResults: count(db, "SELECT COUNT(*) c FROM lab_orders WHERE patient_id = ? AND status != 'COMPLETED'", [self.id]),
    vaccinationsDue: count(db, "SELECT COUNT(*) c FROM vaccinations WHERE patient_id = ? AND status IN ('DUE','OVERDUE')", [self.id]),
    referrals: count(db, 'SELECT COUNT(*) c FROM referrals WHERE patient_id = ?', [self.id]),
  };
}

export function ashaAnalytics(user) {
  const db = getDb();
  const patientIds = patientRepository.idsForAsha(user.id, db);
  const placeholders = patientIds.length ? patientIds.map(() => '?').join(',') : "''";

  return {
    assignedPatients: patientIds.length,
    tasksOpen: count(db, "SELECT COUNT(*) c FROM tasks WHERE assigned_to = ? AND status IN ('TODO','IN_PROGRESS')", [user.id]),
    tasksCompleted: count(db, "SELECT COUNT(*) c FROM tasks WHERE assigned_to = ? AND status = 'COMPLETED'", [user.id]),
    homeVisits: count(db, 'SELECT COUNT(*) c FROM home_visits WHERE asha_id = ?', [user.id]),
    highRiskMaternal: count(db, 'SELECT COUNT(*) c FROM maternal_records WHERE asha_id = ? AND high_risk = 1', [user.id]),
    vaccinationsDue: patientIds.length
      ? count(db, `SELECT COUNT(*) c FROM vaccinations WHERE status IN ('DUE','OVERDUE') AND patient_id IN (${placeholders})`, patientIds)
      : 0,
    ncdHighRisk: patientIds.length
      ? count(db, `SELECT COUNT(*) c FROM ncd_screenings WHERE risk_category = 'HIGH' AND patient_id IN (${placeholders})`, patientIds)
      : 0,
  };
}

export function doctorAnalytics(user) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  return {
    todaysAppointments: count(db, "SELECT COUNT(*) c FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('CANCELLED','NO_SHOW')", [user.id, today]),
    consultations: count(db, 'SELECT COUNT(*) c FROM consultations WHERE doctor_id = ?', [user.id]),
    prescriptionsIssued: count(db, 'SELECT COUNT(*) c FROM prescriptions WHERE doctor_id = ?', [user.id]),
    pendingLabResults: count(db, "SELECT COUNT(*) c FROM lab_orders WHERE doctor_id = ? AND status != 'COMPLETED'", [user.id]),
    referralsMade: count(db, 'SELECT COUNT(*) c FROM referrals WHERE referred_by = ?', [user.id]),
    openTasks: count(db, "SELECT COUNT(*) c FROM tasks WHERE assigned_to = ? AND status IN ('TODO','IN_PROGRESS')", [user.id]),
  };
}

export function specialistAnalytics(user) {
  const db = getDb();
  const facilityId = user.facility_id;

  return {
    incomingReferrals: facilityId
      ? count(db, "SELECT COUNT(*) c FROM referrals WHERE destination_facility_id = ? AND status = 'SENT'", [facilityId])
      : 0,
    acceptedReferrals: count(db, "SELECT COUNT(*) c FROM referrals WHERE referred_to = ? AND status NOT IN ('COMPLETED','CANCELLED','REJECTED')", [user.id]),
    completedReferrals: count(db, "SELECT COUNT(*) c FROM referrals WHERE referred_to = ? AND status = 'COMPLETED'", [user.id]),
    consultations: count(db, 'SELECT COUNT(*) c FROM consultations WHERE doctor_id = ?', [user.id]),
    bedsOccupied: facilityId
      ? count(db, "SELECT COUNT(*) c FROM beds WHERE facility_id = ? AND status = 'OCCUPIED'", [facilityId])
      : 0,
    bedsAvailable: facilityId
      ? count(db, "SELECT COUNT(*) c FROM beds WHERE facility_id = ? AND status = 'AVAILABLE'", [facilityId])
      : 0,
  };
}

export function adminAnalytics(user, { district, facilityId, from, to } = {}) {
  if (user.role !== 'ADMIN') {
    throw new AuthorizationError('Administrative analytics require an administrator account.');
  }

  const db = getDb();
  const dateFilter = [];
  const dateParams = [];
  if (from) { dateFilter.push('created_at >= ?'); dateParams.push(from); }
  if (to) { dateFilter.push('created_at <= ?'); dateParams.push(to); }
  const dateSql = dateFilter.length ? `AND ${dateFilter.join(' AND ')}` : '';

  const districtSql = district ? 'AND district = ?' : '';
  const districtParams = district ? [district] : [];

  const facilitySql = facilityId ? 'AND facility_id = ?' : '';
  const facilityParams = facilityId ? [facilityId] : [];

  const referralTotal = count(db, `SELECT COUNT(*) c FROM referrals WHERE 1=1 ${dateSql}`, dateParams);
  const referralCompleted = count(db, `SELECT COUNT(*) c FROM referrals WHERE status='COMPLETED' ${dateSql}`, dateParams);

  return {
    patients: {
      total: count(db, `SELECT COUNT(*) c FROM patients WHERE 1=1 ${districtSql}`, districtParams),
      registeredInPeriod: count(db, `SELECT COUNT(*) c FROM patients WHERE 1=1 ${dateSql}`, dateParams),
    },
    facilities: {
      total: count(db, 'SELECT COUNT(*) c FROM facilities WHERE active = 1'),
      byType: db.prepare('SELECT type, COUNT(*) AS count FROM facilities WHERE active = 1 GROUP BY type').all(),
    },
    staff: db.prepare("SELECT role, COUNT(*) AS count FROM users WHERE status='ACTIVE' GROUP BY role").all(),
    appointments: {
      total: count(db, `SELECT COUNT(*) c FROM appointments WHERE 1=1 ${dateSql}`, dateParams),
      completed: count(db, `SELECT COUNT(*) c FROM appointments WHERE status='COMPLETED' ${dateSql}`, dateParams),
      cancelled: count(db, `SELECT COUNT(*) c FROM appointments WHERE status='CANCELLED' ${dateSql}`, dateParams),
    },
    referrals: {
      total: referralTotal,
      completed: referralCompleted,
      pending: count(db, `SELECT COUNT(*) c FROM referrals WHERE status IN ('SENT','ACCEPTED','IN_TRANSIT','ARRIVED','IN_CONSULTATION') ${dateSql}`, dateParams),
      completionRate: referralTotal > 0 ? Number(((referralCompleted / referralTotal) * 100).toFixed(1)) : 0,
      byUrgency: db.prepare('SELECT urgency, COUNT(*) AS count FROM referrals GROUP BY urgency').all(),
    },
    maternal: {
      active: count(db, "SELECT COUNT(*) c FROM maternal_records WHERE outcome='ONGOING'"),
      highRisk: count(db, 'SELECT COUNT(*) c FROM maternal_records WHERE high_risk = 1'),
      ancVisits: count(db, 'SELECT COUNT(*) c FROM anc_visits'),
    },
    immunization: {
      given: count(db, "SELECT COUNT(*) c FROM vaccinations WHERE status='GIVEN'"),
      due: count(db, "SELECT COUNT(*) c FROM vaccinations WHERE status IN ('DUE','OVERDUE')"),
      coverageRate: (() => {
        const total = count(db, 'SELECT COUNT(*) c FROM vaccinations');
        const given = count(db, "SELECT COUNT(*) c FROM vaccinations WHERE status='GIVEN'");
        return total > 0 ? Number(((given / total) * 100).toFixed(1)) : 0;
      })(),
    },
    ncd: {
      screenings: count(db, 'SELECT COUNT(*) c FROM ncd_screenings'),
      byRisk: db.prepare('SELECT risk_category, COUNT(*) AS count FROM ncd_screenings GROUP BY risk_category').all(),
      suspectedDiabetes: count(db, 'SELECT COUNT(*) c FROM ncd_screenings WHERE suspected_diabetes = 1'),
      suspectedHypertension: count(db, 'SELECT COUNT(*) c FROM ncd_screenings WHERE suspected_hypertension = 1'),
    },
    beds: {
      total: count(db, `SELECT COUNT(*) c FROM beds WHERE 1=1 ${facilitySql}`, facilityParams),
      occupied: count(db, `SELECT COUNT(*) c FROM beds WHERE status='OCCUPIED' ${facilitySql}`, facilityParams),
      available: count(db, `SELECT COUNT(*) c FROM beds WHERE status='AVAILABLE' ${facilitySql}`, facilityParams),
      occupancyRate: (() => {
        const total = count(db, `SELECT COUNT(*) c FROM beds WHERE 1=1 ${facilitySql}`, facilityParams);
        const occupied = count(db, `SELECT COUNT(*) c FROM beds WHERE status='OCCUPIED' ${facilitySql}`, facilityParams);
        return total > 0 ? Number(((occupied / total) * 100).toFixed(1)) : 0;
      })(),
    },
    inventory: {
      items: count(db, 'SELECT COUNT(*) c FROM inventory'),
      lowStock: count(db, 'SELECT COUNT(*) c FROM inventory WHERE quantity <= reorder_level'),
      expiringSoon: count(db,
        "SELECT COUNT(*) c FROM inventory WHERE expiry_date IS NOT NULL AND expiry_date <= date('now','+90 day')"),
    },
    districts: db
      .prepare(`
        SELECT district, COUNT(*) AS patients FROM patients
        WHERE district IS NOT NULL GROUP BY district ORDER BY patients DESC LIMIT 40
      `)
      .all(),
  };
}

/**
 * Geographic aggregates for heatmaps. Returns counts only — never
 * patient-identifiable rows (§35).
 */
export function heatmapData(user, { metric = 'patients', district } = {}) {
  if (user.role !== 'ADMIN') {
    throw new AuthorizationError('Heatmap data requires an administrator account.');
  }

  const db = getDb();
  const params = [];
  let districtSql = '';
  if (district) { districtSql = 'AND p.district = ?'; params.push(district); }

  const QUERIES = {
    patients: `
      SELECT p.district, p.taluka, COUNT(*) AS value
      FROM patients p WHERE p.district IS NOT NULL ${districtSql}
      GROUP BY p.district, p.taluka`,
    ncd_high_risk: `
      SELECT p.district, p.taluka, COUNT(*) AS value
      FROM ncd_screenings n JOIN patients p ON p.id = n.patient_id
      WHERE n.risk_category = 'HIGH' AND p.district IS NOT NULL ${districtSql}
      GROUP BY p.district, p.taluka`,
    maternal_high_risk: `
      SELECT p.district, p.taluka, COUNT(*) AS value
      FROM maternal_records m JOIN patients p ON p.id = m.patient_id
      WHERE m.high_risk = 1 AND p.district IS NOT NULL ${districtSql}
      GROUP BY p.district, p.taluka`,
    referrals: `
      SELECT p.district, p.taluka, COUNT(*) AS value
      FROM referrals r JOIN patients p ON p.id = r.patient_id
      WHERE p.district IS NOT NULL ${districtSql}
      GROUP BY p.district, p.taluka`,
  };

  const sql = QUERIES[metric] || QUERIES.patients;
  const rows = db.prepare(sql).all(...params);

  return {
    metric,
    // Cells below the minimum size are withheld rather than published.
    points: rows
      .filter((r) => r.value >= MIN_CELL_SIZE)
      .map((r) => ({ district: r.district, taluka: r.taluka || undefined, value: r.value })),
    note: 'Aggregated counts only. No patient-identifiable data is included.',
  };
}
