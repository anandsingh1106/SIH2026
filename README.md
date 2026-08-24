# MahaAarogya Sangam (ArogyaSetu)

Digital public health platform for Maharashtra — React + TypeScript frontend,
Express + SQLite backend, phone-OTP authentication via Firebase.

**42 database tables · 72 API operations · 162 passing tests**

---

## ⚠️ Migration status — read this first

A migration from Firebase/SQLite to **Supabase + Vercel** is **in progress and
incomplete**. What is true today:

| Component | Status |
| --- | --- |
| Supabase PostgreSQL schema (42 tables) | ✅ Written, `supabase/migrations/` |
| Row Level Security (50 policies) | ✅ Written |
| Indexes incl. concurrency constraints | ✅ Written |
| Supabase client wrappers | ✅ Written |
| **SQL executed against a real database** | ❌ **Never run — no Postgres available locally** |
| **Running backend data layer** | ❌ **Still SQLite** |
| **Auth** | ❌ **Still Firebase** (and Firebase keys were never supplied) |
| **Deployment model** | ❌ Still `app.listen()` — not Vercel-compatible |

The running application is unchanged and fully working on SQLite + Express;
all 162 tests pass. The Supabase files are **new, additive, and not yet wired
in**. Nothing has been deleted.

**Blocker:** `node:sqlite` is synchronous, Supabase's client is async-only.
Switching requires converting **243 call sites across 20 files** to `async`, and
re-implementing 15 transactional flows as PostgreSQL functions, because the
Supabase JS client has no client-side transaction API. See "Remaining work".

---

## Quick Start

