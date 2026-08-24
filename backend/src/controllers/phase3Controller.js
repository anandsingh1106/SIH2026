import * as referralService from '../services/referralService.js';
import * as labService from '../services/labService.js';
import * as bedService from '../services/bedService.js';
import * as notificationService from '../services/notificationService.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function meta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

// ─── Shapers ────────────────────────────────────────────────────────────────

function toPublicReferralEvent(row) {
  return {
    id: row.id,
    status: row.status,
    note: row.note || undefined,
    actorName: row.actor_name || undefined,
    timestamp: row.created_at,
  };
}

function toPublicReferral(row, events) {
  return {
    id: row.id,
    referralCode: row.referral_code,
    patientId: row.patient_id,
    patientName: row.patient_name || undefined,
    referredBy: row.referred_by || undefined,
    referredByName: row.referred_by_name || undefined,
    referredTo: row.referred_to || undefined,
    referredToName: row.referred_to_name || undefined,
    sourceFacilityId: row.source_facility_id || undefined,
    sourceFacilityName: row.source_facility_name || undefined,
    destinationFacilityId: row.destination_facility_id || undefined,
    destinationFacilityName: row.destination_facility_name || undefined,
    specialty: row.specialty || undefined,
    reason: row.reason || undefined,
    urgency: row.urgency,
    clinicalSummary: row.clinical_summary || undefined,
    diagnosis: row.diagnosis || undefined,
    status: row.status,
    allocatedBedId: row.allocated_bed_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acceptedAt: row.accepted_at || undefined,
    completedAt: row.completed_at || undefined,
    history: events ? events.map(toPublicReferralEvent) : undefined,
  };
}

function toPublicLabResult(row) {
  return {
    id: row.id,
    result: row.result || undefined,
    unit: row.unit || undefined,
    referenceRange: row.reference_range || undefined,
    abnormalFlag: row.abnormal_flag || undefined,
    notes: row.notes || undefined,
    verifiedAt: row.verified_at || undefined,
  };
}

function toPublicLabOrder(row, results) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || undefined,
    doctorId: row.doctor_id || undefined,
    doctorName: row.doctor_name || undefined,
    facilityName: row.facility_name || undefined,
    testName: row.test_name,
    category: row.category || undefined,
    priority: row.priority,
    status: row.status,
    notes: row.notes || undefined,
    orderedAt: row.ordered_at,
    results: results ? results.map(toPublicLabResult) : undefined,
  };
}

function toPublicBed(row) {
  return {
    id: row.id,
    facilityId: row.facility_id,
    facilityName: row.facility_name || undefined,
    ward: row.ward || undefined,
    bedNumber: row.bed_number,
    type: row.type,
    status: row.status,
    isOccupied: row.status === 'OCCUPIED',
    patientName: row.patient_name || undefined,
    allocatedAt: row.allocated_at || undefined,
  };
}

function toPublicNotification(row) {
  let metadata;
  try { metadata = row.metadata ? JSON.parse(row.metadata) : undefined; } catch { metadata = undefined; }
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message || undefined,
    priority: row.priority,
    link: row.link || undefined,
    metadata,
    isRead: !!row.read,
    timestamp: row.created_at,
  };
}

// ─── Referrals ──────────────────────────────────────────────────────────────

export function getReferrals(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = referralService.listReferrals(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map((r) => toPublicReferral(r)), { page, limit, total });
  } catch (err) { next(err); }
}

export function getReferralById(req, res, next) {
  try {
    const row = referralService.getReferral(req.user, req.params.id, meta(req));
    return sendSuccess(res, toPublicReferral(row, row.events));
  } catch (err) { next(err); }
}

export function postReferral(req, res, next) {
  try {
    const row = referralService.createReferral(req.user, req.body, meta(req));
    return sendSuccess(res, toPublicReferral(row, row.events), 201);
  } catch (err) { next(err); }
}

/** Generic transition endpoint: PATCH /api/referrals/:id with { status }. */
export function patchReferral(req, res, next) {
  try {
    const row = referralService.transitionReferral(
      req.user, req.params.id, req.body.status, { note: req.body.note }, meta(req)
    );
    return sendSuccess(res, toPublicReferral(row, row.events));
  } catch (err) { next(err); }
}

