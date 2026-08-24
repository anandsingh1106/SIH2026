import 'dotenv/config';
import crypto from 'crypto';
import { getDb, transaction } from '../src/db/connection.js';

/**
 * Fills every role's dashboard with realistic demo data.
 *
 * Runs after create-demo-accounts.js and attaches everything to those accounts,
 * so each role sees a populated workspace during a walkthrough.
 *
 * Idempotent: existing demo rows are left alone rather than duplicated.
 *
 * Usage: node scripts/seed-demo-data.js
 */

const db = getDb();
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function user(role) {
  return db.prepare("SELECT * FROM users WHERE role = ? AND email LIKE 'demo.%arogyasetu.test'").get(role);
}

const patientUser = user('PATIENT');
const ashaUser = user('ASHA');
const doctorUser = user('DOCTOR');
const specialistUser = user('SPECIALIST');

if (!patientUser || !doctorUser) {
  console.error('Demo accounts are missing. Run "npm run demo:accounts" first.');
  process.exit(1);
}

const phc = db.prepare("SELECT * FROM facilities WHERE name LIKE 'PHC Paud%'").get();
const hospital = db.prepare("SELECT * FROM facilities WHERE name LIKE '%Sassoon%'").get();
const patients = db.prepare('SELECT * FROM patients ORDER BY created_at').all();
const ownPatient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(patientUser.id) || patients[0];

if (!ownPatient) {
  console.error('No patient records found. Run "npm run db:seed" first.');
  process.exit(1);
}

const added = [];
const count = (sql, ...p) => db.prepare(sql).get(...p).c;

/** Inserts rows only when the table has none for this demo, keeping reruns safe. */
function seed(label, existingSql, insertFn) {
  const existing = count(existingSql);
  if (existing > 0) {
    added.push(`${label}: already present (${existing})`);
    return;
  }
  const n = transaction(() => insertFn());
  added.push(`${label}: +${n}`);
}

// ─── Medicines (formulary) ──────────────────────────────────────────────────
seed('medicines', 'SELECT COUNT(*) c FROM medicines', () => {
  const rows = [
    ['Paracetamol', 'Acetaminophen', '500mg', 'Tablet', 'Analgesic', 1],
    ['Amoxicillin', 'Amoxicillin', '500mg', 'Capsule', 'Antibiotic', 1],
    ['Metformin', 'Metformin HCl', '500mg', 'Tablet', 'Antidiabetic', 1],
    ['Amlodipine', 'Amlodipine Besylate', '5mg', 'Tablet', 'Antihypertensive', 1],
    ['Iron Folic Acid', 'Ferrous Sulphate + Folic Acid', '100mg', 'Tablet', 'Supplement', 1],
    ['ORS Sachet', 'Oral Rehydration Salts', '21.8g', 'Powder', 'Rehydration', 1],
    ['Albendazole', 'Albendazole', '400mg', 'Tablet', 'Anthelmintic', 1],
    ['Telmisartan', 'Telmisartan', '40mg', 'Tablet', 'Antihypertensive', 0],
    ['Cetirizine', 'Cetirizine HCl', '10mg', 'Tablet', 'Antihistamine', 0],
    ['Vitamin A Solution', 'Retinol Palmitate', '100000 IU', 'Syrup', 'Supplement', 1],
  ];
  const ins = db.prepare(`
    INSERT INTO medicines (id, name, generic_name, strength, dosage_form, category, is_essential, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`);
  rows.forEach((r) => ins.run(uid(), ...r, now(), now()));
  return rows.length;
});

