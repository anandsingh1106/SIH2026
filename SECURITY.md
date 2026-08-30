# Security

How ArogyaSetu protects patient data, and what must be true before it is exposed publicly.

This system holds identifiable health records. Treat every item under "Before you deploy" as a
release blocker, not a suggestion.

---

## Defence in depth

Each layer assumes the one above it may fail.

| Layer | Mechanism | Where |
|---|---|---|
| Transport | HSTS, 2-year max-age, subdomains, preload | `middleware/securityHeaders.js` |
| Origin | Explicit CORS allowlist, never a reflected origin | `config/cors.js` |
| Session | httpOnly cookie, HS256 pinned, issuer/audience bound | `services/tokenService.js` |
| Second factor | TOTP required for staff, enforced server-side | `middleware/mfaGate.js`, `services/mfaService.js` |
| Request forgery | Double-submit CSRF token on every state change | `middleware/csrf.js` |
| Brute force | Per-IP rate limits plus a 5-failure lockout | `config/rateLimits.js`, `services/loginAttemptService.js` |
| Input | Zod schemas replace raw body/query/params | `middleware/validate.js` |
| Authentication | Role re-read from the database each request | `middleware/auth.js` |
| Authorization | One shared patient-access policy | `services/accessControlService.js` |
| Database | 50 RLS policies, `force row level security` | `supabase/migrations/002_rls_policies.sql` |
| Forensics | Audit log with sensitive-field scrubbing | `services/auditService.js` |

### Decisions worth knowing

**The session token carries only a user id.** Role and permissions are never in the JWT, so a
role change or suspension takes effect on the very next request rather than lingering until a
7-day token expires. This costs one database read per request and is worth it.

**Denials return 404, not 403.** Asking for a patient, conversation, or record you cannot see is
indistinguishable from asking for one that does not exist. A 403 would confirm the id is real and
turn the API into an enumeration oracle.

**The JWT algorithm is pinned.** `verifyToken` passes `algorithms: ['HS256']`. Without this, a
forged header (`alg: none`, or an RS256/HS256 confusion) can talk the library out of verifying at
all. Tokens are also bound to an issuer and audience, so a token minted by another service sharing
the secret cannot be replayed here.

**CSRF is enforced, not assumed.** The session cookie is `sameSite: lax`, which stops most
cross-site form posts — but `lax` still permits top-level GET navigation and older clients may not
honour it. The double-submit token is an independent check that does not depend on browser
behaviour. It is not bypassed in tests; the test helper supplies a matching token pair the way a
real browser would.

**Two-factor is enforced at the API, not the UI.** `mfaGate` runs once for all
of `/api` rather than per-router, so a route added later is protected by default
and the only way past is an explicit entry in its exemption list. A stolen staff
password alone reaches nothing: the session cookie records the assurance level
it was issued at, and that claim is signed, so it cannot be edited by the client.
Staff (ADMIN, DOCTOR, SPECIALIST, ASHA) must enrol before reaching any patient
data. Patients are exempt by default — a patient account reaches only its own
record, and rural users may share a handset or have no realistic recovery path —
but a patient who opts in is then held to it.

**Recovery codes are stored only as SHA-256 hashes.** They are bearer
credentials equivalent to a second factor, so a database leak must not yield
usable ones. Ten are issued at enrolment, shown exactly once, single-use, and
regenerating invalidates the previous set. Regeneration itself requires an
already-verified session, so a stolen password cannot mint fresh bypass codes.

**API responses are `no-store`.** Facility terminals are shared. Without this, the browser's
back-forward cache can resurrect a patient record after logout for whoever sits down next.

---

## Before you deploy

### Blocking

- [ ] **`JWT_SECRET` is 32+ random characters, unique to this environment.**
      Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
      The server refuses to start in production otherwise. Never reuse the development secret —
      anyone who has seen it can mint a session for any user.
- [ ] **`NODE_ENV=production`.** This is what turns on `secure` cookies, HSTS, stack-trace
      suppression, and the config validator itself. Getting this wrong silently disables most of
      the above.
- [ ] **`CORS_ORIGINS` lists only your real frontend origins, over https.**
- [ ] **TLS terminates in front of the API**, and HTTP redirects to HTTPS. `secure` cookies are
      never sent over plaintext, so without TLS nobody can log in.
