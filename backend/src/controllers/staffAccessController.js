import * as service from '../services/staffAccessService.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

function requestMeta(req) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') };
}

/** Files a staff access request for the signed-in user. */
export function postRequest(req, res, next) {
  try {
    const result = service.createRequest(req.user, req.body, requestMeta(req));
    return sendSuccess(res, result, 201);
  } catch (err) { next(err); }
}

/** The signed-in user's own request status. */
export function getMyRequest(req, res, next) {
  try {
    return sendSuccess(res, { request: service.myRequest(req.user) });
  } catch (err) { next(err); }
}

export function deleteMyRequest(req, res, next) {
  try {
    return sendSuccess(res, service.withdrawRequest(req.user, req.params.id, requestMeta(req)));
  } catch (err) { next(err); }
}

/** Admin review queue. */
export function getRequests(req, res, next) {
  try {
    const { page, limit, status } = req.validatedQuery;
    const { items, total } = service.listRequests({ status, page, limit });
    return sendPaginated(res, items, { page, limit, total });
  } catch (err) { next(err); }
}

export function postApprove(req, res, next) {
  try {
    const result = service.approveRequest(req.user, req.params.id, req.body, requestMeta(req));
    return sendSuccess(res, result);
  } catch (err) { next(err); }
}

export function postReject(req, res, next) {
  try {
    const result = service.rejectRequest(req.user, req.params.id, req.body, requestMeta(req));
    return sendSuccess(res, result);
  } catch (err) { next(err); }
}

/** Direct role change, for revocation and corrections. */
export function patchUserRole(req, res, next) {
  try {
    const result = service.setUserRole(req.user, req.params.userId, req.body.role, requestMeta(req));
    return sendSuccess(res, result);
  } catch (err) { next(err); }
}
