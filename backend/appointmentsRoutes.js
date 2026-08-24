import { Router } from 'express';
import crypto from 'crypto';
import db from './db.js';
import { requireAuth } from './middleware/auth.js';

const router = Router();
const TYPES = ['in-person', 'telemedicine'];

router.use(requireAuth);

function toPublicAppointment(row) {
  return {
    id: row.id,
    doctor: row.doctor_name,
    specialty: row.specialty,
    facility: row.facility,
    date: row.date,
    time: row.time,
    type: row.type,
    status: row.status,
    reason: row.reason || '',
    tokenNumber: row.token_number ?? undefined,
  };
}

// ─── GET /api/appointments ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM appointments WHERE patient_id = ? ORDER BY date ASC, time ASC')
    .all(req.user.id);
  res.json(rows.map(toPublicAppointment));
});

// ─── POST /api/appointments ─────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { doctor, specialty, facility, date, time, type, reason } = req.body || {};

  if (!doctor || !specialty || !facility || !date || !time || !type) {
    return res.status(400).json({ error: 'Doctor, specialty, facility, date, time and type are all required.' });
  }
  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid appointment type.' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const tokenNumber = Math.floor(1 + Math.random() * 40);

  db.prepare(
    `INSERT INTO appointments (id, patient_id, doctor_name, specialty, facility, date, time, type, status, reason, token_number, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?, ?)`
  ).run(id, req.user.id, doctor, specialty, facility, date, time, type, reason || null, tokenNumber, now, now);

  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  res.status(201).json(toPublicAppointment(row));
});

// ─── PATCH /api/appointments/:id/cancel ─────────────────────────────────────
router.patch('/:id/cancel', (req, res) => {
  const row = db.prepare('SELECT * FROM appointments WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Appointment not found.' });
  if (row.status !== 'upcoming') {
    return res.status(400).json({ error: 'Only upcoming appointments can be cancelled.' });
  }

  db.prepare('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?').run(
    'cancelled',
    new Date().toISOString(),
    row.id
  );

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(row.id);
  res.json(toPublicAppointment(updated));
});

// ─── PATCH /api/appointments/:id/reschedule ─────────────────────────────────
router.patch('/:id/reschedule', (req, res) => {
  const { date, time } = req.body || {};
  if (!date || !time) {
    return res.status(400).json({ error: 'Date and time are required.' });
  }

  const row = db.prepare('SELECT * FROM appointments WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Appointment not found.' });
  if (row.status !== 'upcoming') {
    return res.status(400).json({ error: 'Only upcoming appointments can be rescheduled.' });
  }

  db.prepare('UPDATE appointments SET date = ?, time = ?, updated_at = ? WHERE id = ?').run(
    date,
    time,
    new Date().toISOString(),
    row.id
  );

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(row.id);
  res.json(toPublicAppointment(updated));
});

export default router;
