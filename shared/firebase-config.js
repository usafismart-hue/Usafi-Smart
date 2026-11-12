/* ==========================================================================
   USAFI SMART — Firebase initialisation (Modular SDK, ES module)

   Load from a page with:  <script type="module" src="../shared/firebase-config.js"></script>
   or import from another module:  import { auth, db } from "./firebase-config.js";

   SDK version is pinned. The same version string appears in:
     shared/firebase-config.js, auth.js, database.js, storage.js
   When upgrading, change it in all four (search for "firebasejs/").

   SECURITY NOTES
   - These web config values are NOT secrets (they identify the project).
     Access is protected by Firebase Authentication + Database/Storage Rules,
     so those rules MUST be set before real data is stored.
   - Also restrict the API key to your domains in Google Cloud Console
     (APIs & Services -> Credentials).
   - NEVER put a service-account key, Admin SDK key or payment secret in this
     folder or any frontend file.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-storage.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";

export const firebaseConfig = {
  apiKey: "AIzaSyB412WlnvNCAvH3VQpM-JzXYZ8UjRjSROs",
  authDomain: "usafi-smart.firebaseapp.com",
  databaseURL: "https://usafi-smart-default-rtdb.firebaseio.com",
  projectId: "usafi-smart",
  storageBucket: "usafi-smart.firebasestorage.app",
  messagingSenderId: "803722934636",
  appId: "1:803722934636:web:d5d7461b90c97990a65b49",
  measurementId: "G-P8LYNZKMGH"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

/* Analytics only works in supported browser contexts (http/https, cookies and
   IndexedDB available) — not on file://. Resolves to the Analytics instance,
   or null when unsupported or when it fails to start. It never throws, so a
   blocked analytics script cannot break authentication or database features. */
export const analyticsReady = isSupported()
  .then(function (ok) { return ok ? getAnalytics(app) : null; })
  .catch(function () { return null; });
