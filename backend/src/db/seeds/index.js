import { getDb, transaction } from '../connection.js';

/**
 * Demo/seed data for development and SIH demonstration.
 *
 * All records use `demo-` prefixed ids and clearly fictional people so they are
 * unmistakably test data. Seeding is idempotent: rows are inserted only when a
 * row with the same id is absent, so re-running never duplicates.
 */

const now = () => new Date().toISOString();

const FACILITIES = [
  {
    id: 'demo-fac-phc-paud', name: 'PHC Paud (Demo)', type: 'PHC',
    address: 'Paud Village, Mulshi Taluka', district: 'Pune', taluka: 'Mulshi', village: 'Paud',
    latitude: 18.5204, longitude: 73.5100, phone: '020-22923011',
    emergency_available: 1,
  },
  {
    id: 'demo-fac-chc-mulshi', name: 'CHC Mulshi (Demo)', type: 'CHC',
    address: 'Mulshi Block HQ', district: 'Pune', taluka: 'Mulshi', village: 'Mulshi',
    latitude: 18.5100, longitude: 73.4900, phone: '020-22923100',
    emergency_available: 1,
  },
  {
    id: 'demo-fac-dh-aundh', name: 'District Hospital Aundh (Demo)', type: 'DISTRICT_HOSPITAL',
    address: 'Aundh, Pune', district: 'Pune', taluka: 'Haveli', village: 'Aundh',
    latitude: 18.5590, longitude: 73.8070, phone: '020-25885000',
    emergency_available: 1,
  },
  {
    id: 'demo-fac-sassoon', name: 'B.J. Medical College & Sassoon Hospital (Demo)', type: 'MEDICAL_COLLEGE',
    address: 'Station Road, Pune', district: 'Pune', taluka: 'Haveli', village: 'Pune City',
    latitude: 18.5286, longitude: 73.8748, phone: '020-26128000',
    emergency_available: 1,
  },
  // Six sub-centres feed PHC Paud. The rural health norm puts one sub-centre
  // per 5,000 people and one PHC per 30,000, so a PHC sits above roughly six
  // of them — the referral chain is only realistic if the base of the pyramid
  // is wider than the tier above it. Villages and their populations are real
  // settlements in Mulshi taluka (Census 2011).
  {
    id: 'demo-fac-sc-kolvan', name: 'Sub-Center Kolvan (Demo)', type: 'SUB_CENTER',
    address: 'Kolvan Village', district: 'Pune', taluka: 'Mulshi', village: 'Kolvan',
    latitude: 18.5600, longitude: 73.4600, phone: '020-22923055',
    emergency_available: 0,
  },
  {
    id: 'demo-fac-sc-ghotawade', name: 'Sub-Center Ghotawade (Demo)', type: 'SUB_CENTER',
    address: 'Ghotawade Village', district: 'Pune', taluka: 'Mulshi', village: 'Ghotawade',
    latitude: 18.4870, longitude: 73.6570, phone: '020-22923056',
    emergency_available: 0,
  },
  {
    id: 'demo-fac-sc-bhukum', name: 'Sub-Center Bhukum (Demo)', type: 'SUB_CENTER',
    address: 'Bhukum Village', district: 'Pune', taluka: 'Mulshi', village: 'Bhukum',
    latitude: 18.5310, longitude: 73.6890, phone: '020-22923057',
    emergency_available: 0,
  },
  {
    id: 'demo-fac-sc-lavale', name: 'Sub-Center Lavale (Demo)', type: 'SUB_CENTER',
    address: 'Lavale Village', district: 'Pune', taluka: 'Mulshi', village: 'Lavale',
    latitude: 18.5340, longitude: 73.7200, phone: '020-22923058',
    emergency_available: 0,
  },
  {
    id: 'demo-fac-sc-hadshi', name: 'Sub-Center Hadshi (Demo)', type: 'SUB_CENTER',
    address: 'Hadshi Village', district: 'Pune', taluka: 'Mulshi', village: 'Hadshi',
    latitude: 18.5980, longitude: 73.5390, phone: '020-22923059',
    emergency_available: 0,
  },
  {
    id: 'demo-fac-sc-male', name: 'Sub-Center Male (Demo)', type: 'SUB_CENTER',
    address: 'Male Village', district: 'Pune', taluka: 'Mulshi', village: 'Male',
    latitude: 18.5090, longitude: 73.4470, phone: '020-22923060',
    emergency_available: 0,
  },
  // Facilities outside Pune, so district-level views and the multi-district
  // claim on the landing page are backed by real rows.
  {
    id: 'demo-fac-phc-shirur', name: 'PHC Shirur (Demo)', type: 'PHC',
    address: 'Shirur Town', district: 'Ahmednagar', taluka: 'Shrigonda', village: 'Shirur',
    latitude: 18.8280, longitude: 74.3730, phone: '02138-222100',
    emergency_available: 1,
  },
  {
    id: 'demo-fac-dh-nashik', name: 'District Hospital Nashik (Demo)', type: 'DISTRICT_HOSPITAL',
    address: 'Trimbak Road, Nashik', district: 'Nashik', taluka: 'Nashik', village: 'Nashik City',
    latitude: 19.9975, longitude: 73.7898, phone: '0253-2575000',
    emergency_available: 1,
  },
  {
    id: 'demo-fac-chc-nagpur', name: 'CHC Kamptee (Demo)', type: 'CHC',
    address: 'Kamptee, Nagpur', district: 'Nagpur', taluka: 'Kamptee', village: 'Kamptee',
    latitude: 21.2160, longitude: 79.1980, phone: '07109-288400',
    emergency_available: 1,
  },
];

