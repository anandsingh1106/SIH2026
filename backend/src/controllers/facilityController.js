import * as service from '../services/facilityService.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function meta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

const toAdminFacility = (r) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  address: r.address || undefined,
  district: r.district,
  taluka: r.taluka || undefined,
  village: r.village || undefined,
  latitude: r.latitude ?? undefined,
  longitude: r.longitude ?? undefined,
  phone: r.phone || undefined,
  email: r.email || undefined,
  emergencyAvailable: !!r.emergency_available,
  active: !!r.active,
  beds: {
    total: r.beds_total ?? 0,
    available: r.beds_available ?? 0,
    icuTotal: r.icu_total ?? 0,
    icuAvailable: r.icu_available ?? 0,
    ventilators: r.ventilator_total ?? 0,
  },
  doctors: r.doctors ?? 0,
  ashaWorkers: r.asha_workers ?? 0,
  updatedAt: r.updated_at,
});

export function getFacilities(req, res, next) {
  try {
    const { page, limit, ...filters } = req.validatedQuery;
    const { items, total } = service.listFacilities({ ...filters, page, limit });
    return sendPaginated(res, items.map(toAdminFacility), { page, limit, total });
  } catch (err) { next(err); }
}

export function getFacility(req, res, next) {
  try {
    return sendSuccess(res, toAdminFacility(service.getFacility(req.params.id)));
  } catch (err) { next(err); }
}

export function postFacility(req, res, next) {
  try {
    const row = service.createFacility(req.user, req.body, meta(req));
    return sendSuccess(res, toAdminFacility(row), 201);
  } catch (err) { next(err); }
}

export function patchFacility(req, res, next) {
  try {
    const row = service.updateFacility(req.user, req.params.id, req.body, meta(req));
    return sendSuccess(res, toAdminFacility(row));
  } catch (err) { next(err); }
}
