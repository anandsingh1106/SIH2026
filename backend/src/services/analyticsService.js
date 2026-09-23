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

/**
 * An ASHA's own activity in one calendar month (YYYY-MM), for the monthly
 * progress report. Every figure is a count of records the ASHA created or of
 * events among their assigned patients in that month.
 */
export function ashaMonthlyReport(user, month) {
  if (user.role !== 'ASHA') {
    throw new AuthorizationError('The monthly progress report is for ASHA workers.');
  }
  const db = getDb();
  const patientIds = patientRepository.idsForAsha(user.id, db);
  const inList = patientIds.length ? patientIds.map(() => '?').join(',') : "''";
  const m = `${month}%`;
  const ofPatients = (sql, ...extra) =>
    patientIds.length ? count(db, sql.replace('__PATIENTS__', inList), [...extra, ...patientIds]) : 0;

  const rows = [
    { key: 'homeVisits', indicator: 'Home visits made',
      value: count(db, 'SELECT COUNT(*) c FROM home_visits WHERE asha_id = ? AND visit_date LIKE ?', [user.id, m]) },
    { key: 'highRiskVisits', indicator: 'Home visits that found high or critical risk',
      value: count(db, "SELECT COUNT(*) c FROM home_visits WHERE asha_id = ? AND visit_date LIKE ? AND risk_level IN ('HIGH','CRITICAL')", [user.id, m]) },
    { key: 'ancRegistrations', indicator: 'Pregnancies registered',
      value: count(db, 'SELECT COUNT(*) c FROM maternal_records WHERE asha_id = ? AND created_at LIKE ?', [user.id, m]) },
    { key: 'ancVisits', indicator: 'ANC check-ups recorded',
      value: count(db, `SELECT COUNT(*) c FROM anc_visits a JOIN maternal_records r ON r.id = a.maternal_record_id
        WHERE r.asha_id = ? AND a.visit_date LIKE ?`, [user.id, m]) },
    { key: 'vaccinesGiven', indicator: 'Vaccine doses given to your patients',
      value: ofPatients("SELECT COUNT(*) c FROM vaccinations WHERE status = 'GIVEN' AND administered_date LIKE ? AND patient_id IN (__PATIENTS__)", m) },
    { key: 'ncdScreenings', indicator: 'NCD (CBAC) screenings done',
      value: count(db, 'SELECT COUNT(*) c FROM ncd_screenings WHERE screened_by = ? AND screening_date LIKE ?', [user.id, m]) },
    { key: 'referrals', indicator: 'Referrals raised for your patients',
      value: ofPatients('SELECT COUNT(*) c FROM referrals WHERE created_at LIKE ? AND patient_id IN (__PATIENTS__)', m) },
    { key: 'tasksCompleted', indicator: 'Tasks completed',
      value: count(db, "SELECT COUNT(*) c FROM tasks WHERE assigned_to = ? AND status = 'COMPLETED' AND COALESCE(completed_at, updated_at) LIKE ?", [user.id, m]) },
  ];

  return {
    month,
    assignedPatients: patientIds.length,
    rows,
    // Open work carried into the next month, whatever month is selected.
    pending: {
      vaccinesDue: ofPatients("SELECT COUNT(*) c FROM vaccinations WHERE status IN ('DUE','OVERDUE') AND patient_id IN (__PATIENTS__)"),
      highRiskPregnancies: count(db, "SELECT COUNT(*) c FROM maternal_records WHERE asha_id = ? AND high_risk = 1 AND COALESCE(outcome, 'ONGOING') = 'ONGOING'", [user.id]),
      openTasks: count(db, "SELECT COUNT(*) c FROM tasks WHERE assigned_to = ? AND status IN ('TODO','IN_PROGRESS')", [user.id]),
    },
  };
}

/**
 * One row per patient assigned to this ASHA, with the risks their records
 * show, for the village health grid. Status, most urgent first:
 * critical (severe anaemia in pregnancy, or last visit found critical risk),
 * high_risk (high-risk pregnancy, high-risk NCD screen or an overdue vaccine),
 * due (a task due today or earlier, or no visit in 30 days), routine.
 */