// ─── Beds ───────────────────────────────────────────────────────────────────
seed('beds', 'SELECT COUNT(*) c FROM beds', () => {
  const ins = db.prepare(`
    INSERT INTO beds (id, facility_id, ward, bed_number, type, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  let n = 0;
  // Enough beds to show every ward type and a realistic occupancy mix,
  // without filling the board with rows nobody reads during a demo.
  const plan = [
    [hospital, 'ICU', 'ICU', 3], [hospital, 'Ward A', 'GENERAL', 4],
    [hospital, 'Ventilator Unit', 'VENTILATOR', 2], [hospital, 'Maternity', 'MATERNITY', 2],
    [phc, 'General Ward', 'GENERAL', 3], [phc, 'Emergency', 'EMERGENCY', 2],
  ];
  for (const [fac, ward, type, qty] of plan) {
    if (!fac) continue;
    for (let i = 1; i <= qty; i++) {
      // A realistic mix so the bed board is not uniformly empty.
      const status = i <= Math.floor(qty * 0.4) ? 'OCCUPIED' : 'AVAILABLE';
      ins.run(uid(), fac.id, ward, `${type.slice(0, 3)}-${String(i).padStart(2, '0')}`,
              type, status, now(), now());
      n++;
    }
  }
  return n;
});

// ─── Inventory ──────────────────────────────────────────────────────────────
seed('inventory', 'SELECT COUNT(*) c FROM inventory', () => {
  // Stock the essential medicines at the PHC only. Duplicating every item
  // across both facilities doubled the list without adding anything to show.
  const meds = db.prepare('SELECT * FROM medicines WHERE is_essential = 1 LIMIT 6').all();
  const ins = db.prepare(`
    INSERT INTO inventory (id, medicine_id, facility_id, batch_number, expiry_date,
      quantity, reorder_level, unit_price, supplier, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  let n = 0;
  if (!phc) return 0;

  meds.forEach((m, i) => {
    // Two items sit below the reorder level so the low-stock alert has
    // something real to report.
    const qty = i === 1 ? 8 : i === 4 ? 15 : 120 + i * 40;
    ins.run(uid(), m.id, phc.id, `B2026${String(i + 1).padStart(3, '0')}`,
            dayOffset(120 + i * 30), qty, 25, 2.5 + i, 'Maharashtra Medical Supply Corp',
            now(), now());
    n++;
  });
  return n;
});

// ─── Consultations + prescriptions ──────────────────────────────────────────
seed('consultations', 'SELECT COUNT(*) c FROM consultations', () => {
  const insC = db.prepare(`
    INSERT INTO consultations (id, patient_id, doctor_id, facility_id, chief_complaint,
      symptoms, examination, diagnosis, clinical_notes, treatment_plan, follow_up_date,
      status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insR = db.prepare(`
    INSERT INTO prescriptions (id, patient_id, doctor_id, consultation_id, facility_id,
      diagnosis, instructions, dietary_instructions, follow_up_date, status, issued_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`);
  const insI = db.prepare(`
    INSERT INTO prescription_items (id, prescription_id, medicine_name, dosage, frequency,
      duration, route, timing, quantity, instructions, instructions_mr, instructions_hi, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const cases = [
    {
      complaint: 'Headache and dizziness for one week',
      symptoms: ['headache', 'dizziness'],
      diagnosis: 'Essential hypertension',
      plan: 'Start antihypertensive, salt restriction, review in 2 weeks',
      days: -14,
      meds: [
        ['Tab Amlodipine 5mg', '1 tablet', '1-0-0', '30 days', 'Oral', ['morning'], 30,
         'Take after breakfast', 'सकाळी नाश्त्यानंतर घ्या', 'सुबह नाश्ते के बाद लें'],
        ['Tab Telmisartan 40mg', '1 tablet', '0-0-1', '30 days', 'Oral', ['night'], 30,
         'Take after dinner', 'रात्री जेवणानंतर घ्या', 'रात को खाने के बाद लें'],
      ],
    },
    {
      complaint: 'Fever with body ache for 3 days',
      symptoms: ['fever', 'body ache'],
      diagnosis: 'Acute viral fever',
      plan: 'Symptomatic treatment, fluids, review if fever persists beyond 3 days',
      days: -45,
      meds: [
        ['Tab Paracetamol 500mg', '1 tablet', '1-1-1', '5 days', 'Oral', ['morning', 'afternoon', 'night'], 15,
         'Take after food', 'जेवणानंतर घ्या', 'खाने के बाद लें'],
        ['ORS Sachet', '1 sachet', 'As needed', '5 days', 'Oral', ['morning'], 6,
         'Dissolve in 1 litre clean water', '१ लिटर स्वच्छ पाण्यात मिसळा', '1 लीटर साफ पानी में घोलें'],
      ],
    },
  ];

  let n = 0;
  for (const c of cases) {
    const cid = uid();
    const ts = new Date(); ts.setDate(ts.getDate() + c.days);
    const iso = ts.toISOString();

    insC.run(cid, ownPatient.id, doctorUser.id, phc?.id ?? null, c.complaint,
             JSON.stringify(c.symptoms), 'Systemic examination unremarkable.',
             c.diagnosis, 'Patient counselled on lifestyle and adherence.', c.plan,
             dayOffset(c.days + 30), 'COMPLETED', iso, iso);

    const rid = uid();
    insR.run(rid, ownPatient.id, doctorUser.id, cid, phc?.id ?? null, c.diagnosis,
             c.plan, 'Reduce salt; increase fresh vegetables and water intake.',
             dayOffset(c.days + 30), iso, iso, iso);

    c.meds.forEach((m) => {
      insI.run(uid(), rid, m[0], m[1], m[2], m[3], m[4], JSON.stringify(m[5]),
               m[6], m[7], m[8], m[9], iso);
    });
    n++;
  }
  return n;
});

// ─── Lab orders + results ───────────────────────────────────────────────────
seed('lab orders', 'SELECT COUNT(*) c FROM lab_orders', () => {
  const insO = db.prepare(`
    INSERT INTO lab_orders (id, patient_id, doctor_id, facility_id, test_name, category,
      priority, status, ordered_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insR = db.prepare(`
    INSERT INTO lab_results (id, lab_order_id, result, unit, reference_range,
      abnormal_flag, verified_by, verified_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const tests = [
    ['Complete Blood Count', 'Pathology', 'COMPLETED', '11.2', 'g/dL', '13.0-17.0', 'LOW'],
    ['Fasting Blood Glucose', 'Biochemistry', 'COMPLETED', '142', 'mg/dL', '70-100', 'HIGH'],
    ['Lipid Profile', 'Biochemistry', 'COMPLETED', '198', 'mg/dL', '<200', 'NORMAL'],
    ['Serum Creatinine', 'Biochemistry', 'PROCESSING', null, null, null, null],
    ['Chest X-Ray PA view', 'Radiology', 'ORDERED', null, null, null, null],
  ];

  tests.forEach((t, i) => {
    const oid = uid();
    const iso = new Date(Date.now() - (i + 1) * 86400000 * 3).toISOString();
    insO.run(oid, ownPatient.id, doctorUser.id, phc?.id ?? null, t[0], t[1],
             i === 4 ? 'URGENT' : 'ROUTINE', t[2], iso, iso, iso);
    if (t[2] === 'COMPLETED') {
      insR.run(uid(), oid, t[3], t[4], t[5], t[6], doctorUser.id, iso, iso);
    }
  });
  return tests.length;
});

// ─── Referrals with timeline ────────────────────────────────────────────────
seed('referrals', 'SELECT COUNT(*) c FROM referrals', () => {
  const insR = db.prepare(`
    INSERT INTO referrals (id, referral_code, patient_id, referred_by, referred_to,
      source_facility_id, destination_facility_id, specialty, reason, urgency,
      clinical_summary, diagnosis, status, created_at, updated_at, accepted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insE = db.prepare(`
    INSERT INTO referral_events (id, referral_id, status, note, actor_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`);

  const cases = [
    { p: ownPatient, spec: 'Cardiology', urg: 'URGENT', status: 'ACCEPTED',
      reason: 'Uncontrolled hypertension with chest discomfort',
      summary: 'BP persistently 160/100 despite dual therapy. ECG shows LVH.',
      events: ['CREATED', 'SENT', 'ACCEPTED'] },
    { p: patients[1] ?? ownPatient, spec: 'Obstetrics', urg: 'EMERGENCY', status: 'SENT',
      reason: 'Severe anaemia in third trimester',
      summary: 'Hb 6.8 g/dL at 34 weeks. Requires transfusion assessment.',
      events: ['CREATED', 'SENT'] },
    { p: patients[2] ?? ownPatient, spec: 'General Surgery', urg: 'ROUTINE', status: 'COMPLETED',
      reason: 'Inguinal hernia for elective repair',
      summary: 'Reducible right inguinal hernia, no obstruction.',
      events: ['CREATED', 'SENT', 'ACCEPTED', 'ARRIVED', 'IN_CONSULTATION', 'COMPLETED'] },
  ];

  cases.forEach((c, i) => {
    const rid = uid();
    const base = Date.now() - (i + 1) * 86400000 * 4;
    const iso = new Date(base).toISOString();
    insR.run(rid, `REF-2026-${100200 + i}`, c.p.id, doctorUser.id,
             c.status === 'SENT' ? null : specialistUser?.id ?? null,
             phc?.id ?? null, hospital?.id ?? null, c.spec, c.reason, c.urg,
             c.summary, c.reason, c.status, iso, iso,
             c.status === 'SENT' ? null : new Date(base + 3600000).toISOString());

    c.events.forEach((s, j) => {
      insE.run(uid(), rid, s, null,
               j < 2 ? doctorUser.id : specialistUser?.id ?? doctorUser.id,
               new Date(base + j * 3600000).toISOString());
    });
  });
  return cases.length;
});

// ─── ASHA field work ────────────────────────────────────────────────────────
seed('tasks', 'SELECT COUNT(*) c FROM tasks', () => {
  const ins = db.prepare(`
    INSERT INTO tasks (id, assigned_to, created_by, patient_id, facility_id, type,
      title, description, priority, due_date, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const rows = [
    ['ANC follow-up visit', 'Third ANC check for high-risk pregnancy', 'URGENT', 0, 'TODO', 'anc_checkup'],
    ['Immunisation due', 'Pentavalent-2 dose due for infant', 'HIGH', 1, 'TODO', 'immunization'],
    ['NCD screening drive', 'Screen adults above 30 in ward 4', 'MEDIUM', 3, 'IN_PROGRESS', 'ncd_screening'],
    ['Home visit — TB adherence', 'Confirm DOTS adherence', 'HIGH', 2, 'TODO', 'home_visit'],
    ['Postnatal check', 'Day-7 postnatal visit', 'MEDIUM', 5, 'TODO', 'follow_up'],
    ['Village health register update', 'Reconcile household register', 'LOW', 7, 'TODO', 'general'],
    ['Danger sign follow-up', 'Recheck BP after referral', 'URGENT', -1, 'COMPLETED', 'danger_sign_check'],
  ];
  rows.forEach((r, i) => {
    ins.run(uid(), ashaUser?.id ?? doctorUser.id, doctorUser.id,
            patients[i % patients.length]?.id ?? null, phc?.id ?? null, r[5],
            r[0], r[1], r[2], dayOffset(r[3]), r[4], now(), now());
  });
  return rows.length;
});

seed('home visits', 'SELECT COUNT(*) c FROM home_visits', () => {
  const ins = db.prepare(`
    INSERT INTO home_visits (id, asha_id, patient_id, household_id, visit_date, purpose,
      observations, symptoms, danger_signs, risk_level, referral_recommended, notes,
      next_visit_date, sync_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, ?)`);
  const rows = [
    ['Routine ANC check', 'BP 118/76, no oedema. Fetal movements normal.', [], [], 'LOW', 0, -5],
    ['NCD follow-up', 'BP 158/96 on repeat. Patient reports missed doses.', ['headache'], ['high blood pressure'], 'HIGH', 1, -12],
    ['Child growth monitoring', 'Weight on track. Immunisation up to date.', [], [], 'LOW', 0, -20],
    ['Post-referral follow-up', 'Recovering well after discharge. Wound clean.', [], [], 'MODERATE', 0, -3],
  ];
  rows.forEach((r, i) => {
    ins.run(uid(), ashaUser?.id ?? doctorUser.id, patients[i % patients.length].id,
            `HH-${101 + i}`, dayOffset(r[6]), r[0], r[1],
            JSON.stringify(r[2]), JSON.stringify(r[3]), r[4], r[5], null,
            dayOffset(r[6] + 30), now(), now());
  });
  return rows.length;
});

seed('vaccinations', 'SELECT COUNT(*) c FROM vaccinations', () => {
  const ins = db.prepare(`
    INSERT INTO vaccinations (id, patient_id, vaccine_name, dose, scheduled_date,
      administered_date, administered_by, facility_id, batch_number, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const rows = [
    ['BCG', 'Birth', -400, -400, 'GIVEN'],
    ['OPV-0', 'Birth', -400, -400, 'GIVEN'],
    ['Pentavalent-1', '6 weeks', -358, -357, 'GIVEN'],
    ['Pentavalent-2', '10 weeks', -330, null, 'OVERDUE'],
    ['Pentavalent-3', '14 weeks', -302, null, 'OVERDUE'],
    ['Measles-Rubella 1', '9 months', 12, null, 'DUE'],
    ['Vitamin A (1st dose)', '9 months', 12, null, 'DUE'],
    ['DPT Booster', '16-24 months', 90, null, 'DUE'],
  ];
  rows.forEach((r) => {
    ins.run(uid(), patients[1]?.id ?? ownPatient.id, r[0], r[1], dayOffset(r[2]),
            r[3] ? dayOffset(r[3]) : null, r[3] ? (ashaUser?.id ?? null) : null,
            phc?.id ?? null, r[3] ? `V-${2026}${Math.floor(Math.random() * 900 + 100)}` : null,
            r[4], now(), now());
  });
  return rows.length;
});

seed('maternal records', 'SELECT COUNT(*) c FROM maternal_records', () => {
  const insM = db.prepare(`
    INSERT INTO maternal_records (id, patient_id, asha_id, lmp_date, edd_date, gravida,
      parity, high_risk, risk_factors, jssk_registered, pmsma_registered, outcome, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'ONGOING', ?, ?)`);
  const insA = db.prepare(`
    INSERT INTO anc_visits (id, maternal_record_id, visit_number, visit_date, recorded_by,
      weight, blood_pressure_systolic, blood_pressure_diastolic, hemoglobin, fundal_height,
      fetal_heart_rate, tetanus_given, ifa_tablets_given, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const mid = uid();
  insM.run(mid, patients[1]?.id ?? ownPatient.id, ashaUser?.id ?? null,
           dayOffset(-210), dayOffset(70), 2, 1, 1,
           JSON.stringify(['Anaemia', 'Previous caesarean']), now(), now());

  const visits = [
    [1, -180, 52.0, 112, 74, 10.8, '16 cm', null, 1, 100],
    [2, -120, 54.5, 118, 78, 9.6, '24 cm', 142, 1, 100],
    [3, -60, 57.0, 126, 82, 8.4, '30 cm', 138, 0, 100],
  ];
  visits.forEach((v) => {
    insA.run(uid(), mid, v[0], dayOffset(v[1]), ashaUser?.id ?? null,
             v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9],
             v[5] < 9 ? 'Anaemia worsening — iron supplementation reinforced.' : null, now());
  });
  return 1;
});

seed('NCD screenings', 'SELECT COUNT(*) c FROM ncd_screenings', () => {
  const ins = db.prepare(`
    INSERT INTO ncd_screenings (id, patient_id, screened_by, facility_id, screening_date,
      age, blood_pressure_systolic, blood_pressure_diastolic, blood_glucose, bmi,
      waist_circumference, tobacco_use, alcohol_use, physical_activity_adequate,
      family_history, cbac_score, risk_category, suspected_diabetes, suspected_hypertension,
      recommendations, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const rows = [
    [58, 162, 98, 168, 27.4, 102, 1, 0, 0, 1, 9, 'HIGH', 1, 1,
     ['CBAC score is at or above the referral threshold — refer for NCD evaluation at the PHC.',
      'Elevated blood pressure recorded. Repeat measurement and refer for clinical confirmation.',
      'Raised blood glucose recorded. Refer for confirmatory fasting glucose or HbA1c testing.']],
    [41, 128, 84, 104, 23.1, 88, 0, 0, 1, 0, 2, 'LOW', 0, 0,
     ['No immediate risk factors identified. Repeat screening as per programme schedule.']],
    [63, 146, 90, 118, 25.8, 96, 0, 1, 0, 1, 8, 'MODERATE', 0, 1,
     ['CBAC score is at or above the referral threshold — refer for NCD evaluation at the PHC.',
      'Offer counselling on alcohol reduction.']],
  ];
  rows.forEach((r, i) => {
    ins.run(uid(), patients[i % patients.length].id, ashaUser?.id ?? null, phc?.id ?? null,
            dayOffset(-(i + 1) * 8), r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9],
            r[10], r[11], r[12], r[13], JSON.stringify(r[14]), now());
  });
  return rows.length;
});

// ─── Vitals ─────────────────────────────────────────────────────────────────
seed('vitals', 'SELECT COUNT(*) c FROM vitals', () => {
  const ins = db.prepare(`
    INSERT INTO vitals (id, patient_id, recorded_by, facility_id, temperature,
      blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate,
      oxygen_saturation, weight, height, bmi, blood_glucose, hemoglobin, recorded_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const series = [
    [-90, 36.8, 158, 96, 84, 18, 97, 78.0, 170, 27.0, 142, 11.2],
    [-60, 36.6, 150, 92, 80, 17, 98, 77.2, 170, 26.7, 136, 11.6],
    [-30, 36.7, 142, 88, 76, 16, 98, 76.5, 170, 26.5, 128, 12.0],
    [-7, 36.6, 134, 84, 74, 16, 99, 75.8, 170, 26.2, 118, 12.4],
  ];
  series.forEach((v) => {
    const iso = new Date(Date.now() + v[0] * 86400000).toISOString();
    ins.run(uid(), ownPatient.id, doctorUser.id, phc?.id ?? null, v[1], v[2], v[3],
            v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11], iso, iso);
  });
  return series.length;
});

// ─── OPD queue for today ────────────────────────────────────────────────────
seed('OPD queue', `SELECT COUNT(*) c FROM opd_tokens WHERE queue_date = '${dayOffset(0)}'`, () => {
  if (!phc) return 0;
  const ins = db.prepare(`
    INSERT INTO opd_tokens (id, facility_id, patient_id, doctor_id, token_number,
      queue_date, status, called_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const statuses = ['COMPLETED', 'IN_PROGRESS', 'WAITING', 'WAITING'];
  statuses.forEach((s, i) => {
    ins.run(uid(), phc.id, patients[i % patients.length].id, doctorUser.id, i + 1,
            dayOffset(0), s, s === 'WAITING' ? null : now(), now(), now());
  });
  return statuses.length;
});

// ─── Notifications ──────────────────────────────────────────────────────────
seed('notifications', 'SELECT COUNT(*) c FROM notifications', () => {
  const ins = db.prepare(`
    INSERT INTO notifications (id, user_id, role, facility_id, type, title, message,
      priority, link, read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const rows = [
    [patientUser.id, null, 'APPOINTMENT', 'Appointment confirmed',
     'Your appointment with Dr. Rajesh Deshmukh is confirmed.', 'NORMAL', '/patient/appointments', 0],
    [patientUser.id, null, 'LAB_RESULT', 'Lab result ready',
     'Complete Blood Count result is available for review.', 'HIGH', '/patient/lab-reports', 0],
    [doctorUser.id, null, 'LAB_RESULT', 'Critical lab value',
     'Fasting glucose 142 mg/dL flagged HIGH for a patient.', 'CRITICAL', '/doctor/lab-orders', 0],
    [ashaUser?.id ?? null, null, 'TASK', 'Urgent task assigned',
     'ANC follow-up visit is due today.', 'HIGH', '/asha/tasks', 0],
    [specialistUser?.id ?? null, null, 'REFERRAL', 'New emergency referral',
     'Severe anaemia in third trimester requires review.', 'CRITICAL', '/specialist/referrals', 0],
    [null, 'ADMIN', 'LOW_STOCK', 'Low stock alert',
     'Metformin 500mg is below reorder level at PHC Paud.', 'HIGH', '/admin/inventory', 0],
  ];
  rows.forEach((r, i) => {
    if (!r[0] && !r[1]) return;
    ins.run(uid(), r[0], r[1], null, r[2], r[3], r[4], r[5], r[6], r[7],
            new Date(Date.now() - i * 3600000).toISOString());
  });
  return rows.length;
});

// ─── Allergies and chronic conditions ───────────────────────────────────────
seed('allergies', 'SELECT COUNT(*) c FROM allergies', () => {
  const ins = db.prepare(`
    INSERT INTO allergies (id, patient_id, substance, reaction, severity, recorded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  ins.run(uid(), ownPatient.id, 'Penicillin', 'Skin rash and itching', 'MODERATE', doctorUser.id, now());
  ins.run(uid(), ownPatient.id, 'Sulfa drugs', 'Reported intolerance', 'MILD', doctorUser.id, now());
  return 2;
});

seed('chronic conditions', 'SELECT COUNT(*) c FROM chronic_conditions', () => {
  const ins = db.prepare(`
    INSERT INTO chronic_conditions (id, patient_id, condition, diagnosed_date, status, notes, recorded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  ins.run(uid(), ownPatient.id, 'Essential hypertension', dayOffset(-400), 'ACTIVE',
          'On dual antihypertensive therapy.', doctorUser.id, now());
  ins.run(uid(), ownPatient.id, 'Type 2 diabetes mellitus', dayOffset(-200), 'MANAGED',
          'Diet-controlled, monitored quarterly.', doctorUser.id, now());
  return 2;
});

// ─── Report ─────────────────────────────────────────────────────────────────
console.log('Demo data seeding\n');
added.forEach((a) => console.log(`  ${a}`));

const summary = [
  'patients', 'appointments', 'consultations', 'prescriptions', 'lab_orders',
  'referrals', 'beds', 'inventory', 'tasks', 'home_visits', 'vaccinations',
  'maternal_records', 'ncd_screenings', 'vitals', 'opd_tokens', 'notifications',
];
console.log('\nCurrent row counts:');
summary.forEach((t) => {
  console.log(`  ${t.padEnd(18)} ${count(`SELECT COUNT(*) c FROM ${t}`)}`);
});
