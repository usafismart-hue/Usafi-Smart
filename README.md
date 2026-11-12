# USAFI SMART

Cleaning services marketplace (Book • Clean • Relax) — Dar es Salaam, Tanzania. Currency: TZS.

## Status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Project setup, folder structure, brand design, homepage, responsive navigation | Built — awaiting your testing |
| 2 | Firebase config, authentication, role-based login | Firebase SDK wired (config, Auth, Database, Storage, Analytics); security rules drafted (not deployed) — **live connection not yet confirmed**; role-based login not started |
| 3–10 | See master prompt | Not started |

**Not confirmed / not connected yet:** the Firebase connection (verify with `firebase-check.html`, see below), payments, Google Maps, notifications. Security rules are drafts in this repository and have **not** been deployed to the Firebase project.

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
| `database.rules.json` | **Draft** Realtime Database rules (deny by default) |
| `storage.rules` | **Draft** Storage rules (private provider documents, 5 MB, PDF/JPG/PNG) |
| `firebase.json`, `.firebaserc` | Firebase CLI config: rules file locations, emulator ports, default project `usafi-smart` (no hosting or functions configured) |

Use in a page: `<script type="module" src="../shared/firebase-config.js"></script>`, or `import { auth } from "../shared/auth.js";` from another module.

**To verify the connection:** open `firebase-check.html` through Live Server and read the result of each check. The page separates *Initialised* (code started inside the browser; proves nothing about the network) from *Connected* (Firebase's servers actually answered). It creates no accounts and writes no data: it makes one sign-in attempt with a random password (always rejected) and read-only probes without signing in, to see whether the rules are closed. Use **Nakili ripoti** to copy the result.

Status words: `Connected`, `Initialised`, `Locked` (rules closed — good), `Rules Open` (publicly readable — fix before real data), `Not Enabled`, `Not Connected`, `Blocked`, `Not Verified`.

**Firebase Console steps (done by the project owner):**
1. Authentication → Sign-in method → enable **Email/Password**.
2. Build → Realtime Database → create the database.
3. Build → Storage → create the default bucket.
4. Review the draft rules below, then deploy them (see "Security rules").
5. Google Cloud Console → Credentials → restrict the API key to your domains.

## Security rules (DRAFT — not deployed)

`database.rules.json` and `storage.rules` deny everything by default and open only what each role needs. They have **not** been deployed to the Firebase project and have **not** been tested against the official Firebase emulator.

**Roles.** `admin` comes only from the Firebase custom claim `admin: true`, which must be set with a trusted server-side tool (Admin SDK), never from the browser. Customers, cleaners and companies are identified by ownership (their own UID); what a provider may do depends on `provider_verification/<uid>/status`, which only an admin can change (a provider may only create the first `pending` marker).

**Main protections**
- Users read and write only their own profile; `accountType` cannot be `admin` and cannot be changed.
- Cleaner/company profiles (NIDA, BRELA, licence numbers) are private to the owner and admins. Those identity numbers cannot be changed by the provider once approved.
- Provider documents: metadata in `provider_documents/<uid>/<type>/<id>` and files in Storage `provider_documents/<uid>/<type>/<file>`. Owner and admin read; the owner can create but never overwrite; only admins delete. PDF/JPG/PNG, max 5 MB.
- Bookings: a customer can create one (status `created`, no price, no provider, no payment fields) and can only cancel early. Only the assigned provider can move it `assigned → accepted → on_the_way → started → completed`. Price (`quote`), payment status, assignment and `payment_confirmed` are admin/server only. An admin cannot assign a provider who is not approved, or a cleaner who is not `available`.
- Payments are written only by the server and read only by the paying customer and admins. Commission and discounts live in `settings` (admin only).
- Reviews: one per booking, only by that booking's customer, only after completion, rating 1–5.
- Notifications: created by the server; the owner can only mark their own as read.
- Added path beyond the original list: `user_bookings/<uid>/<bookingId>` (a "my bookings" index so users can list theirs without reading all bookings). Provider entries are written by the server.

**Things rules cannot do (needed in later phases)**
- Cloud Functions (Admin SDK bypasses rules, so they must repeat these checks): price and commission calculation, payment verification and webhooks, provider assignment, setting `payment_confirmed`, creating notifications and the `user_bookings` entries for providers, and setting custom claims. Cloud Functions require the Firebase **Blaze** plan.
- A trusted script (run locally with a service account that is never committed) to give the first administrator the `admin` claim. No admin password is stored anywhere.
- Suspending a user: disable the account in Firebase Authentication from the server.

**How to test the rules before deploying**
1. Install the Firebase CLI (`npm install -g firebase-tools`) and Java 21 or newer, then `firebase login`.
2. Run `firebase emulators:start --only auth,database,storage` from this folder (ports are in `firebase.json`; UI at http://localhost:4000).
3. Or paste the file into Firebase Console → Realtime Database → Rules → **Rules Playground** and simulate reads/writes as unauthenticated, as a customer UID, and with a custom `admin` token.
4. Deploy only after the checks pass: `firebase deploy --only database,storage --project usafi-smart`. Deploying overwrites the rules currently in the Console, so review them first.
5. Reopen `firebase-check.html`: both rule rows should read **Locked**.

The web config values are identifiers, not secrets. Never commit service-account keys or Admin SDK keys (`.gitignore` blocks the common file names).

## Structure

```
USAFI-SMART/
├── index.html            Public homepage
├── firebase-check.html   Firebase connection diagnostic (developer tool)
├── js/home.js            Homepage script (service cards)
├── js/firebase-check.js  Script for the diagnostic page
├── database.rules.json   Draft Realtime Database rules (not deployed)
├── storage.rules         Draft Storage rules (not deployed)
├── firebase.json, .firebaserc   Firebase CLI config
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