export function ashaHouseholds(user) {
  if (user.role !== 'ASHA') {
    throw new AuthorizationError('The village health grid is for ASHA workers.');
  }
  const db = getDb();
  const today = isoDay(new Date());
  const monthAgo = isoDay(new Date(Date.now() - 30 * 86400000));

  const rows = db.prepare(`
    SELECT p.id, p.name, p.gender, p.date_of_birth, p.phone, p.village, p.taluka, p.district, p.address,
      (SELECT MAX(visit_date) FROM home_visits h WHERE h.patient_id = p.id) AS last_visit,
      (SELECT h.risk_level FROM home_visits h WHERE h.patient_id = p.id ORDER BY h.visit_date DESC LIMIT 1) AS last_risk,
      (SELECT h.household_id FROM home_visits h WHERE h.patient_id = p.id AND h.household_id IS NOT NULL
         ORDER BY h.visit_date DESC LIMIT 1) AS household_id,
      (SELECT COUNT(*) FROM maternal_records m WHERE m.patient_id = p.id AND m.high_risk = 1
         AND COALESCE(m.outcome, 'ONGOING') = 'ONGOING') AS high_risk_pregnancy,
      (SELECT a.hemoglobin FROM anc_visits a JOIN maternal_records m ON m.id = a.maternal_record_id
         WHERE m.patient_id = p.id AND COALESCE(m.outcome, 'ONGOING') = 'ONGOING'
         ORDER BY a.visit_date DESC LIMIT 1) AS latest_hb,
      (SELECT COUNT(*) FROM ncd_screenings n WHERE n.patient_id = p.id AND n.risk_category = 'HIGH') AS ncd_high,
      (SELECT COUNT(*) FROM vaccinations v WHERE v.patient_id = p.id AND v.status = 'OVERDUE') AS vaccines_overdue,
      (SELECT COUNT(*) FROM vaccinations v WHERE v.patient_id = p.id AND v.status = 'DUE') AS vaccines_due,
      (SELECT COUNT(*) FROM tasks t WHERE t.patient_id = p.id AND t.assigned_to = ?
         AND t.status IN ('TODO','IN_PROGRESS') AND t.due_date IS NOT NULL AND substr(t.due_date, 1, 10) <= ?) AS tasks_due
    FROM patients p WHERE p.assigned_asha_id = ?
    ORDER BY p.village, p.name
  `).all(user.id, today, user.id);

  return rows.map((r) => {
    const severeAnaemia = r.latest_hb != null && r.latest_hb < 7;
    const alerts = [];
    if (severeAnaemia) alerts.push(`Severe anaemia in pregnancy (Hb ${r.latest_hb} g/dL)`);
    if (r.last_risk === 'CRITICAL') alerts.push('Last home visit found critical risk');
    if (r.high_risk_pregnancy) alerts.push('High-risk pregnancy');
    if (r.ncd_high) alerts.push('High-risk NCD screen');
    if (r.vaccines_overdue) alerts.push(`${r.vaccines_overdue} vaccine dose${r.vaccines_overdue > 1 ? 's' : ''} overdue`);
    if (r.tasks_due) alerts.push(`${r.tasks_due} task${r.tasks_due > 1 ? 's' : ''} due`);
    if (!r.last_visit || r.last_visit < monthAgo) alerts.push(r.last_visit ? 'No visit in 30 days' : 'Never visited');

    const status = severeAnaemia || r.last_risk === 'CRITICAL' ? 'critical'
      : r.high_risk_pregnancy || r.ncd_high || r.vaccines_overdue ? 'high_risk'
      : r.tasks_due || !r.last_visit || r.last_visit < monthAgo ? 'due'
      : 'routine';

    return {
      patientId: r.id,
      name: r.name,
      gender: r.gender ? r.gender.toLowerCase() : undefined,
      dateOfBirth: r.date_of_birth || undefined,
      phone: r.phone || undefined,
      village: r.village || undefined,
      taluka: r.taluka || undefined,
      district: r.district || undefined,
      address: r.address || undefined,
      householdId: r.household_id || undefined,
      lastVisit: r.last_visit || undefined,
      vaccinesDue: r.vaccines_due,
      status,
      alerts,
    };
  });
}

