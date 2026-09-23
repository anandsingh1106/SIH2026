import * as service from '../services/treatmentPlanService.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function meta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

const toPublicPlan = (r) => ({
  id: r.id,
  patientId: r.patient_id,
  patientName: r.patient_name,
  patientAbhaId: r.patient_abha_id || undefined,
  patientVillage: r.patient_village || undefined,
  ashaName: r.asha_name || undefined,
  referralId: r.referral_id || undefined,
  referralCode: r.referral_code || undefined,
  authorId: r.created_by || undefined,
  authorName: r.author_name || undefined,
  title: r.title,
  specialty: r.specialty || undefined,
  directives: r.directives || undefined,
  status: r.status,
  startDate: r.start_date,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  phases: r.phases.map((p) => ({
    id: p.id,
    position: p.position,
    title: p.title,
    description: p.description || undefined,
    targetDate: p.target_date || undefined,
    completed: !!p.completed_at,
    completedAt: p.completed_at || undefined,
  })),
});

export function getPlans(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = service.listPlans(req.user, { ...filters, page, limit });
    return sendPaginated(res, items.map(toPublicPlan), { page, limit, total });
  } catch (err) { next(err); }
}

export function getPlan(req, res, next) {
  try {
    return sendSuccess(res, toPublicPlan(service.getPlan(req.user, req.params.id)));
  } catch (err) { next(err); }
}

export function postPlan(req, res, next) {
  try {
    return sendSuccess(res, toPublicPlan(service.createPlan(req.user, req.body, meta(req))), 201);
  } catch (err) { next(err); }
}

export function patchPlan(req, res, next) {
  try {
    return sendSuccess(res, toPublicPlan(service.updatePlan(req.user, req.params.id, req.body, meta(req))));
  } catch (err) { next(err); }
}

export function patchPhase(req, res, next) {
  try {
    const plan = service.setPhaseCompleted(
      req.user, req.params.id, req.params.phaseId, req.body.completed, meta(req)
    );
    return sendSuccess(res, toPublicPlan(plan));
  } catch (err) { next(err); }
}