```bash
# 1. Install all dependencies (root, frontend and backend)
npm install
npm run install:all

# 2. Create the env files (see "Environment Setup" below — login is blocked
#    until the Firebase values are filled in)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Set up the database
cd backend && npm run db:migrate && npm run db:seed && cd ..

# 4. Run backend + frontend together
npm run dev:all
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- **API docs (Swagger): http://localhost:4000/api/docs**
- Health check: http://localhost:4000/health

Vite proxies `/api/*` to the backend on port 4000, so the frontend calls
relative URLs and there are no CORS issues in development.

---

## Architecture

```
Request → route → validator (Zod) → controller → service → repository → SQLite
                       ↓                ↓
                  RBAC guard      transaction + audit log
```

Business logic lives in services, never in route handlers. Repositories own all
SQL. Controllers only translate between HTTP and services.

**Backend layout** (`backend/src/`):

| Directory | Responsibility |
| --- | --- |
| `config/` | Environment loading, rate-limit tiers |
| `db/` | Connection (WAL, foreign keys), migrations, seeds, CLI |
| `middleware/` | Auth/RBAC, Zod validation, error handler, request logging |
| `repositories/` | All SQL — the only layer that touches the database |
| `services/` | Business logic, transactions, audit, AI, CBAC scoring |
| `controllers/` | HTTP ↔ service translation and response shaping |
| `validators/` | Zod schemas for every request body/query/param |
| `routes/` | Endpoint wiring only |
| `docs/` | OpenAPI specification |

### Where to change things

| To do this… | Edit these files |
| --- | --- |
| Add a field to an existing table | `db/migrations/` (new file), the matching repository, its validator |
| Change who may access something | `middleware/auth.js` or `services/accessControlService.js` |
| Add a new endpoint | `validators/` → `services/` → `controllers/` → `routes/` |
| Change an error message | The `throw` in the relevant service |
| Adjust rate limits | `config/rateLimits.js` |

---

## Commands

Run from the **project root**:

| Command | What it does |
| --- | --- |
| `npm run dev:all` | Runs backend + frontend together (recommended) |
| `npm run dev` | Frontend only (Vite dev server, port 3000) |
| `npm run server` | Backend only (Express API, port 4000) |
| `npm run build` | Type-checks and builds the frontend for production |
| `npm run preview` | Serves the built frontend locally |
| `npm run install:all` | Installs frontend + backend dependencies |

Inside `backend/`:

| Command | What it does |
| --- | --- |
| `npm start` | Starts the API server |
| `npm run dev` | Starts the API with auto-restart on file changes |
| `npm run db:migrate` | Applies pending migrations (safe to re-run) |
| `npm run db:seed` | Inserts demo data (idempotent — never duplicates) |
| `npm run db:reset` | Deletes the database, re-migrates and re-seeds |
| `npm test` | Runs the full test suite (162 tests) |
| `npm run test:watch` | Runs tests in watch mode |

> `db:reset` fails with a clear message if the API server is running — stop it
> first, since Windows keeps the database file locked.

Inside `frontend/`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npx tsc --noEmit` | Type-check without emitting files |

---

## Environment Setup

Two env files are required. **Both are gitignored — never commit them, and never
put real keys in this README or any other tracked file.**
Templates with the exact variable names live in `backend/.env.example` and
`frontend/.env.example`.

### Where each value comes from

Everything below comes from **one** Firebase project at
[console.firebase.google.com](https://console.firebase.google.com).

**Step 1 — Create project and enable Phone sign-in**
1. Create a project (any name).
2. Build → Authentication → Get started.
3. Sign-in method tab → **Phone** → Enable → Save.
   - Firebase may ask you to upgrade to the **Blaze** plan for Phone Auth.
     The free quota still applies; light testing does not incur charges.

**Step 2 — Frontend keys (`frontend/.env`)**
1. Gear icon → Project settings → General → Your apps.
2. Click the `</>` (Web) icon and register a web app.
3. Copy from the shown `firebaseConfig` object:

| `.env` variable | firebaseConfig field |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

> Vite only reads `.env` at startup — **restart the dev server** after editing it.

**Step 3 — Backend keys (`backend/.env`)**
1. Project settings → **Service accounts** → Generate new private key.
2. A JSON file downloads. Copy from it:

| `.env` variable | JSON field |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `project_id` |
| `FIREBASE_CLIENT_EMAIL` | `client_email` |
| `FIREBASE_PRIVATE_KEY` | `private_key` — wrap in double quotes, keep the `\n` sequences literal |

`JWT_SECRET` is also required (any long random string) and is used to sign this
app's own session cookies. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Step 4 — Test phone numbers (recommended)**

Authentication → Sign-in method → Phone → **Phone numbers for testing**.
Add e.g. `+91 9999999999` with fixed code `123456`. This lets you and others
test the full login flow without sending real SMS.

### Optional: welcome emails (SendGrid)

`SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` in `backend/.env` are **optional**.
If unset, the backend logs the email to the console instead of sending it —
everything else still works.

To enable real emails: sign up at [sendgrid.com](https://sendgrid.com) →
Settings → Sender Authentication → Verify a Single Sender → then
Settings → API Keys → Create API Key.

---

## Authentication

There are **no usernames or passwords** in this app. Login is phone number + SMS OTP:

1. User enters their mobile number on `/login` or `/register`.
2. Firebase sends a real OTP by SMS and verifies it in the browser.
3. The browser sends the resulting Firebase ID token to `POST /api/auth/phone-login`.
4. The backend verifies that token with the Firebase Admin SDK, then issues its
   own **httpOnly session cookie** (JWT, 7-day expiry).

Unknown phone numbers are routed to registration; known ones are logged straight in.
Email is an optional profile field used only for a welcome message — it is never
used to sign in.

---

## API Reference

Full interactive documentation with request/response schemas is at
**http://localhost:4000/api/docs** (machine-readable at `/api/openapi.json`).

### Conventions

Success: `{ "success": true, "data": ... }`
Error: `{ "success": false, "error": { "code", "message", "details" } }`
Lists: `{ items, pagination: { page, limit, total, totalPages } }` — accept `?page=&limit=`

Unauthorized reads return **404, not 403**, so record existence is never leaked.

### Endpoints by area

| Area | Base path | Key operations |
| --- | --- | --- |
| Auth | `/api/auth` | `POST /phone-login`, `GET /me`, `POST /logout` |
| Patients | `/api/patients` | list/search, get, create, update, `+/allergies`, `+/chronic-conditions`, `+/family`, `+/vitals` |
| Appointments | `/api/appointments` | list, book, `PATCH /:id/cancel`, `PATCH /:id/reschedule` |
| Clinical | `/api/consultations`, `/api/prescriptions`, `/api/medicines` | record consultations, issue prescriptions, formulary |
| Referrals | `/api/referrals` | create, `POST /:id/accept` `/reject` `/arrive` `/complete`, full timeline |
| Labs | `/api/lab-orders` | order, status flow, `POST /:id/results` |
| Beds | `/api/beds` | list, `/availability`, `POST /:id/allocate` `/release` |
| ASHA | `/api/home-visits`, `/api/tasks`, `/api/vaccinations`, `/api/maternal-records`, `/api/ncd-screenings` | field workflows |
| Inventory | `/api/inventory` | stock levels, `POST /:id/adjust`, `/transfer` |
| Queue | `/api/queue` | `POST /token`, `GET /:facilityId`, call/start/complete/skip |
| Notifications | `/api/notifications` | list, unread count, mark read, read-all |
| Messaging | `/api/conversations`, `/api/messages` | conversations and messages |
| Sync | `/api/sync/batch` | idempotent offline batch upload |
| Analytics | `/api/analytics` | `/patient` `/asha` `/doctor` `/specialist` `/admin` `/heatmap` |
| AI | `/api/ai` | `/triage`, `/assistant`, `/drug-interactions` |
| Audit | `/api/audit-logs` | audit trail (admin only) |
| Public | `/api/public` | facilities, medicines, bed availability, emergency, programmes — **no auth** |
| Realtime | `/api/stream` | Server-Sent Events for notifications, queue, beds, referrals |

### Behaviours worth knowing

- **Appointments** reject a double-booked doctor slot (409). Cancelling frees the slot.
- **Referrals** follow a state machine; illegal jumps (e.g. `SENT` → `COMPLETED`) return 409.
- **Beds** cannot be double-allocated — enforced by transaction *and* a partial unique index.
- **Inventory** can never go negative — enforced by transaction *and* a `CHECK` constraint.
- **Sync** is idempotent: replaying an `operationId` returns the original result, never a duplicate.
- **CBAC scores** and **triage risk** are computed server-side, not trusted from the client.

---

## Database

SQLite via Node's built-in `node:sqlite` at `backend/arogyasetu.sqlite` (gitignored).
WAL mode, foreign keys enforced, 42 tables, 154 indexes.

| Group | Tables |
| --- | --- |
| Identity | `users`, `facilities`, `audit_logs` |
| Patients | `patients`, `family_members`, `allergies`, `chronic_conditions` |
| Clinical | `consultations`, `vitals`, `diagnoses`, `clinical_notes`, `prescriptions`, `prescription_items`, `medicines` |
| Scheduling | `appointments`, `opd_tokens`, `telemedicine_sessions` |
| Referrals | `referrals`, `referral_events` |
| Labs | `lab_tests`, `lab_orders`, `lab_results` |
| Beds | `beds`, `bed_allocations` |
| ASHA field | `home_visits`, `tasks`, `vaccinations`, `maternal_records`, `anc_visits`, `ncd_screenings` |
| Supply chain | `inventory`, `inventory_transactions`, `stock_transfers` |
| Communication | `notifications`, `conversations`, `conversation_members`, `messages` |
| Other | `documents`, `sync_operations`, `treatment_plans`, `discharge_summaries`, `follow_ups`, `lab_tests` |

Migrations live in `backend/src/db/migrations/` and run in filename order. Applied
migrations are tracked in `_migrations`, so `db:migrate` is always safe to re-run.

Inspect the database directly:

```bash
cd backend
node -e "import('./src/db/connection.js').then(({getDb})=>console.log(getDb().prepare('SELECT * FROM users').all()))"
```

### Demo data and accounts

```bash
cd backend
npm run demo:full     # accounts + data + scale + link, in one step
```

That runs four steps, each of which can also be run on its own:

| Command | What it creates |
| --- | --- |
| `npm run demo:accounts` | One pre-confirmed login per role (patient, ASHA, doctor, specialist, admin) |
| `npm run demo:data` | Beds, inventory, tasks, vaccinations, lab orders, referrals, notifications |
| `npm run demo:scale` | Scales each entity to ~120 rows across several districts |
| `npm run demo:link` | Points the generated data at the login accounts |

Accounts are created with `email_confirm: true`, so no confirmation email is
sent and Supabase's email rate limit does not apply. Demo addresses use the
reserved `.test` TLD and cannot receive mail — deliberate, so they can never be
mistaken for real accounts.

**Credentials are written to `DEMO_ACCOUNTS.md`, which is gitignored.** Working
logins are never committed. Run `npm run demo:accounts` to regenerate the file
and see the shared password.

To demonstrate that authorization is enforced by the database and not just the
interface:

```bash
cd backend && npm run supabase:rls-test
```

It proves a patient cannot read another patient's records, cannot modify them,
and cannot escalate their own role — checked directly against PostgreSQL.

---

## Project Structure

```
ArogyaSetu/
├── backend/
│   ├── src/
│   │   ├── server.js            # Entry point — migrate, listen, graceful shutdown
│   │   ├── app.js               # Express assembly: helmet, CORS, routes, errors
│   │   ├── config/              # env.js, rateLimits.js
│   │   ├── db/
│   │   │   ├── connection.js    # WAL, foreign keys, transaction() helper
│   │   │   ├── migrator.js      # Repeatable-safe migration runner
│   │   │   ├── cli.js           # db:migrate / db:seed / db:reset
│   │   │   ├── migrations/      # 001…008, applied in filename order
│   │   │   └── seeds/           # Idempotent demo data
│   │   ├── middleware/          # auth (RBAC), validate (Zod), errorHandler, requestContext
│   │   ├── repositories/        # All SQL lives here
│   │   ├── services/            # Business logic, transactions, audit
│   │   │   ├── accessControlService.js  # Central patient-access policy
│   │   │   ├── cbacService.js           # NCD risk scoring
│   │   │   ├── syncService.js           # Idempotent offline batch
│   │   │   ├── eventBus.js              # Real domain events for SSE
│   │   │   └── ai/                      # Provider abstraction, triage, interactions
│   │   ├── controllers/         # HTTP ↔ service translation
│   │   ├── validators/          # Zod schemas
│   │   ├── routes/              # Endpoint wiring
│   │   └── docs/openapi.js      # Swagger specification
│   ├── tests/                   # Vitest + Supertest (162 tests)
│   └── _legacy/                 # Superseded pre-rewrite files (not loaded)
└── frontend/
    └── src/
        ├── App.tsx              # Routes + role-based guards
        ├── pages/               # auth, patient, doctor, asha, specialist, admin, public
        ├── components/          # ui/, layout/, healthcare/, maps/, ai/
        ├── services/
        │   ├── api/
        │   │   ├── apiClient.ts       # Central fetch: cookies, envelope, ApiError, 401
        │   │   ├── backendApi.ts      # Typed calls for every backend area
        │   │   └── appointmentsApi.ts
        │   ├── auth/            # Firebase client, auth context
        │   ├── ai/              # Thin wrappers over /api/ai (no client-side logic)
        │   └── offline/         # IndexedDB cache + real sync queue
        ├── hooks/               # useI18n, useToast, useOfflineStatus
        └── data/                # Reference data, i18n (en/hi/mr)
```

### Roles

`patient`, `asha`, `doctor`, `specialist`, `admin` — each has its own workspace and
route guard. A user's role is chosen at registration and stored on their account.

Roles are stored uppercase in the database and mapped to lowercase at the API
boundary (`utils/mappers.js`) so the existing frontend contract is preserved.
**A role sent by the client is never trusted** — it is always re-read from the
database on each request, so a role change takes effect immediately.

---

## Testing

```bash
cd backend && npm test
```

162 tests across 7 files, using Vitest and Supertest against a throwaway database
(`backend/tests/.tmp/`) — the development database is never touched.

| File | Covers |
| --- | --- |
| `auth.test.js` | Session restore, forged/expired tokens, suspended accounts, audit on login |
| `appointments.test.js` | RBAC isolation, double-booking, pagination, cancel/reschedule |
| `patients.test.js` | Scoped visibility, search, ABHA uniqueness, record-view auditing |
| `clinical.test.js` | Consultations, vitals (server-derived BMI), prescriptions, rollback |
| `phase3.test.js` | Referral state machine, **concurrent bed allocation**, lab flow |
| `asha.test.js` | CBAC scoring, home visits, tasks, immunisation, maternal alerts |
| `phase5.test.js` | **Sync idempotency**, inventory races, queue, AI safety, privacy |

Concurrency and idempotency are tested by actually racing the operations, not by
assuming the constraint works.

---

## Troubleshooting

**"Phone sign-in is not configured yet"**
`frontend/.env` is missing the Firebase values, or Vite was not restarted after
editing it. See Environment Setup Step 2.

**"Could not verify your phone number"**
`backend/.env` is missing the Firebase Admin values. Check the backend console —
it logs the specific missing variable. See Environment Setup Step 3.

**Backend exits immediately with a JWT_SECRET message**
`JWT_SECRET` is not set in `backend/.env`. Generate one (see Step 3).

**`EADDRINUSE: address already in use :::4000`**
A backend is already running. Find and stop it:

```bash
# Windows
netstat -ano | findstr :4000
powershell -Command "Stop-Process -Id <PID> -Force"
```

**Port 3000 already in use**
Vite will automatically switch to 3001. Note that `FRONTEND_URL` in `backend/.env`
must match the port actually in use for CORS to allow the request.

**401 on appointment endpoints**
You are not logged in, or the session cookie expired (7 days). Log in again.
