# MahaAarogya Sangam (ArogyaSetu)

Digital public health platform — React + TypeScript frontend, Express + SQLite backend,
with real phone-OTP authentication via Firebase.

---

## Quick Start

```bash
# 1. Install all dependencies (root, frontend and backend)
npm install
npm run install:all

# 2. Create the env files (see "Environment Setup" below — the app will not
#    let you log in until the Firebase values are filled in)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Run backend + frontend together
npm run dev:all
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Health check: http://localhost:4000/health

Vite proxies `/api/*` to the backend on port 4000, so the frontend calls
relative URLs and there are no CORS issues in development.

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

### Auth (`/api/auth`)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/phone-login` | — | Verifies a Firebase ID token; logs in an existing user, or creates one when profile fields are supplied. Returns `NEW_USER` if the number is unregistered and no profile was sent. |
| `GET` | `/me` | Cookie | Returns the current logged-in user |
| `POST` | `/logout` | — | Clears the session cookie |

### Appointments (`/api/appointments`)

All require a valid session cookie and are **scoped to the logged-in user** —
you can only read or modify your own appointments.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | List your appointments |
| `POST` | `/` | Book one. Requires `doctor`, `specialty`, `facility`, `date`, `time`, `type` (`in-person` \| `telemedicine`); optional `reason` |
| `PATCH` | `/:id/cancel` | Cancel an upcoming appointment |
| `PATCH` | `/:id/reschedule` | Change date/time. Requires `date` and `time` |

### Reference data (`/api`)

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/patients` · `/patients/:id` | Seeded patient records |
| `GET` | `/prescriptions?patientId=` · `/prescriptions/:id` | Seeded prescriptions |

---

## Database

SQLite via Node's built-in `node:sqlite`, stored at `backend/arogyasetu.sqlite`
(gitignored). Tables are created automatically on server start.

| Table | Contents |
| --- | --- |
| `users` | Accounts. `phone` is the unique identity key; no passwords stored |
| `appointments` | Booked appointments, linked to `users.id` via `patient_id` |
| `patients` | Seeded demo patient records |
| `prescriptions` | Seeded demo prescriptions |

Inspect the database directly:

```bash
cd backend
node -e "import('./db.js').then(({default:db})=>console.log(db.prepare('SELECT * FROM users').all()))"
```

Reset it completely by deleting `backend/arogyasetu.sqlite` and restarting the
server — seed data is recreated, but registered users and appointments are lost.

> **Note:** other features (referrals, tasks, home visits, inventory, etc.) still
> read/write **browser IndexedDB** through `frontend/src/services/api/dataService.ts`,
> not this server database. Only auth and appointments are server-persisted so far.

---

## Project Structure

```
ArogyaSetu/
├── backend/
│   ├── index.js                 # Express app entry, route mounting, CORS
│   ├── db.js                    # SQLite schema, migrations, seeding
│   ├── authRoutes.js            # Phone-OTP login, /me, logout
│   ├── appointmentsRoutes.js    # Appointment CRUD
│   ├── routes.js                # Seeded patients/prescriptions
│   ├── seedData.js
│   ├── lib/
│   │   ├── firebaseAdmin.js     # Verifies Firebase ID tokens
│   │   ├── token.js             # Session JWT signing
│   │   └── mailer.js            # SendGrid welcome email (optional)
│   └── middleware/auth.js       # requireAuth guard
└── frontend/
    └── src/
        ├── App.tsx              # Routes + role-based guards
        ├── pages/               # auth, patient, doctor, asha, specialist, admin, public
        ├── components/          # ui/, layout/, healthcare/, maps/, ai/
        ├── services/
        │   ├── auth/            # Firebase client, auth context, API client
        │   ├── api/             # backendApi, appointmentsApi, dataService
        │   └── offline/         # IndexedDB + sync queue
        ├── hooks/               # useI18n, useToast, useOfflineStatus
        └── data/                # mock/seed data, i18n (en/hi/mr)
```

### Roles

`patient`, `asha`, `doctor`, `specialist`, `admin` — each has its own workspace and
route guard. A user's role is chosen at registration and stored on their account.

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
