import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { isProduction } from '../config/env.js';

export function notFoundHandler(req, res) {
  return sendError(res, {
    status: 404,
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
}

// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error(err.message, { requestId: req.id, code: err.code, stack: err.stack });
    }
    return sendError(res, {
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // SQLite constraint violations map to meaningful client errors.
  const sqliteMessage = String(err?.message || '');
  if (sqliteMessage.includes('UNIQUE constraint failed')) {
    logger.warn('Unique constraint violation', { requestId: req.id, message: sqliteMessage });
    return sendError(res, {
      status: 409,
      code: 'CONFLICT',
      message: 'A record with these details already exists.',
    });
  }
  if (sqliteMessage.includes('FOREIGN KEY constraint failed')) {
    logger.warn('Foreign key violation', { requestId: req.id, message: sqliteMessage });
    return sendError(res, {
      status: 400,
      code: 'INVALID_REFERENCE',
      message: 'A referenced record does not exist.',
    });
  }

  if (err?.type === 'entity.too.large') {
    return sendError(res, { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, { status: 400, code: 'MALFORMED_JSON', message: 'Request body is not valid JSON.' });
  }

  logger.error('Unhandled error', {
    requestId: req.id,
    message: sqliteMessage,
    stack: err?.stack,
  });

  return sendError(res, {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    // Stack traces must never reach production clients.
    details: isProduction ? undefined : { message: sqliteMessage },
  });
}
