import crypto from 'crypto';
import { getDb } from '../db/connection.js';

const now = () => new Date().toISOString();

const SELECT_BASE = `
  SELECT r.*,
         p.name AS patient_name, p.date_of_birth AS patient_dob, p.gender AS patient_gender,
         rb.name AS referred_by_name,
         rt.name AS referred_to_name,
         sf.name AS source_facility_name,
         df.name AS destination_facility_name
  FROM referrals r
  LEFT JOIN patients p ON p.id = r.patient_id
  LEFT JOIN users rb ON rb.id = r.referred_by
  LEFT JOIN users rt ON rt.id = r.referred_to
  LEFT JOIN facilities sf ON sf.id = r.source_facility_id
  LEFT JOIN facilities df ON df.id = r.destination_facility_id
`;

function generateReferralCode(db) {
  // Human-readable and unique enough for a demo scale; retried on collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `REF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
    if (!db.prepare('SELECT 1 FROM referrals WHERE referral_code = ?').get(code)) return code;
  }
  return `REF-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
}

export const referralRepository = {
  findById(id, db = getDb()) {
    return db.prepare(`${SELECT_BASE} WHERE r.id = ?`).get(id);
  },

  listEvents(referralId, db = getDb()) {
    return db
      .prepare(`
        SELECT e.*, u.name AS actor_name
        FROM referral_events e
        LEFT JOIN users u ON u.id = e.actor_id
        WHERE e.referral_id = ?
        ORDER BY e.created_at ASC
      `)
      .all(referralId);
  },

  list({ patientIds, status, urgency, destinationFacilityId, sourceFacilityId,
         referredTo, page = 1, limit = 20 }, db = getDb()) {
    const where = [];
    const params = [];

    if (patientIds) {
      if (patientIds.length === 0) return { items: [], total: 0 };
      where.push(`r.patient_id IN (${patientIds.map(() => '?').join(',')})`);
      params.push(...patientIds);
    }
    if (status) { where.push('r.status = ?'); params.push(status); }
    if (urgency) { where.push('r.urgency = ?'); params.push(urgency); }
    if (destinationFacilityId) { where.push('r.destination_facility_id = ?'); params.push(destinationFacilityId); }
    if (sourceFacilityId) { where.push('r.source_facility_id = ?'); params.push(sourceFacilityId); }
    if (referredTo) { where.push('r.referred_to = ?'); params.push(referredTo); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS c FROM referrals r ${whereSql}`).get(...params).c;

    // Emergency cases surface first, then most recent.
    const items = db
      .prepare(`
        ${SELECT_BASE} ${whereSql}
        ORDER BY CASE r.urgency WHEN 'EMERGENCY' THEN 0 WHEN 'URGENT' THEN 1 ELSE 2 END,
                 r.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, limit, (page - 1) * limit);

    return { items, total };
  },

  create(data, db = getDb()) {
    const id = data.id || crypto.randomUUID();
    const ts = now();

    db.prepare(`
      INSERT INTO referrals (id, referral_code, patient_id, referred_by, referred_to,
        source_facility_id, destination_facility_id, specialty, reason, urgency,
        clinical_summary, diagnosis, status, ai_priority_score, ai_rationale,
        created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, generateReferralCode(db), data.patientId, data.referredBy ?? null, data.referredTo ?? null,
      data.sourceFacilityId ?? null, data.destinationFacilityId ?? null,
      data.specialty ?? null, data.reason ?? null, data.urgency || 'ROUTINE',
      data.clinicalSummary ?? null, data.diagnosis ?? null, data.status || 'CREATED',
      data.aiPriorityScore ?? null, data.aiRationale ?? null, ts, ts
    );

    return this.findById(id, db);
  },

  addEvent(referralId, { status, note, actorId }, db = getDb()) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO referral_events (id, referral_id, status, note, actor_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, referralId, status, note ?? null, actorId ?? null, now());
    return db.prepare('SELECT * FROM referral_events WHERE id = ?').get(id);
  },

  updateStatus(id, status, extra = {}, db = getDb()) {
    const sets = ['status = ?', 'updated_at = ?'];
    const params = [status, now()];

    if (extra.acceptedAt !== undefined) { sets.push('accepted_at = ?'); params.push(extra.acceptedAt); }
    if (extra.completedAt !== undefined) { sets.push('completed_at = ?'); params.push(extra.completedAt); }
    if (extra.referredTo !== undefined) { sets.push('referred_to = ?'); params.push(extra.referredTo); }
    if (extra.allocatedBedId !== undefined) { sets.push('allocated_bed_id = ?'); params.push(extra.allocatedBedId); }

    params.push(id);
    db.prepare(`UPDATE referrals SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id, db);
  },
};