const USERS = [
  {
    id: 'demo-usr-admin', name: 'Demo Administrator', phone: '+919000000001',
    email: 'demo.admin@example.invalid', role: 'ADMIN',
    district: 'Pune', facility_id: null,
  },
  {
    id: 'demo-usr-doctor', name: 'Dr. Demo Deshmukh', phone: '+919000000002',
    email: 'demo.doctor@example.invalid', role: 'DOCTOR',
    district: 'Pune', taluka: 'Mulshi', facility_id: 'demo-fac-phc-paud',
  },
  {
    id: 'demo-usr-specialist', name: 'Dr. Demo Kulkarni', phone: '+919000000003',
    email: 'demo.specialist@example.invalid', role: 'SPECIALIST',
    district: 'Pune', taluka: 'Haveli', facility_id: 'demo-fac-sassoon',
  },
  {
    id: 'demo-usr-asha', name: 'Demo Gaikwad (ASHA)', phone: '+919000000004',
    email: 'demo.asha@example.invalid', role: 'ASHA',
    district: 'Pune', taluka: 'Mulshi', village: 'Paud', facility_id: 'demo-fac-sc-kolvan',
  },
  {
    id: 'demo-usr-patient', name: 'Demo Patil', phone: '+919000000005',
    email: 'demo.patient@example.invalid', role: 'PATIENT',
    district: 'Pune', taluka: 'Mulshi', village: 'Paud', facility_id: null,
    abha_id: '91-0000-0000-0001',
  },
];

const PATIENTS = [
  {
    id: 'demo-pat-1', user_id: 'demo-usr-patient', abha_id: '91-0000-0000-0001',
    name: 'Demo Patil', date_of_birth: '1985-03-12', gender: 'MALE',
    phone: '+919000000005', address: 'House 14, Paud', district: 'Pune',
    taluka: 'Mulshi', village: 'Paud', blood_group: 'O+',
    emergency_contact: 'Demo Patil (Spouse)', emergency_contact_phone: '+919000000015',
    assigned_asha_id: 'demo-usr-asha',
  },
  {
    id: 'demo-pat-2', user_id: null, abha_id: '91-0000-0000-0002',
    name: 'Demo Gaikwad (Patient)', date_of_birth: '1992-07-30', gender: 'FEMALE',
    phone: '+919000000006', address: 'House 22, Kolvan', district: 'Pune',
    taluka: 'Mulshi', village: 'Kolvan', blood_group: 'B+',
    emergency_contact: 'Demo Gaikwad (Spouse)', emergency_contact_phone: '+919000000016',
    assigned_asha_id: 'demo-usr-asha',
  },
  {
    id: 'demo-pat-3', user_id: null, abha_id: '91-0000-0000-0003',
    name: 'Demo Shinde', date_of_birth: '1950-11-05', gender: 'MALE',
    phone: '+919000000007', address: 'House 3, Paud', district: 'Pune',
    taluka: 'Mulshi', village: 'Paud', blood_group: 'A+',
    emergency_contact: 'Demo Shinde (Son)', emergency_contact_phone: '+919000000017',
    assigned_asha_id: 'demo-usr-asha',
  },
];

function seedTable(db, table, rows, columns) {
  const exists = db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`);
  const placeholders = columns.map(() => '?').join(', ');
  const insert = db.prepare(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
  );

  let inserted = 0;
  for (const row of rows) {
    if (exists.get(row.id)) continue;
    insert.run(...columns.map((c) => row[c] ?? null));
    inserted++;
  }
  return inserted;
}

export async function runSeed() {
  const timestamp = now();

  const counts = transaction((db) => {
    const facilities = seedTable(
      db, 'facilities',
      FACILITIES.map((f) => ({ ...f, active: 1, created_at: timestamp, updated_at: timestamp })),
      ['id', 'name', 'type', 'address', 'district', 'taluka', 'village', 'latitude',
       'longitude', 'phone', 'email', 'emergency_available', 'active', 'created_at', 'updated_at']
    );

    const users = seedTable(
      db, 'users',
      USERS.map((u) => ({ ...u, status: 'ACTIVE', created_at: timestamp, updated_at: timestamp })),
      ['id', 'auth_user_id', 'name', 'phone', 'email', 'role', 'status', 'district',
       'taluka', 'village', 'abha_id', 'facility_id', 'created_at', 'updated_at']
    );

    const patients = seedTable(
      db, 'patients',
      PATIENTS.map((p) => ({ ...p, created_at: timestamp, updated_at: timestamp })),
      ['id', 'user_id', 'abha_id', 'name', 'date_of_birth', 'gender', 'phone', 'address',
       'district', 'taluka', 'village', 'blood_group', 'emergency_contact',
       'emergency_contact_phone', 'assigned_asha_id', 'created_at', 'updated_at']
    );

    return { facilities, users, patients };
  });

  console.log(
    `Seed complete — facilities: +${counts.facilities}, users: +${counts.users}, patients: +${counts.patients}`
  );
  console.log('(0 means the rows already existed; seeding is idempotent.)');
  return counts;
}

// Allow `node src/db/seeds/index.js` to run the seed directly.
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  getDb();
  await runSeed();
}
