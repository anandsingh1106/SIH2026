import 'dotenv/config';
import crypto from 'crypto';
import { getDb, transaction } from '../src/db/connection.js';

/**
 * Scales the demo dataset up to a presentable size — roughly 100-150 rows for
 * each major entity, spread across several districts.
 *
 * Names are drawn from common Maharashtrian name lists and combined
 * procedurally; every record is clearly synthetic demo data.
 *
 * Idempotent: skips any entity that already meets the target.
 *
 * Usage: node scripts/seed-scale.js
 */

const db = getDb();
const uid = () => crypto.randomUUID();
const pick = (arr, i) => arr[i % arr.length];

const TARGET = 120;

const FIRST_M = ['Ramesh', 'Suresh', 'Ganesh', 'Mahesh', 'Vijay', 'Sanjay', 'Anil', 'Sunil',
  'Prakash', 'Dinesh', 'Nitin', 'Sachin', 'Amol', 'Rahul', 'Prasad', 'Nilesh',
  'Bhaskar', 'Dattatray', 'Kishor', 'Madhav', 'Narayan', 'Pandurang', 'Shrikant', 'Tukaram',
  'Vishal', 'Yogesh', 'Ashok', 'Bharat', 'Chandrakant', 'Deepak', 'Eknath', 'Gopal'];
const FIRST_F = ['Sunita', 'Kavita', 'Anita', 'Lata', 'Mangala', 'Shobha', 'Vaishali', 'Rekha',
  'Sujata', 'Manisha', 'Archana', 'Pooja', 'Snehal', 'Nanda', 'Ujwala', 'Vandana',
  'Asha', 'Bharati', 'Chhaya', 'Damayanti', 'Geeta', 'Hemlata', 'Indira', 'Jyoti',
  'Kalpana', 'Madhuri', 'Nirmala', 'Prabha', 'Rohini', 'Sarika', 'Trupti', 'Yamuna'];
const SURNAMES = ['Patil', 'Deshmukh', 'Jadhav', 'Shinde', 'Pawar', 'More', 'Gaikwad', 'Kulkarni',
  'Joshi', 'Bhosale', 'Chavan', 'Kadam', 'Salunkhe', 'Thorat', 'Sawant', 'Mane',
  'Bhagat', 'Dhumal', 'Ghorpade', 'Ingale', 'Kale', 'Lokhande', 'Nikam', 'Pingale',
  'Rane', 'Shelke', 'Tambe', 'Wagh', 'Bagal', 'Dabhade', 'Gadekar', 'Hande'];

/**
 * Middle names follow the Maharashtrian convention of carrying the father's
 * name, and give the registry a third axis so look-alike rows stay apart.
 */
const MIDDLE = ['Baban', 'Dattatray', 'Ganpat', 'Hari', 'Kisan', 'Laxman', 'Maruti', 'Namdev',
  'Pandurang', 'Rajaram', 'Shankar', 'Trimbak', 'Vasant', 'Waman', 'Yashwant', 'Bhau'];

const PLACES = [
  { district: 'Pune', taluka: 'Mulshi', villages: ['Paud', 'Kolvan', 'Pirangut', 'Ghotawade'] },
  { district: 'Pune', taluka: 'Haveli', villages: ['Wagholi', 'Loni', 'Theur'] },
  { district: 'Nashik', taluka: 'Nashik', villages: ['Deolali', 'Adgaon', 'Pathardi'] },
  { district: 'Nagpur', taluka: 'Kamptee', villages: ['Kanhan', 'Yerkheda'] },
  { district: 'Ahmednagar', taluka: 'Shrigonda', villages: ['Shirur', 'Belwandi'] },
];

const BLOOD = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B+', 'O+'];

function report(label, before, after) {
  console.log(`  ${label.padEnd(18)} ${String(before).padStart(4)} -> ${after}`);
}

/**
 * Maps record index -> how many days back it happened, weighted so recent
 * months hold more records than older ones.
 *
 * A flat modulo spread produces a jagged chart; this yields a smooth upward
 * adoption curve across the last 7 months, which is what the trend line is
 * meant to convey.
 */
