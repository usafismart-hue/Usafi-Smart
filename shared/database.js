/* ==========================================================================
   USAFI SMART — Realtime Database helpers (Modular SDK, ES module)

   Exposes the database instance and the common read/write functions.
   Planned top-level paths: users, customers, cleaners, companies, services,
   pricing, bookings, provider_documents, provider_verification, payments,
   reviews, notifications, settings. Use Firebase Auth UIDs as identifiers.

   SECURITY: the browser must never be the only check for prices, commission,
   verification status or payment status. Those are validated server-side
   (Cloud Functions) and protected by Database Rules.
   ========================================================================== */

import { db } from "./firebase-config.js";
import {
  ref,
  child,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

export { db };

export {
  ref,
  child,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
  serverTimestamp
};
