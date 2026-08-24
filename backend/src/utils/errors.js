/** Base class for errors that are safe to surface to API clients. */
export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Request validation failed.', details) {
    super(message, { status: 400, code: 'VALIDATION_ERROR', details });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, { status: 401, code: 'AUTHENTICATION_ERROR' });
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, { status: 403, code: 'AUTHORIZATION_ERROR' });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found.`, { status: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'This operation conflicts with existing data.', details) {
    super(message, { status: 409, code: 'CONFLICT', details });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, { status: 429, code: 'RATE_LIMITED' });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, message = 'An external service is unavailable.') {
    super(message, { status: 502, code: 'EXTERNAL_SERVICE_ERROR', details: { service } });
  }
}
