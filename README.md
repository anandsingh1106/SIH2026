# MahaAarogya Sangam (ArogyaSetu)

**One connected public health platform for Maharashtra, from the village ASHA worker to the state health office.**

**Live demo:** https://sih-2026-frontend-phi.vercel.app

| 5 roles | 46 database tables | 120+ API endpoints | 466 automated tests | 3 languages |
| --- | --- | --- | --- | --- |
| Patient, ASHA, Doctor, Specialist, Admin | SQLite, migrated in order | Documented in Swagger | Backend, frontend and shared | English, Hindi, Marathi |

---

## The problem

Rural healthcare in Maharashtra runs on disconnected pieces:

- **ASHA workers** record home visits, pregnancies and vaccinations on paper, often in villages with no mobile signal.
- **PHC doctors** see a patient without the history the ASHA already collected.
- **Referrals** to a district hospital travel as a paper slip. Nobody knows whether the patient arrived or whether a bed was free.
- **District and state officers** get figures weeks late, after an outbreak has already spread.

## Our solution

ArogyaSetu puts every step of a patient's journey on one shared record, and gives each person in the chain the screen they need.

```
  Village                 PHC                   District hospital          State office
 ┌──────────┐   visit   ┌──────────┐  referral  ┌──────────────┐  live data  ┌──────────┐
 │  ASHA    │ ────────► │  Doctor  │ ─────────► │  Specialist  │ ──────────► │  Admin   │
 │ (offline)│           │          │            │  + bed       │             │          │
 └────┬─────┘           └────┬─────┘            └──────┬───────┘             └──────────┘
      │                      │                         │
      └──────────────────────┴──── one patient record ─┴──► Patient app
```

1. **The ASHA worker** registers the patient and records visits, ANC checkups, vaccinations and NCD screenings. This works offline and syncs when the signal returns.
2. **The doctor at the PHC** sees that history in the OPD queue, consults in person or by video, prescribes and orders labs. A patient who needs more care gets a referral.
3. **The specialist** accepts the referral, allocates a bed, runs a treatment plan and writes the discharge summary. Follow-ups return to the ASHA who looks after that village.
4. **The patient** sees their own timeline, prescriptions, lab reports and vaccinations. They can check symptoms with AI, book appointments, reserve medicines and raise an emergency alert.
5. **The admin** watches district and state analytics, disease heatmaps and stock levels built from the same live data, and manages facilities and staff.

---

## Features by role

### ASHA worker
| Feature | What it does |
| --- | --- |
| Dashboard and tasks | Today's visits and due work, with this ASHA's real figures |
| Village health grid | Every household with its health status and open alerts |
| Home visits | Visit log with vitals and notes |
| Immunisation | Vaccine schedule per child, with due and overdue doses |
| Maternal care | ANC visits with automatic high-risk flags |
| NCD screening | CBAC risk score, calculated on the server |
| Referrals | Send a patient to the PHC or a specialist |
| Monthly report | Generated from recorded work, ready to print |
| Offline sync | Records are saved on the device and uploaded when online, without duplicates |

### Doctor (PHC)
| Feature | What it does |
| --- | --- |
| OPD queue | Token queue that updates live as patients are called |
| Consultation | Vitals, diagnosis, notes, and a signed e-prescription |
| Telemedicine | Peer-to-peer video consultation with the patient |
| AI in consultation | Triage and drug interaction checks while seeing a patient |
| Lab orders | Order tests and read results |
| Referrals | Refer to a specialist and track the referral to completion |
| Analytics | Weekly load, top diagnoses, antibiotic prescribing rate |

### Specialist (district hospital)
| Feature | What it does |
| --- | --- |
| Referral inbox | Accept or reject, mark arrival, complete, with a full timeline |
| Treatment plans | Phased plans with progress tracking |
| Follow-ups | Post-discharge follow-ups linked to the village ASHA |
| Bed management | Live availability. A bed can never be allocated twice |
| Discharge summary | Structured summary sent back into the patient record |

### Patient
| Feature | What it does |
| --- | --- |
| AI symptom checker | Describe symptoms and see how urgently to get care, with a direct 108 call or visit booking |
| Health timeline | Every visit, prescription and result in one place |
| Appointments | Book with a real doctor at a chosen facility. Double booking is blocked |
| Prescriptions | Includes an audio prescription for patients who cannot read |
| Medicine orders | Reserve medicines against pharmacy stock and collect with a token |
| Emergency | Urgent alert to the care team, with the assigned ASHA's contact |
| Family | Family members under one account |

### Admin (district and state)
| Feature | What it does |
| --- | --- |
| State and district analytics | Live figures across districts |
| Disease heatmap | Hotspots by taluka, such as maternal high risk |
| AI insights | Signals such as outbreak clusters and stock risk |
| Facility and staff management | Facility registry, staff access requests and approvals |
| Inventory | Stock levels and transfers. Stock can never go negative |
| Reports and audit logs | Exportable reports and a full audit trail of record access |

### Shared by all roles
Messages between the care team, calendar, notifications in real time, help center, and settings for language, high contrast and alert sound.

---

## What makes it work

- **Offline first for the field.** ASHA records go into IndexedDB on the device and sync in batches. Every operation carries an id, so replaying a sync never creates a duplicate.
- **Safe under load.** Double booking, double bed allocation and negative stock are blocked both in the transaction and by a database constraint. Tests race these operations on purpose.
- **Privacy by default.** Each role sees only the patients it is responsible for. A record the user cannot access returns 404, not 403, so its existence is never revealed. Every record view is audit logged.
- **Secure sign-in.** Email and password through Supabase Auth, plus a TOTP second factor for staff. The role is always re-read from the database, never trusted from the client.
- **Real time.** Queue, bed, referral and notification changes are pushed to the browser with Server-Sent Events.
- **AI with a safety net.** Triage and the assistant use Gemini (or OpenAI). If no provider is configured, they answer from a built-in clinical knowledge base instead of failing.
- **Built for the field.** Hindi, Marathi and English, large touch targets for one-handed use outdoors, a high contrast mode and an installable PWA.

