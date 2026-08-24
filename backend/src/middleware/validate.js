import { ValidationError } from '../utils/errors.js';

function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Validates and replaces req.body / req.query / req.params from Zod schemas.
 * Parsed output is assigned back so downstream handlers receive coerced,
 * stripped values rather than raw client input.
 */
export function validate({ body, query, params }) {
  return (req, _res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (query) req.validatedQuery = query.parse(req.query);
      if (body) req.body = body.parse(req.body);
      next();
    } catch (err) {
      if (err?.issues) {
        return next(new ValidationError('Request validation failed.', formatIssues(err)));
      }
      next(err);
    }
  };
}
