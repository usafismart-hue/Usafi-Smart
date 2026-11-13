/* ==========================================================================
   USAFI SMART — Account creation, login and form helpers (ES module)

   Registration writes ONLY what the Database Rules allow a new user to write:
   - users/<uid>                  accountType customer|cleaner|company (never admin)
   - customers|cleaners|companies/<uid>   the role's profile
   - provider_verification/<uid>  status "pending" (providers only; only an
                                  admin can approve)
   Passwords go to Firebase Auth only and are never stored in the database.
   ========================================================================== */

import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  deleteUser
} from "./auth.js";
import { db, ref, update, serverTimestamp } from "./database.js";
import { getRole, ROLE_HOME } from "./session.js";

/* ---------- Small helpers ---------- */

function fail(message) {
  const err = new Error(message);
  err.userMessage = message;
  throw err;
}

/** Keeps digits (and a leading +). 0712345678 -> +255712345678. */
export function normalizePhone(raw) {
  let p = String(raw || "").replace(/[\s\-()]/g, "");
  if (/^0[0-9]{9}$/.test(p)) p = "+255" + p.slice(1);
  else if (/^255[0-9]{9}$/.test(p)) p = "+" + p;
  return p;
}

function checkPhone(raw, label) {
  const p = normalizePhone(raw);
  if (!/^\+?[0-9]{9,15}$/.test(p)) fail((label || "Namba ya simu") + " si sahihi. Mfano: 0712 345 678.");
  return p;
}

function checkNida(raw, label) {
  const n = String(raw || "").replace(/[\s\-]/g, "");
  if (n.length < 8 || n.length > 30) fail((label || "Namba ya NIDA") + " si sahihi (herufi 8 hadi 30).");
  return n;
}

/** Drops empty strings/undefined so optional fields are simply absent. */
function clean(obj) {
  const out = {};
  Object.keys(obj).forEach(function (k) {
    const v = obj[k];
    if (v === undefined || v === null || v === "") return;
    out[k] = v;
  });
  return out;
}

function checkCredentials(d) {
  const email = String(d.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Barua pepe si sahihi.");
  if (String(d.password || "").length < 8) fail("Nenosiri liwe na herufi 8 au zaidi.");
  if (d.password !== d.confirm) fail("Manenosiri hayafanani.");
  return email;
}

/** Translates Firebase / database errors into simple Swahili. */
export function authMessage(err) {
  if (err && err.userMessage) return err.userMessage;
  const code = (err && err.code) || "";
  const map = {
    "auth/email-already-in-use": "Barua pepe hii tayari imesajiliwa. Jaribu kuingia.",
    "auth/invalid-email": "Barua pepe si sahihi.",
    "auth/weak-password": "Nenosiri ni dhaifu. Tumia herufi 8 au zaidi.",
    "auth/invalid-credential": "Barua pepe au nenosiri si sahihi.",
    "auth/wrong-password": "Barua pepe au nenosiri si sahihi.",
    "auth/user-not-found": "Barua pepe au nenosiri si sahihi.",
    "auth/user-disabled": "Akaunti hii imezimwa. Wasiliana nasi.",
    "auth/too-many-requests": "Majaribio mengi mno. Subiri kidogo kisha jaribu tena.",
    "auth/network-request-failed": "Hakuna mtandao. Angalia muunganisho wako.",
    "auth/operation-not-allowed": "Kuingia kwa barua pepe hakijawashwa kwenye Firebase.",
    "auth/missing-password": "Weka nenosiri."
  };
  if (map[code]) return map[code];
  if (code === "PERMISSION_DENIED" || /permission_denied/i.test((err && err.message) || "")) {
    return "Huna ruhusa ya kuhifadhi data hii. Wasiliana nasi.";
  }
  console.error(err);
  return "Hitilafu imetokea. Jaribu tena.";
}

/* ---------- Account creation ---------- */

/**
 * Creates the Auth user, then writes the profile in ONE multi-path update.
 * If the profile write fails, the new Auth user is deleted so the person can
 * simply try again with the same email.
 */
async function createAccount(email, password, buildWrites) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await update(ref(db), buildWrites(cred.user.uid));
  } catch (e) {
    try { await deleteUser(cred.user); } catch (_) { /* nothing more to do */ }
    throw e;
  }
  return cred.user;
}

export async function registerCustomer(d) {
  const email = checkCredentials(d);
  const fullName = String(d.fullName || "").trim();
  if (!fullName) fail("Weka jina kamili.");
  const phone = checkPhone(d.phone);
  const district = String(d.district || "").trim();

  return createAccount(email, d.password, function (uid) {
    const w = {};
    w["users/" + uid] = { accountType: "customer", fullName: fullName, phone: phone, email: email, createdAt: serverTimestamp() };
    w["customers/" + uid] = clean({ fullName: fullName, phone: phone, email: email, district: district, createdAt: serverTimestamp() });
    return w;
  });
}

