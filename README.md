# USAFI SMART

Cleaning services marketplace (Book • Clean • Relax) — Dar es Salaam, Tanzania. Currency: TZS.

## Status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Project setup, folder structure, brand design, homepage, responsive navigation | Built — awaiting your testing |
| 2 | Firebase config, authentication, role-based login | Firebase SDK wired (config, Auth, Database, Storage, Analytics) — **live connection not yet confirmed**; role-based login not started |
| 3–10 | See master prompt | Not started |

**Not confirmed / not connected yet:** the Firebase connection (verify with `firebase-check.html`, see below), payments, Google Maps, notifications. Security rules are not deployed from this repository yet.

## Running locally (VS Code)

1. Open the `USAFI-SMART` folder in VS Code.
2. Install the **Live Server** extension (Ritwick Dey).
3. Right-click `index.html` → **Open with Live Server**.

(Opening `index.html` directly works for the homepage, but Firebase uses ES modules, so Firebase pages must be served over `http://localhost` — use Live Server.)

## Firebase (Modular SDK)

The project has no build step, so the Firebase **Modular SDK is loaded as ES modules from Google's CDN**, pinned to one version (currently `13.2.0`). When upgrading, change the version string in the four files that contain `firebasejs/`: `shared/firebase-config.js`, `auth.js`, `database.js`, `storage.js`.

| File | Purpose |
|------|---------|
| `shared/firebase-config.js` | Web config, `initializeApp`, `auth`, `db`, `storage`, and Analytics (`analyticsReady`, guarded by `isSupported()`) |
| `shared/auth.js` | `auth`, `onAuthChange`, sign-in/sign-out functions |
| `shared/database.js` | `db` and the common Realtime Database functions |
| `shared/storage.js` | `storage`, `storageRef`, upload helpers, 5 MB / PDF-JPG-PNG validation |
| `firebase-check.html` + `js/firebase-check.js` | Diagnostic page (not part of the customer site; may be deleted before launch) |

Use in a page: `<script type="module" src="../shared/firebase-config.js"></script>`, or `import { auth } from "../shared/auth.js";` from another module.

**To verify the connection:** open `firebase-check.html` through Live Server and read the result of each check.

**Firebase Console steps (done by the project owner):**
1. Authentication → Sign-in method → enable **Email/Password**.
2. Build → Realtime Database → create the database.
3. Build → Storage → create the default bucket.
4. Project settings → Your apps → copy the **complete** `appId` (it must look like `1:803722934636:web:<hash>`; the value currently in `firebase-config.js` ends at `:web` and needs confirming).
5. Set Database and Storage rules before storing real data (rules are not yet in this repo).
6. Google Cloud Console → Credentials → restrict the API key to your domains.

The web config values are identifiers, not secrets. Never commit service-account keys or Admin SDK keys (`.gitignore` blocks the common file names).

## Structure

```
USAFI-SMART/
├── index.html            Public homepage
├── firebase-check.html   Firebase connection diagnostic (developer tool)
├── js/home.js            Homepage script (service cards)
├── js/firebase-check.js  Script for the diagnostic page
├── assets/
│   ├── images/logo.svg   TEMPORARY logo — replace with the approved one
│   └── templates/        Integrity Declaration + Application Letter (Phase 5)
├── shared/
│   ├── styles.css        Brand design system used by every page
│   ├── ui.js             Navigation toggle, header scroll, footer year
│   ├── firebase-config.js, auth.js, database.js, storage.js   (Firebase modular SDK)
│   └── notifications.js  (placeholder — Phase 8)
├── customer/   index, register, login, booking, tracking, bookings, profile
├── cleaner/    index, registration, login, jobs, earnings, profile, documents
├── company/    index, registration, login, jobs, employees, earnings, documents
└── admin/      index, dashboard, customers, cleaners, companies, bookings,
                services, pricing, payments, verification, reports, settings
```

Pages other than `index.html` are placeholders showing which phase will build them.

## Brand colours

Green `#16A34A` · Dark green `#14532D` · Navy `#022B5B` · White `#FFFFFF` · Light grey `#F3F4F6`
(defined once as CSS variables in `shared/styles.css`).

## Security rules for later phases

- No Firebase Admin SDK keys, service-account files or payment secrets in frontend code.
- No hardcoded admin password; admin role via Firebase custom claims, assigned server-side.
- Prices, commission and payment status are validated server-side (Cloud Functions).
