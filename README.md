# USAFI SMART

Cleaning services marketplace (Book • Clean • Relax) — Dar es Salaam, Tanzania. Currency: TZS.

## Status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Project setup, folder structure, brand design, homepage, responsive navigation | Built — awaiting your testing |
| 2 | Firebase config, authentication, role-based login | Not started |
| 3–10 | See master prompt | Not started |

**Not connected yet:** Firebase, payments, Google Maps, notifications. Nothing in Phase 1 talks to a backend.

## Running locally (VS Code)

1. Open the `USAFI-SMART` folder in VS Code.
2. Install the **Live Server** extension (Ritwick Dey).
3. Right-click `index.html` → **Open with Live Server**.

(Opening `index.html` directly also works for Phase 1, but Live Server is needed from Phase 2 onward.)

## Structure

```
USAFI-SMART/
├── index.html            Public homepage
├── js/home.js            Homepage script (service cards)
├── assets/
│   ├── images/logo.svg   TEMPORARY logo — replace with the approved one
│   └── templates/        Integrity Declaration + Application Letter (Phase 5)
├── shared/
│   ├── styles.css        Brand design system used by every page
│   ├── ui.js             Navigation toggle, header scroll, footer year
│   ├── firebase-config.js, auth.js, database.js,
│   │   storage.js, notifications.js     (placeholders — Phase 2+)
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