export async function registerCleaner(d) {
  const email = checkCredentials(d);
  const fullName = String(d.fullName || "").trim();
  if (!fullName) fail("Weka jina kamili.");
  const phone = checkPhone(d.phone);
  const nida = checkNida(d.nidaNumber);
  const address = String(d.residentialAddress || "").trim();
  if (!address) fail("Weka anwani ya makazi.");

  const areas = String(d.serviceAreas || "")
    .split(",")
    .map(function (s) { return s.trim(); })
    .filter(Boolean)
    .slice(0, 10);
  if (areas.some(function (a) { return a.length > 60; })) fail("Jina la eneo ni refu mno.");

  const years = d.experienceYears === "" || d.experienceYears === undefined ? undefined : Number(d.experienceYears);
  if (years !== undefined && (!(years >= 0) || years > 60)) fail("Miaka ya uzoefu iwe kati ya 0 na 60.");

  return createAccount(email, d.password, function (uid) {
    const w = {};
    w["users/" + uid] = { accountType: "cleaner", fullName: fullName, phone: phone, email: email, createdAt: serverTimestamp() };
    const profile = clean({
      fullName: fullName,
      phone: phone,
      email: email,
      nidaNumber: nida,
      residentialAddress: address,
      experienceYears: years,
      experienceNotes: String(d.experienceNotes || "").trim(),
      available: true,
      createdAt: serverTimestamp()
    });
    if (areas.length) profile.serviceAreas = areas;
    w["cleaners/" + uid] = profile;
    w["provider_verification/" + uid] = { providerType: "cleaner", status: "pending", submittedAt: serverTimestamp() };
    return w;
  });
}

export async function registerCompany(d) {
  const email = checkCredentials(d);
  const companyName = String(d.companyName || "").trim();
  if (!companyName) fail("Weka jina la kampuni.");
  const brela = String(d.brelaNumber || "").trim();
  if (!brela) fail("Weka namba ya BRELA.");
  const licence = String(d.businessLicenseNumber || "").trim();
  if (!licence) fail("Weka namba ya leseni ya biashara.");
  const phone = checkPhone(d.phone, "Namba ya simu ya kampuni");
  const directorName = String(d.directorName || "").trim();
  if (!directorName) fail("Weka jina la mkurugenzi.");
  const directorPhone = checkPhone(d.directorPhone, "Namba ya simu ya mkurugenzi");
  const directorNida = d.directorNida ? checkNida(d.directorNida, "Namba ya NIDA ya mkurugenzi") : "";

  return createAccount(email, d.password, function (uid) {
    const w = {};
    // users.fullName holds the company name for company accounts.
    w["users/" + uid] = { accountType: "company", fullName: companyName, phone: phone, email: email, createdAt: serverTimestamp() };
    w["companies/" + uid] = clean({
      companyName: companyName,
      brelaNumber: brela,
      businessLicenseNumber: licence,
      phone: phone,
      email: email,
      address: String(d.address || "").trim(),
      region: String(d.region || "").trim(),
      district: String(d.district || "").trim(),
      director: clean({ fullName: directorName, phone: directorPhone, nidaNumber: directorNida }),
      createdAt: serverTimestamp()
    });
    w["provider_verification/" + uid] = { providerType: "company", status: "pending", submittedAt: serverTimestamp() };
    return w;
  });
}

/* ---------- Login ---------- */

/** Signs in and returns the page the person should go to. */
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, String(email || "").trim(), String(password || ""));
  const role = await getRole(cred.user);
  if (!role) {
    await signOut(auth);
    fail("Wasifu wa akaunti haupatikani. Jisajili tena au wasiliana nasi.");
  }
  return ROLE_HOME[role] || "../index.html";
}

export async function resetPassword(email) {
  const e = String(email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) fail("Weka barua pepe kwanza, kisha bonyeza \"Umesahau nenosiri?\".");
  await sendPasswordResetEmail(auth, e);
}

/* ---------- Form wiring ---------- */

function setMsg(el, text, kind) {
  if (!el) return;
  el.textContent = text || "";
  el.className = "form__msg" + (kind ? " form__msg--" + kind : "");
}

/**
 * Wires a <form> to an async handler.
 * handler(dataObject) -> may return a URL string to go to on success.
 * Needs a <p id="msg"> in the page for messages.
 */
export function bindForm(form, handler, options) {
  const opts = options || {};
  const msg = document.getElementById("msg");
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    setMsg(msg, "");
    if (button) button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const result = await handler(data);
      const target = typeof result === "string" ? result : opts.redirect;
      setMsg(msg, opts.success || "Imefanikiwa.", "ok");
      if (target) location.assign(target);
      else if (button) button.disabled = false;
    } catch (err) {
      setMsg(msg, authMessage(err), "error");
      if (button) button.disabled = false;
    }
  });
  return { setMsg: function (t, k) { setMsg(msg, t, k); } };
}

/** Shows a notice on login pages when sent back because of a missing profile. */
export function showLoginNotice() {
  const msg = document.getElementById("msg");
  if (msg && new URLSearchParams(location.search).get("e") === "profile") {
    setMsg(msg, "Wasifu wa akaunti haupatikani. Jisajili tena au wasiliana nasi.", "error");
  }
}

export { ROLE_HOME };
