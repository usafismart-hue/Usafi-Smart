/* ==========================================================================
   USAFI SMART — Session and role helpers (ES module)

   ROLES COME FROM THE SERVER, NEVER FROM THE BROWSER:
   - "admin"  -> Firebase custom claim `admin: true` (set with tools/set-admin.js)
   - others   -> users/<uid>/accountType in the Realtime Database (the rules
                 make it unchangeable once written, and "admin" cannot be
                 self-assigned).
   This file only decides WHERE to send the person. The real protection is the
   Database/Storage Rules; hiding a page is never security.
   ========================================================================== */

import { auth, onAuthChange, signOut, getIdTokenResult } from "./auth.js";
import { db, ref, get } from "./database.js";

// Paths are relative to a page inside customer/, cleaner/, company/ or admin/.
export const ROLE_HOME = {
  customer: "../customer/index.html",
  cleaner: "../cleaner/index.html",
  company: "../company/index.html",
  admin: "../admin/dashboard.html"
};

/** Returns "customer" | "cleaner" | "company" | "admin" | null (no profile). */
export async function getRole(user) {
  const token = await getIdTokenResult(user);
  if (token.claims.admin === true) return "admin";
  const snap = await get(ref(db, "users/" + user.uid + "/accountType"));
  return snap.exists() ? snap.val() : null;
}

/**
 * Guard for a role's own pages. Resolves { user, role } when the signed-in
 * person has the expected role; otherwise redirects (login page, or the page
 * that matches their real role) and never resolves.
 */
export function requireRole(expected) {
  return new Promise(function (resolve) {
    let settled = false;
    onAuthChange(async function (user) {
      if (!user) {
        location.replace("login.html");
        return;
      }
      let role = null;
      try {
        role = await getRole(user);
      } catch (e) {
        console.error("getRole failed", e);
      }
      if (role === null) {
        await signOut(auth);
        location.replace("login.html?e=profile");
        return;
      }
      if (role !== expected) {
        location.replace(ROLE_HOME[role] || "../index.html");
        return;
      }
      if (!settled) {
        settled = true;
        resolve({ user: user, role: role });
      }
    });
  });
}

/** For login pages: if already signed in with a profile, go to the right home. */
export function redirectIfSignedIn() {
  onAuthChange(async function (user) {
    if (!user) return;
    try {
      const role = await getRole(user);
      if (role && ROLE_HOME[role]) location.replace(ROLE_HOME[role]);
    } catch (e) {
      console.error("redirectIfSignedIn failed", e);
    }
  });
}

/** Wires every [data-logout] element to sign out and return to the homepage. */
export function wireLogout() {
  document.querySelectorAll("[data-logout]").forEach(function (el) {
    el.addEventListener("click", async function (ev) {
      ev.preventDefault();
      await signOut(auth);
      location.replace("../index.html");
    });
  });
}
