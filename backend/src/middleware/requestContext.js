import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Attaches a request id used to correlate log lines for a single request.
 *
 * A client-supplied id is accepted for tracing across services, but only if it
 * looks like an id. Echoing arbitrary client text into logs invites log
 * injection (forged newlines splicing in fake entries) and, in some viewers,
 * stored XSS.
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function requestId(req, res, next) {
  const supplied = req.get('x-request-id');
  req.id = supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}

/** Logs method, path, status, duration and user id (never bodies or headers). */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('request', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.user?.id,
    });

    // Surface authn/authz denials distinctly. A burst of these is the earliest
    // visible signal of enumeration or a stolen-session attempt, and it should
    // not have to be reconstructed from ordinary request lines.
    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
      logger.warn('security.denied', {
        requestId: req.id,
        status: res.statusCode,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('user-agent'),
      });
    }
  });

  next();
}
