import { Router } from 'express';
import * as ctrl from '../controllers/phase5Controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, paginationSchema } from '../validators/common.js';
import { aiLimiter } from '../config/rateLimits.js';
import {
  listInventorySchema, createInventorySchema, adjustStockSchema, transferStockSchema,
  createConversationSchema, sendMessageSchema, syncBatchSchema,
  analyticsQuerySchema, heatmapQuerySchema,
  issueTokenSchema, queueParamSchema, tokenParamSchema,
  triageSchema, assistantSchema, drugInteractionSchema, listAuditSchema,
} from '../validators/phase5Validators.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);
inventoryRouter.get('/', validate({ query: listInventorySchema }), ctrl.getInventory);
inventoryRouter.post('/', validate({ body: createInventorySchema }), ctrl.postInventory);
inventoryRouter.post('/transfer', validate({ body: transferStockSchema }), ctrl.postTransfer);
inventoryRouter.post('/:id/adjust', validate({ params: idParamSchema, body: adjustStockSchema }), ctrl.postStockAdjustment);
inventoryRouter.get('/:id/transactions', validate({ params: idParamSchema, query: paginationSchema }), ctrl.getInventoryTransactions);

export const messagingRouter = Router();
messagingRouter.use(requireAuth);
messagingRouter.get('/', validate({ query: paginationSchema }), ctrl.getConversations);
messagingRouter.post('/', validate({ body: createConversationSchema }), ctrl.postConversation);
messagingRouter.get('/:id/messages', validate({ params: idParamSchema, query: paginationSchema }), ctrl.getMessages);
messagingRouter.post('/:id/messages', validate({ params: idParamSchema, body: sendMessageSchema }), ctrl.postMessage);

export const messageRouter = Router();
messageRouter.use(requireAuth);
messageRouter.patch('/:id/read', validate({ params: idParamSchema }), ctrl.patchMessageRead);

export const syncRouter = Router();
syncRouter.use(requireAuth);
syncRouter.post('/batch', validate({ body: syncBatchSchema }), ctrl.postSyncBatch);

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);
analyticsRouter.get('/patient', ctrl.getAnalytics('patient'));
analyticsRouter.get('/asha', ctrl.getAnalytics('asha'));
analyticsRouter.get('/doctor', ctrl.getAnalytics('doctor'));
analyticsRouter.get('/specialist', ctrl.getAnalytics('specialist'));
analyticsRouter.get('/admin', requireRole('ADMIN'), validate({ query: analyticsQuerySchema }), ctrl.getAnalytics('admin'));
analyticsRouter.get('/heatmap', requireRole('ADMIN'), validate({ query: heatmapQuerySchema }), ctrl.getHeatmap);

export const queueRouter = Router();
queueRouter.use(requireAuth);
queueRouter.post('/token', validate({ body: issueTokenSchema }), ctrl.postToken);
queueRouter.get('/:facilityId', validate({ params: queueParamSchema }), ctrl.getQueue);
queueRouter.get('/token/:tokenId', validate({ params: tokenParamSchema }), ctrl.getTokenPosition);
queueRouter.post('/:tokenId/call', validate({ params: tokenParamSchema }), ctrl.queueAction('CALLED'));
queueRouter.post('/:tokenId/start', validate({ params: tokenParamSchema }), ctrl.queueAction('IN_PROGRESS'));
queueRouter.post('/:tokenId/complete', validate({ params: tokenParamSchema }), ctrl.queueAction('COMPLETED'));
queueRouter.post('/:tokenId/skip', validate({ params: tokenParamSchema }), ctrl.queueAction('SKIPPED'));

export const aiRouter = Router();
aiRouter.use(requireAuth);
// AI endpoints hit a paid upstream provider, so they carry a stricter limit.
aiRouter.use(aiLimiter);
aiRouter.post('/triage', validate({ body: triageSchema }), ctrl.postTriage);
aiRouter.post('/assistant', validate({ body: assistantSchema }), ctrl.postAssistant);
aiRouter.post('/drug-interactions', validate({ body: drugInteractionSchema }), ctrl.postDrugInteractions);

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRole('ADMIN'));
auditRouter.get('/', validate({ query: listAuditSchema }), ctrl.getAuditLogs);