/** Builds the named action endpoints (accept/reject/arrive/complete). */
export function referralAction(status) {
  return (req, res, next) => {
    try {
      const row = referralService.transitionReferral(
        req.user, req.params.id, status, { note: req.body?.note }, meta(req)
      );
      return sendSuccess(res, toPublicReferral(row, row.events));
    } catch (err) { next(err); }
  };
}

// ─── Labs ───────────────────────────────────────────────────────────────────

export function getLabOrders(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = labService.listLabOrders(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map((r) => toPublicLabOrder(r)), { page, limit, total });
  } catch (err) { next(err); }
}

export function getLabOrderById(req, res, next) {
  try {
    const row = labService.getLabOrder(req.user, req.params.id, meta(req));
    return sendSuccess(res, toPublicLabOrder(row, row.results));
  } catch (err) { next(err); }
}

export function postLabOrder(req, res, next) {
  try {
    const row = labService.createLabOrder(req.user, req.body, meta(req));
    return sendSuccess(res, toPublicLabOrder(row), 201);
  } catch (err) { next(err); }
}

export function patchLabOrder(req, res, next) {
  try {
    const row = labService.updateLabOrderStatus(req.user, req.params.id, req.body.status, meta(req));
    return sendSuccess(res, toPublicLabOrder(row));
  } catch (err) { next(err); }
}

export function postLabResult(req, res, next) {
  try {
    const row = labService.recordLabResult(req.user, req.params.id, req.body, meta(req));
    return sendSuccess(res, toPublicLabResult(row), 201);
  } catch (err) { next(err); }
}

// ─── Beds ───────────────────────────────────────────────────────────────────

export function getBeds(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = bedService.listBeds({ ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicBed), { page, limit, total });
  } catch (err) { next(err); }
}

export function getBedAvailability(req, res, next) {
  try {
    const rows = bedService.bedAvailability({ facilityId: req.validatedQuery?.facilityId });
    return sendSuccess(res, rows.map((r) => ({
      facilityId: r.facility_id,
      facilityName: r.facility_name,
      type: r.type,
      total: r.total,
      available: r.available,
      occupied: r.occupied,
    })));
  } catch (err) { next(err); }
}

export function postBed(req, res, next) {
  try {
    const row = bedService.createBed(req.user, req.body, meta(req));
    return sendSuccess(res, toPublicBed(row), 201);
  } catch (err) { next(err); }
}

export function postBedAllocation(req, res, next) {
  try {
    const row = bedService.allocateBed(req.user, req.params.id, req.body, meta(req));
    return sendSuccess(res, {
      id: row.id, bedId: row.bed_id, patientId: row.patient_id,
      allocatedAt: row.allocated_at,
    }, 201);
  } catch (err) { next(err); }
}

export function postBedRelease(req, res, next) {
  try {
    const row = bedService.releaseBed(req.user, req.params.id, meta(req));
    return sendSuccess(res, toPublicBed(row));
  } catch (err) { next(err); }
}

export function patchBedStatus(req, res, next) {
  try {
    const row = bedService.updateBedStatus(req.user, req.params.id, req.body.status, meta(req));
    return sendSuccess(res, toPublicBed(row));
  } catch (err) { next(err); }
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function getNotifications(req, res, next) {
  try {
    const { page, limit, unreadOnly } = req.validatedQuery;
    const { items, total } = notificationService.listNotifications(req.user, { unreadOnly, page, limit });
    return sendPaginated(res, items.map(toPublicNotification), { page, limit, total });
  } catch (err) { next(err); }
}

export function getUnreadCount(req, res, next) {
  try {
    return sendSuccess(res, { unread: notificationService.unreadCount(req.user) });
  } catch (err) { next(err); }
}

export function patchNotificationRead(req, res, next) {
  try {
    const row = notificationService.markRead(req.user, req.params.id);
    return sendSuccess(res, toPublicNotification(row));
  } catch (err) { next(err); }
}

export function postReadAll(req, res, next) {
  try {
    return sendSuccess(res, notificationService.markAllRead(req.user));
  } catch (err) { next(err); }
}
