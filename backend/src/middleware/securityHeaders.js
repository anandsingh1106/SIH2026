import helmet from 'helmet';
import { isProduction } from '../config/env.js';

/**
 * Response security headers.
 *
 * The API serves JSON to a separate SPA origin, so the CSP here is deliberately
 * near-total lockdown: nothing should ever be loaded or framed from an API
 * response. The frontend ships its own CSP appropriate to rendering a page.
 */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        // Blocks <object>/<embed>, a legacy XSS vector.
        objectSrc: ["'none'"],
        ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    // Tell browsers to use HTTPS for the next two years, subdomains included.
    // Only meaningful over TLS, so it is left off in development.
    strictTransportSecurity: isProduction
      ? { maxAge: 63072000, includeSubDomains: true, preload: true }
      : false,
    // Do not leak the full URL (which can contain ids) to third-party sites.
    referrerPolicy: { policy: 'no-referrer' },
    // Defence in depth against MIME-sniffing a JSON response into script.
    xContentTypeOptions: true,
    frameguard: { action: 'deny' },
    // Keep the API out of any cross-origin document's process.
    crossOriginResourcePolicy: { policy: 'same-site' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    // Hide the framework fingerprint.
    hidePoweredBy: true,
  });
}

/** Swagger UI needs inline styles and scripts that the strict CSP above blocks. */
export function docsSecurityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    strictTransportSecurity: isProduction
      ? { maxAge: 63072000, includeSubDomains: true, preload: true }
      : false,
  });
}

/**
 * Prevents caching of API responses.
 *
 * Clinical responses carry patient data. Without this, a shared proxy or the
 * browser's back-forward cache can retain a record after logout and serve it to
 * whoever uses the device next — a real risk on shared facility terminals.
 */
export function noStoreOnApi(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}
