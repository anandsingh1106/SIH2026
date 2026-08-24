import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi.js';

import { env } from './config/env.js';
import { apiLimiter } from './config/rateLimits.js';
import { requestId, requestLogger } from './middleware/requestContext.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import { consultationRouter, prescriptionRouter, medicineRouter } from './routes/clinicalRoutes.js';
import { referralRouter, labRouter, bedRouter, notificationRouter } from './routes/phase3Routes.js';
import { homeVisitRouter, taskRouter, vaccinationRouter, maternalRouter, ncdRouter } from './routes/ashaRoutes.js';
import {
  inventoryRouter, messagingRouter, messageRouter, syncRouter,
  analyticsRouter, queueRouter, aiRouter, auditRouter,
} from './routes/phase5Routes.js';
import publicRoutes from './routes/publicRoutes.js';
import streamRoutes from './routes/streamRoutes.js';

export function createApp() {
  const app = express();

  // Rate limiters key on req.ip, which behind a proxy is the proxy without this.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(requestId);
  app.use(requestLogger);

  app.use('/', healthRoutes);

  // Swagger UI loads inline styles/scripts that helmet's default CSP blocks.
  app.use(
    '/api/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, { customSiteTitle: 'ArogyaSetu API' })
  );
  app.get('/api/openapi.json', (_req, res) => res.json(openApiSpec));

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/consultations', consultationRouter);
  app.use('/api/prescriptions', prescriptionRouter);
  app.use('/api/medicines', medicineRouter);
  app.use('/api/referrals', referralRouter);
  app.use('/api/lab-orders', labRouter);
  app.use('/api/beds', bedRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/home-visits', homeVisitRouter);
  app.use('/api/tasks', taskRouter);
  app.use('/api/vaccinations', vaccinationRouter);
  app.use('/api/maternal-records', maternalRouter);
  app.use('/api/ncd-screenings', ncdRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/conversations', messagingRouter);
  app.use('/api/messages', messageRouter);
  app.use('/api/sync', syncRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/queue', queueRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/audit-logs', auditRouter);
  app.use('/api/public', publicRoutes);
  app.use('/api/stream', streamRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