- [ ] **`SUPABASE_SERVICE_ROLE_KEY` is set only on the server.** It bypasses RLS entirely. It must
      never appear in frontend env, a `VITE_`/`NEXT_PUBLIC_` variable, or the built bundle.
      Verify: `grep -r "service_role" frontend/dist/` returns nothing.
- [ ] **RLS migrations are applied** to the production database: `npm run supabase:migrate`,
      then confirm with `npm run supabase:rls-test`.
- [ ] **Every ADMIN account has enrolled in 2FA.** An admin session reaches every
      patient record in the system, and can reset other users' 2FA.
- [ ] **Demo accounts are removed.** `DEMO_ACCOUNTS.md` is gitignored and its credentials are
      generated per-run, but any accounts already created must be deleted or suspended.
- [ ] **`trust proxy` matches your actual topology.** It is set to `1`, meaning exactly one proxy.
      Too high and a client can spoof `X-Forwarded-For` to defeat every per-IP rate limit; too low
      and you rate-limit the proxy instead of the caller.

### Strongly recommended

- [ ] `ENABLE_API_DOCS` left unset (defaults off in production). The OpenAPI spec is a complete map
      of every endpoint and payload shape.
- [ ] Automated database backups, with a restore actually tested at least once.
- [ ] Ship logs somewhere durable and alert on `security.denied` — a burst of 401/403/429 is the
      earliest visible sign of enumeration or a stolen session.
- [ ] A WAF or CDN in front for L7 DDoS absorption. The in-process rate limiter protects
      application resources, not your bandwidth.
- [ ] `npm audit` in CI, failing the build on high or critical.
- [ ] Shorten `SESSION_TTL_DAYS` from 7 if your threat model does not include field workers on
      intermittent connectivity.

---

## Known limitations

Stated plainly, because a checklist that implies completeness is worse than no checklist.

**Rate limiting and lockout are per-process.** Both live in memory. Behind more than one instance,
an attacker gets N times the budget and a lockout on one node does not apply to the others. Move
both to Redis before scaling horizontally — `loginAttemptService.js` is deliberately small enough
to swap.

**The lockout keys on IP alone.** This stops a single-source brute-force run. It does not stop
distributed credential stuffing, where each IP stays under the threshold. Supabase's own auth
throttling is the backstop; consider per-account lockout if you see this pattern.

**Authentication ultimately depends on Supabase.** Password policy and email verification are
configured in the Supabase dashboard, not in this repository. Supabase also owns the TOTP factor
itself — the shared secret and code verification — while this repository owns the policy: who must
enrol, and what happens when someone loses their phone.

**2FA recovery has a human step.** A user who loses both their authenticator and their recovery
codes needs an ADMIN to reset them (`POST /api/auth/mfa/reset/:userId`). That endpoint requires the
acting admin's own session to be aal2 and is always audited, but the identity check itself happens
out of band — decide what that process is before launch, or the reset endpoint becomes the weakest
link in the whole scheme.

**Enrolment state is mirrored, not authoritative.** `users.mfa_enrolled_at` is a local mirror of
Supabase's factor list, reconciled on sign-in and on the status endpoint. When Supabase cannot be
reached the lookup fails closed with `MFA_LOOKUP_FAILED` rather than reporting "not enrolled" —
guessing there would wave a staff account through re-enrolment.

**`react-router` 6.x carries a moderate open-redirect advisory** (CVE-2025-68470 bypass). No
user-controlled redirect target exists in the app today, and `frontend/src/utils/safeRedirect.ts`
guards the pattern for whenever one is added. Use it for any redirect target that comes from a
query parameter, router state, or storage. Upgrading to react-router 7 remains the complete fix.

**SQLite is the current runtime database.** The Supabase/Postgres RLS policies are the second line
of defence for direct client access, but the running API talks to SQLite, where enforcement rests
entirely on `accessControlService.js`. Completing the Postgres migration is what makes RLS an
active control rather than a standby one.

**No penetration test has been performed.** Everything here is design review and automated testing.
For a system holding real patient records, commission an external assessment before going live.

---

## Reporting a vulnerability

Do not open a public issue. Report privately to the maintainers with reproduction steps and expect
an acknowledgement within a few working days.