// Matched against the dispensing label, which carries the brand or generic
// name, so this covers the antibiotics on the essential medicines list.
const ANTIBIOTIC_NAMES = [
  'amoxicillin', 'amoxiclav', 'ampicillin', 'azithromycin', 'cefixime', 'cefalexin', 'cephalexin',
  'ceftriaxone', 'cefuroxime', 'ciprofloxacin', 'clarithromycin', 'cloxacillin', 'cotrimoxazole',
  'co-trimoxazole', 'doxycycline', 'erythromycin', 'gentamicin', 'levofloxacin', 'metronidazole',
  'nitrofurantoin', 'norfloxacin', 'ofloxacin', 'penicillin', 'tinidazole',
];

const isoDay = (d) => d.toISOString().slice(0, 10);

/** The last `months` calendar months as YYYY-MM keys with a short label, oldest first. */
function recentMonths(months) {
  const now = new Date();
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      month: d.toLocaleString('en-US', { month: 'short' }),
    });
  }
  return out;
}

export function doctorAnalytics(user) {
  const db = getDb();
  const today = isoDay(new Date());

  // Consultations in each of the last eight weeks, in person and remote. Weeks
  // rather than days, since a single week at a small PHC is often empty.
  const WEEKS = 8;
  const weeks = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - (i * 7 + 6));
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    // Labelled in UTC, like the stored timestamps, so the label matches `from`.
    weeks.push({
      from: isoDay(start),
      to: isoDay(end),
      label: start.toLocaleString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    });
  }
  const recent = db.prepare(`
    SELECT substr(created_at, 1, 10) AS d, is_telemedicine AS tele
    FROM consultations WHERE doctor_id = ? AND substr(created_at, 1, 10) >= ?
  `).all(user.id, weeks[0].from);

  const consultations = count(db, 'SELECT COUNT(*) c FROM consultations WHERE doctor_id = ?', [user.id]);
  const diagnoses = db.prepare(`
    SELECT diagnosis, COUNT(*) AS count FROM consultations
    WHERE doctor_id = ? AND diagnosis IS NOT NULL AND trim(diagnosis) != ''
    GROUP BY diagnosis ORDER BY count DESC, diagnosis ASC LIMIT 6
  `).all(user.id);
  const diagnosed = count(db, "SELECT COUNT(*) c FROM consultations WHERE doctor_id = ? AND diagnosis IS NOT NULL AND trim(diagnosis) != ''", [user.id]);

  // Share of prescriptions that include at least one antibiotic.
  const items = db.prepare(`
    SELECT pi.prescription_id, lower(pi.medicine_name) AS name, lower(COALESCE(m.category, '')) AS category
    FROM prescription_items pi
    JOIN prescriptions p ON p.id = pi.prescription_id
    LEFT JOIN medicines m ON m.id = pi.medicine_id
    WHERE p.doctor_id = ?
  `).all(user.id);
  const withItems = new Set(items.map((i) => i.prescription_id));
  const withAntibiotic = new Set(
    items
      .filter((i) => i.category === 'antibiotic' || ANTIBIOTIC_NAMES.some((n) => i.name.includes(n)))
      .map((i) => i.prescription_id)
  );

  // A follow-up counts as kept when the patient was seen again afterwards.
  const followUps = db.prepare(`
    SELECT COUNT(*) AS due,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM consultations c2 WHERE c2.patient_id = c.patient_id AND c2.created_at > c.created_at
      ) OR EXISTS (
        SELECT 1 FROM appointments a WHERE a.patient_id = c.patient_id AND a.status = 'COMPLETED'
          AND a.appointment_date > substr(c.created_at, 1, 10)
      ) THEN 1 ELSE 0 END) AS kept
    FROM consultations c
    WHERE c.doctor_id = ? AND c.follow_up_date IS NOT NULL AND c.follow_up_date <= ?
  `).get(user.id, today);

  return {
    todaysAppointments: count(db, "SELECT COUNT(*) c FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('CANCELLED','NO_SHOW')", [user.id, today]),
    consultations,
    teleconsultations: count(db, 'SELECT COUNT(*) c FROM consultations WHERE doctor_id = ? AND is_telemedicine = 1', [user.id]),
    prescriptionsIssued: count(db, 'SELECT COUNT(*) c FROM prescriptions WHERE doctor_id = ?', [user.id]),
    pendingLabResults: count(db, "SELECT COUNT(*) c FROM lab_orders WHERE doctor_id = ? AND status != 'COMPLETED'", [user.id]),
    referralsMade: count(db, 'SELECT COUNT(*) c FROM referrals WHERE referred_by = ?', [user.id]),
    openTasks: count(db, "SELECT COUNT(*) c FROM tasks WHERE assigned_to = ? AND status IN ('TODO','IN_PROGRESS')", [user.id]),
    weekly: weeks.map(({ from, to, label }) => {
      const inWeek = recent.filter((r) => r.d >= from && r.d <= to);
      return {
        from, to, week: label,
        opd: inWeek.filter((r) => !r.tele).length,
        tele: inWeek.filter((r) => r.tele).length,
      };
    }),
    topDiagnoses: diagnoses.map((d) => ({
      diagnosis: d.diagnosis,
      count: d.count,
      percent: diagnosed > 0 ? Number(((d.count / diagnosed) * 100).toFixed(1)) : 0,
    })),
    antibiotic: {
      prescriptions: withItems.size,
      withAntibiotic: withAntibiotic.size,
      rate: withItems.size > 0 ? Number(((withAntibiotic.size / withItems.size) * 100).toFixed(1)) : 0,
    },
    followUps: {
      due: followUps?.due ?? 0,
      kept: followUps?.kept ?? 0,
      rate: followUps?.due > 0 ? Number(((followUps.kept / followUps.due) * 100).toFixed(1)) : 0,
    },
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
    trends: monthlyTrends(db, 6),
    topDiagnoses: db
      .prepare(`
        SELECT diagnosis, COUNT(*) AS count FROM consultations
        WHERE diagnosis IS NOT NULL AND trim(diagnosis) != ''
        GROUP BY diagnosis ORDER BY count DESC, diagnosis ASC LIMIT 8
      `)
      .all(),
    referralTurnaroundHours: (() => {
      const avg = db
        .prepare(`
          SELECT AVG((julianday(accepted_at) - julianday(created_at)) * 24) AS h
          FROM referrals WHERE accepted_at IS NOT NULL AND accepted_at >= created_at
        `)
        .get()?.h;
      return avg == null ? null : Number(avg.toFixed(1));
    })(),
    hotspots: villageHotspots(db),
  };
}

