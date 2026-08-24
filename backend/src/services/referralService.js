import { getDb, transaction } from '../db/connection.js';
import { referralRepository } from '../repositories/referralRepository.js';
import { patientRepository } from '../repositories/patientRepository.js';
import { accessiblePatientIds, assertPatientAccess, FIELD_ROLES } from './accessControlService.js';
import { recordAudit } from './auditService.js';
import { notify } from './notificationService.js';
import { NotFoundError, AuthorizationError, ConflictError } from '../utils/errors.js';

/**
 * Legal referral transitions. Enforcing this prevents a client from jumping
 * straight to COMPLETED or reviving a cancelled referral.
 */
const TRANSITIONS = {
  CREATED: ['SENT', 'CANCELLED'],
  SENT: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['IN_TRANSIT', 'ARRIVED', 'CANCELLED'],
  REJECTED: [],
  IN_TRANSIT: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['IN_CONSULTATION', 'CANCELLED'],
  IN_CONSULTATION: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function scopeFor(user, db) {
  const scope = accessiblePatientIds(user, db);
  return scope === null ? undefined : scope;
}

export function listReferrals(user, filters = {}) {
  const db = getDb();

  // Specialists primarily work an inbound queue for their facility.
  if (user.role === 'SPECIALIST' && !filters.destinationFacilityId && !filters.sourceFacilityId) {
    return referralRepository.list(
      { ...filters, destinationFacilityId: user.facility_id ?? undefined }, db
    );
  }

  return referralRepository.list({ ...filters, patientIds: scopeFor(user, db) }, db);
}

export function getReferral(user, id, requestMeta = {}) {
  const db = getDb();
  const referral = referralRepository.findById(id, db);
  if (!referral) throw new NotFoundError('Referral');

  // A specialist at the destination facility may read it even before accepting.
  const isDestinationStaff =
    (user.role === 'SPECIALIST' || user.role === 'DOCTOR') &&
    user.facility_id && referral.destination_facility_id === user.facility_id;

  if (!isDestinationStaff && user.role !== 'ADMIN') {
    assertPatientAccess(user, referral.patient_id, db);
  }

  recordAudit(
    { actorId: user.id, action: 'VIEW_REFERRAL', entityType: 'referral', entityId: id, ...requestMeta },
    db
  );

  return { ...referral, events: referralRepository.listEvents(id, db) };
}

export function createReferral(user, input, requestMeta = {}) {
  if (!FIELD_ROLES.includes(user.role) && user.role !== 'ADMIN') {
    throw new AuthorizationError('Only clinical staff can create referrals.');
  }

  return transaction((db) => {
    if (!patientRepository.findById(input.patientId, db)) throw new NotFoundError('Patient');
    assertPatientAccess(user, input.patientId, db);

    const referral = referralRepository.create(
      {
        ...input,
        referredBy: user.id,
        sourceFacilityId: input.sourceFacilityId ?? user.facility_id,
        status: 'SENT',
      },
      db
    );

    referralRepository.addEvent(referral.id,
      { status: 'CREATED', note: 'Referral created', actorId: user.id }, db);
    referralRepository.addEvent(referral.id,
      { status: 'SENT', note: 'Sent to destination facility', actorId: user.id }, db);

    if (referral.destination_facility_id) {
      notify({
        facilityId: referral.destination_facility_id,
        role: 'SPECIALIST',
        type: 'REFERRAL',
        title: `New ${referral.urgency.toLowerCase()} referral: ${referral.patient_name}`,
        message: `${referral.specialty || 'General'} referral from ${referral.source_facility_name || 'a facility'}.`,
        metadata: { referralId: referral.id },
        link: '/specialist/referrals',
      }, db);
    }

    recordAudit(
      { actorId: user.id, action: 'CREATE_REFERRAL', entityType: 'referral', entityId: referral.id,
        newValues: { patientId: input.patientId, urgency: referral.urgency }, ...requestMeta },
      db
    );

    return { ...referral, events: referralRepository.listEvents(referral.id, db) };
  });
}

/**
 * Applies a status transition, validating it against the state machine and
 * recording a timeline event.
 */
export function transitionReferral(user, id, toStatus, { note } = {}, requestMeta = {}) {
  return transaction((db) => {
    const referral = referralRepository.findById(id, db);
    if (!referral) throw new NotFoundError('Referral');

    const isDestinationStaff =
      user.facility_id && referral.destination_facility_id === user.facility_id;
    const isSourceStaff =
      user.facility_id && referral.source_facility_id === user.facility_id;
    const isOwner = referral.referred_by === user.id;

    if (user.role !== 'ADMIN' && !isDestinationStaff && !isSourceStaff && !isOwner) {
      throw new NotFoundError('Referral');
    }

    // Accepting or rejecting belongs to the receiving facility.
    if (['ACCEPTED', 'REJECTED', 'IN_CONSULTATION', 'COMPLETED'].includes(toStatus)) {
      if (user.role !== 'ADMIN' && !isDestinationStaff) {
        throw new AuthorizationError('Only the destination facility can perform this action.');
      }
    }

    if (!canTransition(referral.status, toStatus)) {
      throw new ConflictError(
        `A referral cannot move from ${referral.status} to ${toStatus}.`,
        { from: referral.status, to: toStatus, allowed: TRANSITIONS[referral.status] || [] }
      );
    }

    const extra = {};
    if (toStatus === 'ACCEPTED') {
      extra.acceptedAt = new Date().toISOString();
      extra.referredTo = user.id;
    }
    if (toStatus === 'COMPLETED') extra.completedAt = new Date().toISOString();

    const updated = referralRepository.updateStatus(id, toStatus, extra, db);
    referralRepository.addEvent(id, { status: toStatus, note, actorId: user.id }, db);

    // Keep the originating clinician informed.
    if (referral.referred_by && referral.referred_by !== user.id) {
      notify({
        userId: referral.referred_by,
        type: 'REFERRAL',
        title: `Referral ${referral.referral_code} is now ${toStatus.toLowerCase().replace('_', ' ')}`,
        message: note || `Status updated by ${user.name}.`,
        metadata: { referralId: id },
        link: '/doctor/referrals',
      }, db);
    }

    recordAudit(
      { actorId: user.id, action: `REFERRAL_${toStatus}`, entityType: 'referral', entityId: id,
        oldValues: { status: referral.status }, newValues: { status: toStatus }, ...requestMeta },
      db
    );

    return { ...updated, events: referralRepository.listEvents(id, db) };
  });
}
