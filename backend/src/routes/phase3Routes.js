import { Router } from 'express';
import * as ctrl from '../controllers/phase3Controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  listReferralsSchema, createReferralSchema, referralTransitionSchema, referralStatusSchema,
  listLabOrdersSchema, createLabOrderSchema, updateLabOrderSchema, labResultSchema,
  listBedsSchema, createBedSchema, allocateBedSchema, bedStatusSchema,
  listNotificationsSchema,
} from '../validators/phase3Validators.js';

// ─── Referrals ──────────────────────────────────────────────────────────────
export const referralRouter = Router();
referralRouter.use(requireAuth);
referralRouter.get('/', validate({ query: listReferralsSchema }), ctrl.getReferrals);
referralRouter.post('/', validate({ body: createReferralSchema }), ctrl.postReferral);
referralRouter.get('/:id', validate({ params: idParamSchema }), ctrl.getReferralById);
referralRouter.patch('/:id', validate({ params: idParamSchema, body: referralStatusSchema }), ctrl.patchReferral);

const action = (path, status) =>
  referralRouter.post(path,
    validate({ params: idParamSchema, body: referralTransitionSchema }),
    ctrl.referralAction(status));

action('/:id/accept', 'ACCEPTED');
action('/:id/reject', 'REJECTED');
action('/:id/arrive', 'ARRIVED');
action('/:id/complete', 'COMPLETED');

// ─── Lab orders ─────────────────────────────────────────────────────────────
export const labRouter = Router();
labRouter.use(requireAuth);
labRouter.get('/', validate({ query: listLabOrdersSchema }), ctrl.getLabOrders);
labRouter.post('/', validate({ body: createLabOrderSchema }), ctrl.postLabOrder);
labRouter.get('/:id', validate({ params: idParamSchema }), ctrl.getLabOrderById);
labRouter.patch('/:id', validate({ params: idParamSchema, body: updateLabOrderSchema }), ctrl.patchLabOrder);
labRouter.post('/:id/results', validate({ params: idParamSchema, body: labResultSchema }), ctrl.postLabResult);

// ─── Beds ───────────────────────────────────────────────────────────────────
export const bedRouter = Router();
bedRouter.use(requireAuth);
bedRouter.get('/', validate({ query: listBedsSchema }), ctrl.getBeds);
bedRouter.get('/availability', validate({ query: listBedsSchema.partial() }), ctrl.getBedAvailability);
bedRouter.post('/', validate({ body: createBedSchema }), ctrl.postBed);
bedRouter.post('/:id/allocate', validate({ params: idParamSchema, body: allocateBedSchema }), ctrl.postBedAllocation);
bedRouter.post('/:id/release', validate({ params: idParamSchema }), ctrl.postBedRelease);
bedRouter.patch('/:id/status', validate({ params: idParamSchema, body: bedStatusSchema }), ctrl.patchBedStatus);

// ─── Notifications ──────────────────────────────────────────────────────────
export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get('/', validate({ query: listNotificationsSchema }), ctrl.getNotifications);
notificationRouter.get('/unread-count', ctrl.getUnreadCount);
notificationRouter.patch('/:id/read', validate({ params: idParamSchema }), ctrl.patchNotificationRead);
notificationRouter.post('/read-all', ctrl.postReadAll);