/** Monthly activity counts for the last `months` months, zero-filled. */
function monthlyTrends(db, months) {
  const byMonth = (sql) =>
    Object.fromEntries(db.prepare(sql).all().map((r) => [r.m, r.c]));

  const series = {
    registrations: byMonth('SELECT substr(created_at, 1, 7) m, COUNT(*) c FROM patients GROUP BY m'),
    consultations: byMonth('SELECT substr(created_at, 1, 7) m, COUNT(*) c FROM consultations GROUP BY m'),
    referrals: byMonth('SELECT substr(created_at, 1, 7) m, COUNT(*) c FROM referrals GROUP BY m'),
    screenings: byMonth('SELECT substr(screening_date, 1, 7) m, COUNT(*) c FROM ncd_screenings GROUP BY m'),
    ancVisits: byMonth('SELECT substr(visit_date, 1, 7) m, COUNT(*) c FROM anc_visits GROUP BY m'),
    vaccinesGiven: byMonth(
      "SELECT substr(administered_date, 1, 7) m, COUNT(*) c FROM vaccinations WHERE status = 'GIVEN' GROUP BY m"
    ),
  };

  return recentMonths(months).map(({ key, month }) => ({
    key,
    month,
    ...Object.fromEntries(Object.entries(series).map(([name, counts]) => [name, counts[key] ?? 0])),
  }));
}

