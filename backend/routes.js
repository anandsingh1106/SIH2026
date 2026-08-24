import { Router } from 'express';
import db from './db.js';

const router = Router();

router.get('/patients', (_req, res) => {
  const rows = db.prepare('SELECT data FROM patients').all();
  res.json(rows.map((r) => JSON.parse(r.data)));
});

router.get('/patients/:id', (req, res) => {
  const row = db.prepare('SELECT data FROM patients WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Patient not found' });
  res.json(JSON.parse(row.data));
});

router.get('/prescriptions', (req, res) => {
  const { patientId } = req.query;
  const rows = patientId
    ? db.prepare('SELECT data FROM prescriptions WHERE patient_id = ?').all(String(patientId))
    : db.prepare('SELECT data FROM prescriptions').all();
  res.json(rows.map((r) => JSON.parse(r.data)));
});

router.get('/prescriptions/:id', (req, res) => {
  const row = db.prepare('SELECT data FROM prescriptions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Prescription not found' });
  res.json(JSON.parse(row.data));
});

export default router;
