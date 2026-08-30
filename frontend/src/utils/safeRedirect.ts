/**
 * Validates an internal redirect target before it reaches navigate() or <Link>.
 *
 * react-router 6.x carries an open-redirect advisory: a path beginning with a
 * backslash, or with two leading slashes, can be parsed as a protocol-relative
 * URL and send the user to an external host. That matters most on a post-login
 * "return to where you were" flow, where the target comes from the query string
 * and the user has just typed their credentials — the classic phishing setup.
 *
 * Anything that is not an unambiguous same-origin path is rejected in favour of
 * the fallback, rather than sanitised. A redirect target is not worth guessing
 * at: sending the user somewhere safe is always an acceptable outcome.
 *
 * Use this for any redirect target that originates from a query parameter,
 * router state, or storage — never pass such a value straight to navigate().
 */
export function safeRedirectPath(target: unknown, fallback = '/dashboard'): string {
  if (typeof target !== 'string' || target === '') return fallback;

  // Backslashes are the specific bypass in the advisory; some parsers fold
  // them to forward slashes, turning "\/evil.com" into a protocol-relative URL.
  if (target.includes('\\')) return fallback;

  // Must be an absolute path on this origin.
  if (!target.startsWith('/')) return fallback;

  // "//evil.com" is protocol-relative and leaves the origin.
  if (target.startsWith('//')) return fallback;

  // Percent-encoding can hide either of the above from a naive check.
  let decoded = target;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    // Malformed encoding is not something to interpret charitably.
    return fallback;
  }
  if (decoded.includes('\\') || decoded.startsWith('//')) return fallback;

  // A scheme anywhere in a value that should be a bare path is not legitimate,
  // and covers javascript: and data: as well as http(s):.
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded.trim())) return fallback;

  // Control characters, including the newlines and tabs browsers strip before
  // parsing a URL, which can otherwise smuggle a scheme past the check above.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(decoded)) return fallback;

  return target;
}