---

## Architecture

```
Browser (React PWA) ──► Vercel ──/api──► Render (Express API) ──► SQLite
       │                                        │
       └──── Supabase Auth, MFA, Realtime ◄─────┘
```

Inside the backend, each request follows one path:

```
route → Zod validator → controller → service → repository → SQLite
                            │            │
                       role guard   transaction + audit log
```

Business logic lives in services. Repositories own all SQL. Controllers only translate between HTTP and services.

### Tech stack

| Layer | Technology |
| --- | --- |
| Web frontend | React, TypeScript, Vite, Tailwind CSS, Recharts, PWA with service worker |
| Mobile app | Expo (React Native) for ASHA and patient workflows |
| Backend | Node.js, Express, Zod, `node:sqlite`, Swagger (OpenAPI) |
| Auth and realtime | Supabase Auth with TOTP, Supabase Realtime for video call signalling |
| AI | Gemini or OpenAI through a provider layer, with a local knowledge base fallback |
| Hosting | Vercel (frontend), Render (backend) |
| Testing | Vitest and Supertest |

### Repository layout

```
ArogyaSetu/
├── frontend/     Web app: pages per role (patient, asha, doctor, specialist, admin, public)
├── backend/      Express API: routes, validators, controllers, services, repositories, migrations
├── shared/       Typed API client and helpers used by both web and mobile
├── mobile/       Expo app for ASHA workers and patients
└── supabase/     PostgreSQL schema, RLS policies and indexes (not yet in use, see below)
```

---

## Run it locally

**Requirements:** Node.js 22.13 or later (for `node:sqlite`) and a Supabase project for sign-in.

```bash
# 1. Install everything (npm workspaces)
npm install

# 2. Create the env files, then fill them in
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Create the database and demo data
cd backend
npm run db:migrate
npm run db:seed
npm run demo:full      # demo login per role, plus realistic data at scale
cd ..

# 4. Start backend and frontend together
npm run dev:all
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:3000 |
| API | http://localhost:4000 |
| API docs (Swagger) | http://localhost:4000/api/docs |
| Health check | http://localhost:4000/health |

Vite proxies `/api` to the backend, so there are no CORS issues in development.

### Environment variables

Both env files are gitignored. Never commit real keys.

| File | Required | Optional |
| --- | --- | --- |
| `backend/.env` | `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `GEMINI_API_KEY` or `OPENAI_API_KEY` with `AI_PROVIDER`, `ABDM_*`, `SENDGRID_*` |
| `frontend/.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | |

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Demo accounts

`npm run demo:accounts` creates one confirmed login per role and writes the credentials to `DEMO_ACCOUNTS.md`, which is gitignored so working logins are never committed.

### Useful commands

| Command | Where | What it does |
| --- | --- | --- |
| `npm run dev:all` | root | Backend and frontend together |
| `npm test` | root | All tests: shared, frontend and backend |
| `npm run mobile` | root | Start the Expo app |
| `npm run db:reset` | backend | Delete, re-migrate and re-seed the database |
| `npm run demo:boot` | backend | Full rebuild of demo data, used on every server start in production |

---

## Testing

```bash
npm test
```

| Package | Tests |
| --- | --- |
| Backend | 402 tests in 18 files, run against a throwaway database |
| Shared | 55 tests |
| Frontend | 9 tests |

The backend suite covers access control between roles, the referral state machine, concurrent bed allocation, inventory races, sync idempotency, two-factor sign-in, ABHA rules, AI provider fallback, messaging and urgent alerts.

---

## Data sources

Every real-world figure used on the analytics screens is listed with its government source in [DATA_SOURCES.md](DATA_SOURCES.md). Anything not listed there is demo data.

---

## Not yet integrated

These parts are planned or partly built, but are **not** connected in the running system today.

| Component | Status | Detail |
| --- | --- | --- |
| Supabase PostgreSQL as the database | ❌ Not wired in | Schema (42 tables), 50 RLS policies and indexes are written in `supabase/migrations/`, but the SQL has never been run against a real database |
| Running data layer | ❌ Still SQLite | `node:sqlite` is synchronous and the Supabase client is async only. Switching needs 243 call sites across 20 files made async, and 15 transactional flows rewritten as PostgreSQL functions |
| Serverless deployment | ❌ Not Vercel compatible | The backend still uses `app.listen()`, so it runs as a long-lived server on Render rather than as serverless functions |
| Persistent data in the live demo | ❌ Resets on restart | The Render free plan has no disk, so the database is rebuilt with demo data on every restart. Anything created on the live site is lost |
| ABDM / ABHA verification | ❌ Not certified | The ABHA V3 client is written but needs NHA sandbox credentials and M1 certification. Until then ABHA numbers are stored as entered and never shown as verified |
| Email notifications | ❌ Not sending | SendGrid settings exist, but emails are only written to the server log |
| SMS alerts | ❌ Not built | No SMS gateway is connected. Alerts are in-app only |
| Cloud file storage | ❌ Local only | Documents are stored on the server's disk (`STORAGE_PROVIDER=local`) |
| Video calls on strict networks | ❌ No TURN server | Calls use public STUN servers only, so they can fail behind strict firewalls or carrier NAT |
| Mobile app for all roles | ❌ Partial | The Expo app covers ASHA and patient workflows. Doctor, specialist and admin use the web app |