/**
 * Villages carrying the most open clinical risk: high-risk pregnancies, severe
 * anaemia in pregnancy, high-risk NCD screens and overdue vaccines. Counts
 * only, never a patient reference (§35).
 */
export function villageHotspots(db, limit = 8) {
  const place = "p.district || '|' || COALESCE(p.taluka, '') || '|' || p.village";
  const tally = (sql) => db.prepare(sql).all();

  const sources = {
    highRiskMaternal: tally(`
      SELECT ${place} AS k, COUNT(*) AS c FROM maternal_records m JOIN patients p ON p.id = m.patient_id
      WHERE m.high_risk = 1 AND COALESCE(m.outcome, 'ONGOING') = 'ONGOING' AND p.village IS NOT NULL GROUP BY k`),
    severeAnaemia: tally(`
      SELECT ${place} AS k, COUNT(DISTINCT m.id) AS c FROM anc_visits a
      JOIN maternal_records m ON m.id = a.maternal_record_id JOIN patients p ON p.id = m.patient_id
      WHERE a.hemoglobin IS NOT NULL AND a.hemoglobin < 7 AND p.village IS NOT NULL GROUP BY k`),
    ncdHighRisk: tally(`
      SELECT ${place} AS k, COUNT(DISTINCT n.patient_id) AS c FROM ncd_screenings n JOIN patients p ON p.id = n.patient_id
      WHERE n.risk_category = 'HIGH' AND p.village IS NOT NULL GROUP BY k`),
    overdueVaccines: tally(`
      SELECT ${place} AS k, COUNT(*) AS c FROM vaccinations v JOIN patients p ON p.id = v.patient_id
      WHERE v.status = 'OVERDUE' AND p.village IS NOT NULL GROUP BY k`),
  };

  // Weighted so a pregnancy at risk outranks a late vaccine dose.
  const WEIGHTS = { highRiskMaternal: 3, severeAnaemia: 3, ncdHighRisk: 2, overdueVaccines: 1 };
  const places = new Map();
  for (const [name, rows] of Object.entries(sources)) {
    for (const { k, c } of rows) {
      if (!places.has(k)) {
        const [district, taluka, village] = k.split('|');
        places.set(k, {
          district, taluka: taluka || undefined, village,
          highRiskMaternal: 0, severeAnaemia: 0, ncdHighRisk: 0, overdueVaccines: 0, score: 0,
        });
      }
      const entry = places.get(k);
      entry[name] = c;
      entry.score += c * WEIGHTS[name];
    }
  }

  return [...places.values()]
    .filter((p) => p.score >= MIN_CELL_SIZE)
    .sort((a, b) => b.score - a.score || a.village.localeCompare(b.village))
    .slice(0, limit);
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
    vaccinations_overdue: `
      SELECT p.district, p.taluka, COUNT(*) AS value
      FROM vaccinations v JOIN patients p ON p.id = v.patient_id
      WHERE v.status = 'OVERDUE' AND p.district IS NOT NULL ${districtSql}
      GROUP BY p.district, p.taluka`,
    severe_anaemia: `
      SELECT p.district, p.taluka, COUNT(DISTINCT m.id) AS value
      FROM anc_visits a JOIN maternal_records m ON m.id = a.maternal_record_id
      JOIN patients p ON p.id = m.patient_id
      WHERE a.hemoglobin IS NOT NULL AND a.hemoglobin < 7 AND p.district IS NOT NULL ${districtSql}
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
