/* ==========================================================================
   USAFI SMART — Authentication helpers (Modular SDK, ES module)

   PHASE 2 scope so far: exposes the Auth instance and the standard sign-in
   functions. Role-based redirects and custom-claims checks (customer, cleaner,
   company, admin) are added in the login phases.

   SECURITY: roles must come from server-controlled data (custom claims set
   with a trusted server-side tool). Never trust a role stored or chosen on the
   client, and never hardcode an admin password.
   ========================================================================== */

import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getIdTokenResult
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

export { auth };

/** Subscribe to sign-in state changes. Returns the unsubscribe function. */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getIdTokenResult
};