function monthsBackWeighted(index, total) {
  // Share of records per month, oldest first. Sums to 1.
  const weights = [0.04, 0.07, 0.11, 0.15, 0.18, 0.21, 0.24];
  const fraction = index / total;

  let cumulative = 0;
  for (let m = 0; m < weights.length; m++) {
    cumulative += weights[m];
    if (fraction <= cumulative) {
      const monthsAgo = weights.length - 1 - m;
      // Spread within the month so points are not all on the same day.
      return monthsAgo * 30 + (index % 28);
    }
  }
  return index % 28;
}

const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;

// ─── Patients ───────────────────────────────────────────────────────────────
const patientsBefore = count('patients');
if (patientsBefore < TARGET) {
  const asha = db.prepare("SELECT id FROM users WHERE role='ASHA' AND email LIKE 'demo.%'").get();

  transaction(() => {
    const ins = db.prepare(`
      INSERT INTO patients (id, abha_id, name, date_of_birth, gender, phone, address,
        district, taluka, village, blood_group, emergency_contact, emergency_contact_phone,
        assigned_asha_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (let i = patientsBefore; i < TARGET; i++) {
      const female = i % 2 === 1;
      // Treat the index as a mixed-radix number over the three name lists, so
      // each record lands on its own (first, middle, surname) combination.
      // Multiplying the index by a stride instead made the lists realign every
      // 32 records and repeat whole names four times each.
      const nameIndex = Math.floor(i / 2); // each half of the pair alternates sex
      const first = female
        ? pick(FIRST_F, nameIndex)
        : pick(FIRST_M, nameIndex);
      // Rotate the surname per record as well as per block, so consecutive
      // rows do not all share one surname while staying a unique combination.
      const surname = pick(
        SURNAMES,
        nameIndex + Math.floor(nameIndex / SURNAMES.length)
      );
      const middle = pick(MIDDLE, nameIndex + Math.floor(nameIndex / MIDDLE.length));
      const place = pick(PLACES, i);
      // Ages spread 1-80 so paediatric, adult and elderly cohorts all appear.
      const age = 1 + ((i * 7) % 80);
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - age);
      dob.setMonth((i * 3) % 12);
      const ts = new Date(Date.now() - (i % 180) * 86400000).toISOString();

      ins.run(
        uid(),
        `91-${1000 + i}-${2000 + i}-${3000 + i}`,
        `${first} ${middle} ${surname}`,
        dob.toISOString().slice(0, 10),
        female ? 'FEMALE' : 'MALE',
        `+9198${String(76000000 + i * 137).slice(0, 8)}`,
        `House ${100 + i}, ${pick(place.villages, i)}`,
        place.district, place.taluka, pick(place.villages, i),
        pick(BLOOD, i),
        `${pick(FIRST_F, i * 5 + 3)} ${surname}`,
        `+9198${String(65000000 + i * 211).slice(0, 8)}`,
        // Only Pune patients fall under the demo ASHA worker's caseload.
        place.district === 'Pune' ? asha?.id ?? null : null,
        ts, ts
      );
    }
  });
}
report('patients', patientsBefore, count('patients'));

const patients = db.prepare('SELECT * FROM patients').all();
const doctor = db.prepare("SELECT * FROM users WHERE role='DOCTOR' AND email LIKE 'demo.%'").get();
const specialist = db.prepare("SELECT * FROM users WHERE role='SPECIALIST' AND email LIKE 'demo.%'").get();
const asha = db.prepare("SELECT * FROM users WHERE role='ASHA' AND email LIKE 'demo.%'").get();
const facilities = db.prepare('SELECT * FROM facilities').all();
const phc = facilities.find((f) => f.name.includes('PHC Paud')) ?? facilities[0];

// ─── Appointments ───────────────────────────────────────────────────────────
const apptBefore = count('appointments');
if (apptBefore < TARGET) {
  const REASONS = ['Follow-up review', 'New complaint', 'Routine check-up', 'Antenatal visit',
    'NCD follow-up', 'Post-discharge review', 'Immunisation counselling', 'Lab result review'];

  transaction(() => {
    const ins = db.prepare(`
      INSERT INTO appointments (id, patient_id, doctor_id, facility_id, specialty,
        appointment_date, appointment_time, type, status, reason, token_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (let i = apptBefore; i < TARGET; i++) {
      // Spread across past and future so upcoming and completed tabs both fill.
      const offset = (i % 60) - 40;
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const status = offset < 0 ? (i % 9 === 0 ? 'CANCELLED' : 'COMPLETED') : 'BOOKED';
      const hour = 9 + (i % 8);

      ins.run(uid(), pick(patients, i).id, doctor.id, pick(facilities, i).id,
              'General Medicine', d.toISOString().slice(0, 10),
              `${String(hour).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
              i % 7 === 0 ? 'TELEMEDICINE' : 'IN_PERSON',
              status, pick(REASONS, i), (i % 40) + 1,
              d.toISOString(), d.toISOString());
    }
  });
}
report('appointments', apptBefore, count('appointments'));

// ─── Consultations ──────────────────────────────────────────────────────────
const consultBefore = count('consultations');
if (consultBefore < TARGET) {
  const CASES = [
    ['Fever and body ache', 'Acute viral fever'],
    ['Persistent cough', 'Upper respiratory tract infection'],
    ['Headache and dizziness', 'Essential hypertension'],
    ['Fatigue and thirst', 'Type 2 diabetes mellitus'],
    ['Joint pain', 'Osteoarthritis'],
    ['Abdominal discomfort', 'Acid peptic disease'],
    ['Antenatal review', 'Antenatal care — uncomplicated'],
    ['Breathlessness on exertion', 'Anaemia under evaluation'],
    ['Skin rash', 'Contact dermatitis'],
    ['Loose motions', 'Acute gastroenteritis'],
  ];

  transaction(() => {
    const ins = db.prepare(`
      INSERT INTO consultations (id, patient_id, doctor_id, facility_id, chief_complaint,
        symptoms, examination, diagnosis, clinical_notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)`);

    for (let i = consultBefore; i < TARGET; i++) {
      const [complaint, diagnosis] = pick(CASES, i);
      // Weighted towards recent months so the trend chart shows adoption
      // rising rather than a flat or jagged line.
      const ts = new Date(Date.now() - monthsBackWeighted(i, TARGET) * 86400000).toISOString();
      ins.run(uid(), pick(patients, i).id, doctor.id, pick(facilities, i).id,
              complaint, JSON.stringify(complaint.toLowerCase().split(' and ')),
              'Systemic examination unremarkable.', diagnosis,
              'Advice given; review if symptoms persist.', ts, ts);
    }
  });
}
report('consultations', consultBefore, count('consultations'));

// ─── Prescriptions ──────────────────────────────────────────────────────────
const rxBefore = count('prescriptions');
if (rxBefore < TARGET) {
  const MEDS = [
    ['Tab Paracetamol 500mg', '1 tablet', '1-1-1', '5 days'],
    ['Tab Amoxicillin 500mg', '1 capsule', '1-0-1', '7 days'],
    ['Tab Amlodipine 5mg', '1 tablet', '1-0-0', '30 days'],
    ['Tab Metformin 500mg', '1 tablet', '1-0-1', '30 days'],
    ['Tab Iron Folic Acid', '1 tablet', '0-0-1', '90 days'],
    ['ORS Sachet', '1 sachet', 'As needed', '3 days'],
  ];

  transaction(() => {
    const insR = db.prepare(`
      INSERT INTO prescriptions (id, patient_id, doctor_id, facility_id, diagnosis,
        instructions, status, issued_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`);
    const insI = db.prepare(`
      INSERT INTO prescription_items (id, prescription_id, medicine_name, dosage,
        frequency, duration, route, timing, quantity, instructions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'Oral', ?, ?, ?, ?)`);

    for (let i = rxBefore; i < TARGET; i++) {
      const rid = uid();
      const ts = new Date(Date.now() - (i * 1.4 % 180) * 86400000).toISOString();
      insR.run(rid, pick(patients, i).id, doctor.id, pick(facilities, i).id,
               'Clinical review', 'Take medicines as directed. Return if symptoms worsen.',
               ts, ts, ts);

      // One or two medicines per prescription.
      const n = 1 + (i % 2);
      for (let j = 0; j < n; j++) {
        const m = pick(MEDS, i + j);
        insI.run(uid(), rid, m[0], m[1], m[2], m[3],
                 JSON.stringify(['morning']), 10 + j * 5, 'Take after food', ts);
      }
    }
  });
}
report('prescriptions', rxBefore, count('prescriptions'));

// ─── Referrals ──────────────────────────────────────────────────────────────
const refBefore = count('referrals');
if (refBefore < TARGET) {
  const SPECIALTIES = ['Cardiology', 'Obstetrics', 'General Surgery', 'Orthopaedics',
    'Paediatrics', 'Nephrology', 'Neurology'];
  const URGENCIES = ['ROUTINE', 'ROUTINE', 'ROUTINE', 'URGENT', 'URGENT', 'EMERGENCY'];
  const STATUSES = ['COMPLETED', 'COMPLETED', 'ACCEPTED', 'SENT', 'IN_CONSULTATION', 'ARRIVED'];
  const hospital = facilities.find((f) => f.type === 'MEDICAL_COLLEGE') ?? facilities[0];

  transaction(() => {
    const insR = db.prepare(`
      INSERT INTO referrals (id, referral_code, patient_id, referred_by, referred_to,
        source_facility_id, destination_facility_id, specialty, reason, urgency,
        clinical_summary, status, created_at, updated_at, accepted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insE = db.prepare(`
      INSERT INTO referral_events (id, referral_id, status, actor_id, created_at)
      VALUES (?, ?, ?, ?, ?)`);

    for (let i = refBefore; i < TARGET; i++) {
      const rid = uid();
      const specialty = pick(SPECIALTIES, i);
      const status = pick(STATUSES, i);
      const ts = new Date(Date.now() - monthsBackWeighted(i, TARGET) * 86400000).toISOString();
      const accepted = status === 'SENT' ? null
        : new Date(new Date(ts).getTime() + 3600000).toISOString();

      insR.run(rid, `REF-2026-${200000 + i}`, pick(patients, i).id, doctor.id,
               status === 'SENT' ? null : specialist?.id ?? null,
               phc.id, hospital.id, specialty,
               `${specialty} opinion required`, pick(URGENCIES, i),
               `Referred for ${specialty} evaluation and management.`,
               status, ts, ts, accepted);

      // Timeline up to the current status.
      const flow = ['CREATED', 'SENT', 'ACCEPTED', 'ARRIVED', 'IN_CONSULTATION', 'COMPLETED'];
      const upto = flow.indexOf(status);
      flow.slice(0, upto < 0 ? 2 : upto + 1).forEach((s, j) => {
        insE.run(uid(), rid, s, j < 2 ? doctor.id : specialist?.id ?? doctor.id,
                 new Date(new Date(ts).getTime() + j * 3600000).toISOString());
      });
    }
  });
}
report('referrals', refBefore, count('referrals'));

// ─── Tasks ──────────────────────────────────────────────────────────────────
const taskBefore = count('tasks');
if (taskBefore < TARGET) {
  const TITLES = [
    ['ANC follow-up visit', 'anc_checkup'], ['Immunisation due', 'immunization'],
    ['NCD screening', 'ncd_screening'], ['Home visit — TB adherence', 'home_visit'],
    ['Postnatal check', 'follow_up'], ['Household register update', 'general'],
    ['Danger sign follow-up', 'danger_sign_check'], ['Growth monitoring', 'follow_up'],
  ];
  const PRIORITIES = ['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'HIGH', 'URGENT'];
  const STATUSES = ['TODO', 'TODO', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED'];

  transaction(() => {
    const ins = db.prepare(`
      INSERT INTO tasks (id, assigned_to, created_by, patient_id, facility_id, type,
        title, description, priority, due_date, status, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (let i = taskBefore; i < TARGET; i++) {
      const [title, type] = pick(TITLES, i);
      const status = pick(STATUSES, i);
      const d = new Date();
      d.setDate(d.getDate() + ((i % 30) - 12));
      ins.run(uid(), asha?.id ?? doctor.id, doctor.id, pick(patients, i).id, phc.id, type,
              title, `${title} for ${pick(patients, i).name}`, pick(PRIORITIES, i),
              d.toISOString().slice(0, 10), status,
              status === 'COMPLETED' ? d.toISOString() : null,
              new Date().toISOString(), new Date().toISOString());
    }
  });
}
report('tasks', taskBefore, count('tasks'));

// ─── Lab orders ─────────────────────────────────────────────────────────────
const labBefore = count('lab_orders');
if (labBefore < TARGET) {
  const TESTS = [
    ['Complete Blood Count', 'Pathology', '11.4', 'g/dL', '13.0-17.0', 'LOW'],
    ['Fasting Blood Glucose', 'Biochemistry', '138', 'mg/dL', '70-100', 'HIGH'],
    ['Lipid Profile', 'Biochemistry', '186', 'mg/dL', '<200', 'NORMAL'],
    ['Serum Creatinine', 'Biochemistry', '0.9', 'mg/dL', '0.6-1.2', 'NORMAL'],
    ['Haemoglobin', 'Pathology', '9.2', 'g/dL', '12.0-15.0', 'LOW'],
    ['Urine Routine', 'Pathology', 'Normal', null, null, 'NORMAL'],
    ['Chest X-Ray PA', 'Radiology', 'No active lesion', null, null, 'NORMAL'],
  ];
  const STATUSES = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PROCESSING', 'SAMPLE_COLLECTED', 'ORDERED'];

  transaction(() => {
    const insO = db.prepare(`
      INSERT INTO lab_orders (id, patient_id, doctor_id, facility_id, test_name, category,
        priority, status, ordered_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insR = db.prepare(`
      INSERT INTO lab_results (id, lab_order_id, result, unit, reference_range,
        abnormal_flag, verified_by, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (let i = labBefore; i < TARGET; i++) {
      const t = pick(TESTS, i);
      const status = pick(STATUSES, i);
      const oid = uid();
      const ts = new Date(Date.now() - (i % 90) * 86400000).toISOString();

      insO.run(oid, pick(patients, i).id, doctor.id, pick(facilities, i).id, t[0], t[1],
               i % 11 === 0 ? 'URGENT' : 'ROUTINE', status, ts, ts, ts);

      if (status === 'COMPLETED') {
        insR.run(uid(), oid, t[2], t[3], t[4], t[5], doctor.id, ts, ts);
      }
    }
  });
}
report('lab_orders', labBefore, count('lab_orders'));

// ─── Vaccinations ───────────────────────────────────────────────────────────
const vaccBefore = count('vaccinations');
if (vaccBefore < TARGET) {
  const VACCINES = [
    ['BCG', 'Birth'], ['OPV-0', 'Birth'], ['Pentavalent-1', '6 weeks'],
    ['Pentavalent-2', '10 weeks'], ['Pentavalent-3', '14 weeks'],
    ['Measles-Rubella 1', '9 months'], ['Vitamin A', '9 months'], ['DPT Booster', '18 months'],
  ];
  const STATUSES = ['GIVEN', 'GIVEN', 'GIVEN', 'DUE', 'DUE', 'OVERDUE'];

  transaction(() => {
    const ins = db.prepare(`
      INSERT INTO vaccinations (id, patient_id, vaccine_name, dose, scheduled_date,
        administered_date, administered_by, facility_id, batch_number, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (let i = vaccBefore; i < TARGET; i++) {
      const [name, dose] = pick(VACCINES, i);
      const status = pick(STATUSES, i);
      const d = new Date();
      d.setDate(d.getDate() + ((i % 90) - 60));
      const scheduled = d.toISOString().slice(0, 10);

      ins.run(uid(), pick(patients, i).id, name, dose, scheduled,
              status === 'GIVEN' ? scheduled : null,
              status === 'GIVEN' ? asha?.id ?? null : null,
              phc.id, status === 'GIVEN' ? `V-2026${100 + i}` : null,
              status, new Date().toISOString(), new Date().toISOString());
    }
  });
}
report('vaccinations', vaccBefore, count('vaccinations'));

// ─── Home visits ────────────────────────────────────────────────────────────
const hvBefore = count('home_visits');
if (hvBefore < TARGET) {
  const PURPOSES = ['Routine ANC check', 'NCD follow-up', 'Child growth monitoring',
    'Post-referral follow-up', 'Immunisation reminder', 'TB adherence check'];
  const RISKS = ['LOW', 'LOW', 'LOW', 'MODERATE', 'MODERATE', 'HIGH'];

  transaction(() => {
    const ins = db.prepare(`
      INSERT INTO home_visits (id, asha_id, patient_id, household_id, visit_date, purpose,
        observations, symptoms, danger_signs, risk_level, referral_recommended, notes,
        next_visit_date, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, ?)`);

    for (let i = hvBefore; i < TARGET; i++) {
      const risk = pick(RISKS, i);
      const d = new Date();
      d.setDate(d.getDate() - (i % 120));
      const next = new Date(d); next.setDate(next.getDate() + 30);

      ins.run(uid(), asha?.id ?? doctor.id, pick(patients, i).id, `HH-${100 + i}`,
              d.toISOString().slice(0, 10), pick(PURPOSES, i),
              'Household visited; family counselled on follow-up care.',
              JSON.stringify([]), JSON.stringify(risk === 'HIGH' ? ['raised blood pressure'] : []),
              risk, risk === 'HIGH' ? 1 : 0, null,
              next.toISOString().slice(0, 10),
              new Date().toISOString(), new Date().toISOString());
    }
  });
}
report('home_visits', hvBefore, count('home_visits'));

// ─── NCD screenings ─────────────────────────────────────────────────────────
const ncdBefore = count('ncd_screenings');
if (ncdBefore < TARGET) {
  transaction(() => {
    const ins = db.prepare(`
      INSERT INTO ncd_screenings (id, patient_id, screened_by, facility_id, screening_date,
        age, blood_pressure_systolic, blood_pressure_diastolic, blood_glucose, bmi,
        waist_circumference, tobacco_use, alcohol_use, physical_activity_adequate,
        family_history, cbac_score, risk_category, suspected_diabetes, suspected_hypertension,
        recommendations, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (let i = ncdBefore; i < TARGET; i++) {
      const age = 30 + (i % 45);
      const sys = 110 + (i % 60);
      const glucose = 85 + (i % 90);
      const score = Math.min(2 + (i % 8), 11);
      const risk = score >= 7 ? 'HIGH' : score >= 4 ? 'MODERATE' : 'LOW';
      const d = new Date();
      d.setDate(d.getDate() - (i % 150));

      ins.run(uid(), pick(patients, i).id, asha?.id ?? null, phc.id,
              d.toISOString().slice(0, 10), age, sys, 70 + (i % 30), glucose,
              20 + (i % 12), 75 + (i % 35), i % 4 === 0 ? 1 : 0, i % 6 === 0 ? 1 : 0,
              i % 3 === 0 ? 0 : 1, i % 5 === 0 ? 1 : 0, score, risk,
              glucose >= 140 ? 1 : 0, sys >= 140 ? 1 : 0,
              JSON.stringify(risk === 'LOW'
                ? ['No immediate risk factors identified. Repeat screening as per programme schedule.']
                : ['CBAC score is at or above the referral threshold — refer for NCD evaluation at the PHC.']),
              new Date().toISOString());
    }
  });
}
report('ncd_screenings', ncdBefore, count('ncd_screenings'));

console.log('\nDone.');
