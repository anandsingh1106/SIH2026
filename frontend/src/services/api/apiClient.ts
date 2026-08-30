export interface ApiErrorDetail {
  path: string;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the caller should be sent back to the login screen. */
  get isUnauthenticated() {
    return this.status === 401;
  }
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

/** Registers a callback invoked whenever the API reports an expired session. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

const CSRF_COOKIE = 'csrfToken';
const CSRF_HEADER = 'x-csrf-token';

// Methods that change state; these must carry the CSRF header.
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Reads the CSRF token the API set as a readable cookie.
 *
 * The same-origin policy is what makes this work: another site can cause the
 * browser to send our cookies, but cannot read them to build this header.
 */
function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Single entry point for backend calls.
 *
 * Sends cookies, unwraps the { success, data } envelope, and converts error
 * envelopes into ApiError so callers can branch on `code` instead of parsing
 * message strings.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = options;

  const method = (rest.method || 'GET').toUpperCase();
  const csrfToken = UNSAFE_METHODS.has(method) ? readCsrfToken() : null;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken ? { [CSRF_HEADER]: csrfToken } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...rest,
    });
  } catch (err) {
    // An aborted request is a caller decision, not a network failure.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection.', 0, 'NETWORK_ERROR');
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const error = payload?.error;
    // "Request validation failed." on its own tells the user nothing. Fold the
    // field-level detail into the message so the screen can show what to fix.
    const detail = Array.isArray(error?.details) && error.details.length
      ? error.details
          .map((d: ApiErrorDetail) => (d.path ? `${d.path}: ${d.message}` : d.message))
          .join('; ')
      : '';

    const baseMessage = error?.message || 'Something went wrong.';
    const apiError = new ApiError(
      detail ? `${baseMessage} ${detail}` : baseMessage,
      res.status,
      error?.code || 'UNKNOWN_ERROR',
      error?.details
    );
    if (apiError.isUnauthenticated) onUnauthorized?.();
    throw apiError;
  }

  // Successful responses are always enveloped; tolerate a bare body defensively.
  return (payload?.success ? payload.data : payload) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
