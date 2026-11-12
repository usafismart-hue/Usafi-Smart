/* ==========================================================================
   USAFI SMART — Firebase connection check (ES module)

   Developer tool. Every result comes from what actually happened in THIS
   browser, and it separates two different things:

     Initialised = code started inside the browser (no contact with Firebase proven)
     Connected   = Firebase's servers really answered a request

   Safety: no account is created and no data is written. The only requests are
     - one sign-in attempt with a random password (it always fails),
     - read-only probes of the database and storage bucket (no sign-in),
     - the Analytics start-up.
   ========================================================================== */

var list = document.getElementById("checks");
var summaryEl = document.getElementById("summary");
var copyBtn = document.getElementById("copy");
var copyMsg = document.getElementById("copy-status");

/* status key -> badge colour class + label shown to the owner */
var STATUS = {
  connected:    { cls: "ok",   label: "Connected" },
  initialised:  { cls: "ok",   label: "Initialised" },
  locked:       { cls: "ok",   label: "Locked" },
  notconnected: { cls: "fail", label: "Not Connected" },
  blocked:      { cls: "fail", label: "Blocked" },
  open:         { cls: "fail", label: "Rules Open" },
  notenabled:   { cls: "warn", label: "Not Enabled" },
  notverified:  { cls: "warn", label: "Not Verified" },
  info:         { cls: "info", label: "Info" }
};

var counts = {};
var report = [];

function addRow(status, title, detail) {
  var st = STATUS[status];
  counts[status] = (counts[status] || 0) + 1;
  report.push(st.label + " | " + title + (detail ? " | " + detail : ""));

  var li = document.createElement("li");
  li.className = st.cls;

  var badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = st.label;

  var box = document.createElement("div");
  var strong = document.createElement("strong");
  strong.textContent = title;
  box.appendChild(strong);

  if (detail) {
    var d = document.createElement("span");
    d.className = "detail";
    d.textContent = detail;
    box.appendChild(d);
  }

  li.appendChild(badge);
  li.appendChild(box);
  list.appendChild(li);
}

function codeOf(e) { return e && e.code ? String(e.code) : ""; }

function withTimeout(promise, ms, label) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () {
      var err = new Error(label + " haikujibu ndani ya sekunde " + ms / 1000);
      err.code = "check/timeout";
      reject(err);
    }, ms);
    promise.then(function (v) { clearTimeout(t); resolve(v); },
                 function (e) { clearTimeout(t); reject(e); });
  });
}

function randomPassword() {
  var a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}

async function run() {
  list.replaceChildren();
  counts = {};
  report = [];
  summaryEl.textContent = "";
  copyMsg.textContent = "";

  /* 0. Page origin */
  if (location.protocol === "file:") {
    addRow("notverified", "Ukurasa umefunguliwa kama faili (file://)",
      "Fungua kupitia Live Server (http://localhost:5500). Kwenye file:// moduli na Analytics havifanyi kazi.");
  } else {
    addRow("info", "Ukurasa unaendeshwa kupitia " + location.protocol + "//" + location.host);
  }

  /* 1. SDK downloaded by the browser (dynamic import so a failure is reported, not silent) */
  var cfgModule, authModule, dbModule, storageModule;
  try {
    cfgModule = await import("../shared/firebase-config.js");
    authModule = await import("../shared/auth.js");
    dbModule = await import("../shared/database.js");
    storageModule = await import("../shared/storage.js");
    addRow("connected", "1. SDK imepakuliwa na browser",
      "Moduli za Firebase zimepakiwa kutoka gstatic.com (toleo limebandikwa kwenye shared/firebase-config.js).");
  } catch (e) {
    addRow("notconnected", "1. SDK haikupakuliwa na browser",
      "Sababu: " + e.message + ". Inawezekana: huna intaneti, mtandao au ad-blocker unazuia gstatic.com, au toleo lililobandikwa halipo kwenye CDN.");
    addRow("notverified", "Hatua 2 hadi 6 hazikuweza kujaribiwa", "Zinahitaji SDK ipakuliwe kwanza.");
    finish();
    return;
  }

  var cfg = cfgModule.firebaseConfig;

  /* 2. App initialised (local only; says nothing about the network) */
  var appIdOk = /^1:\d+:web:[0-9a-f]+$/i.test(cfg.appId);
  addRow("initialised", "2. Firebase App imeanzishwa (ndani ya browser tu)",
    "Project: " + cfg.projectId + " | appId " + (appIdOk ? "ina muundo kamili" : "HAINA muundo kamili: " + cfg.appId) +
    ". Hatua hii haithibitishi mawasiliano na Firebase.");

  /* 3. Authentication: a real request that is guaranteed to fail (random password, no account created) */
  try {
    await withTimeout(
      authModule.signInWithEmailAndPassword(cfgModule.auth, "usafi-connection-check@example.com", randomPassword()),
      12000, "Authentication");
    try { await authModule.signOut(cfgModule.auth); } catch (ignored) { /* nothing to sign out of */ }
    addRow("notverified", "3. Authentication: jibu lisilotarajiwa",
      "Ombi la majaribio halikukataliwa. Hili halitarajiwi; ripoti hili.");
  } catch (e) {
    var ac = codeOf(e);
    if (/operation-not-allowed/.test(ac)) {
      addRow("notenabled", "3. Authentication inawasiliana, lakini Email/Password haijawashwa",
        "Firebase ilijibu, ila njia ya Email/Password imezimwa. Washa kwenye Firebase Console > Authentication > Sign-in method.");
    } else if (/(invalid-credential|user-not-found|wrong-password|invalid-login-credentials|invalid-email|user-disabled|too-many-requests)/.test(ac)) {
      addRow("connected", "3. Authentication inawasiliana na Firebase, Email/Password imewashwa",
        "Firebase ilijibu (" + ac + "). Nywila bandia ilikataliwa kama ilivyotarajiwa; hakuna akaunti iliyoundwa.");
    } else if (/(api-key|referer|app-not-authorized|unauthorized-domain|requests-from)/.test(ac)) {
      addRow("blocked", "3. Authentication imezuiwa",
        "Msimbo: " + ac + ". Angalia vizuizi vya API key (Google Cloud Console > Credentials) na Authorized domains (Authentication > Settings) kwa localhost na domain yako.");
    } else if (/(network-request-failed|check\/timeout)/.test(ac)) {
      addRow("notconnected", "3. Authentication haikufikia Firebase",
        "Msimbo: " + ac + ". Angalia intaneti, VPN, firewall au ad-blocker (identitytoolkit.googleapis.com).");
    } else {
      addRow("notverified", "3. Authentication: jibu lisilojulikana",
        "Msimbo: " + (ac || e.message) + ".");
    }
  }

  /* 4a. Realtime Database: .info/connected is true only when the real database answers */
  var dbConnected = false;
  try {
    await withTimeout(new Promise(function (resolve) {
      var off = dbModule.onValue(dbModule.ref(cfgModule.db, ".info/connected"), function (snap) {
        if (snap.val() === true) { if (typeof off === "function") off(); resolve(true); }
      });
    }), 10000, "Realtime Database");
    dbConnected = true;
    addRow("connected", "4. Realtime Database inawasiliana na project yako",
      "Muunganisho halisi wa " + cfg.databaseURL);
  } catch (e) {
    addRow("notconnected", "4. Realtime Database haikuunganishwa",
      e.message + ". Angalia kwamba database imeundwa (Build > Realtime Database), databaseURL ni sahihi, na kwamba mtandao hauzuii firebaseio.com.");
  }

  /* 4b. Database rules: read-only probe without signing in. Writes are never attempted. */
  if (dbConnected) {
    try {
      await withTimeout(dbModule.get(dbModule.ref(cfgModule.db, "connection_check_probe")), 10000, "Database rules");
      addRow("open", "4. Rules za Database zinaruhusu kusoma bila kuingia",
        "Mtu yeyote anaweza kusoma database yako. Si salama: weka rules zilizofungwa (database.rules.json) kabla ya data halisi.");
    } catch (e) {
      var dc = (codeOf(e) + " " + e.message).toLowerCase();
      if (dc.indexOf("permission") !== -1) {
        addRow("locked", "4. Rules za Database zinazuia kusoma bila kuingia",
          "Firebase ilikataa ombi la kusoma bila akaunti (Permission denied). Hili ni jibu zuri.");
      } else {
        addRow("notverified", "4. Rules za Database: jibu lisilojulikana", codeOf(e) || e.message);
      }
    }
  } else {
    addRow("notverified", "4. Rules za Database hazikujaribiwa", "Zinahitaji muunganisho wa Database kwanza.");
  }

  /* 5. Storage: ask for a file that does not exist; the error code shows what answered */
  try {
    await withTimeout(
      storageModule.getDownloadURL(storageModule.storageRef(cfgModule.storage, "connection_check_probe/none.txt")),
      12000, "Storage");
    addRow("open", "5. Storage imejibu na kuruhusu kusoma bila kuingia",
      "Bucket inapatikana lakini rules zake ni wazi. Si salama: weka storage.rules kabla ya nyaraka halisi.");
  } catch (e) {
    var sc = codeOf(e);
    if (/object-not-found/.test(sc)) {
      addRow("open", "5. Storage bucket inapatikana, na rules zinaruhusu kusoma bila kuingia",
        "Faili la majaribio halipo (jibu la kawaida), lakini kwamba ombi liliruhusiwa kunaonyesha rules ni wazi. Si salama.");
    } else if (/(unauthorized|unauthenticated)/.test(sc)) {
      addRow("locked", "5. Storage bucket inapatikana na imefungwa",
        "Firebase ilijibu (" + sc + "): bucket ipo na inakataa kusoma bila kuingia. Hili ni jibu zuri.");
    } else if (/(bucket-not-found|project-not-found)/.test(sc)) {
      addRow("notenabled", "5. Storage bucket haijaundwa",
        "Msimbo: " + sc + ". Unda bucket kwenye Firebase Console > Build > Storage.");
    } else if (/(retry-limit-exceeded|network|check\/timeout)/.test(sc)) {
      addRow("notconnected", "5. Storage haikufikia Firebase",
        "Msimbo: " + sc + ". Angalia intaneti, VPN, firewall au ad-blocker (firebasestorage.googleapis.com).");
    } else {
      addRow("notverified", "5. Storage: jibu lisilojulikana", sc || e.message);
    }
  }

  /* 6. Analytics: starting is not the same as events arriving */
  try {
    var analytics = await withTimeout(cfgModule.analyticsReady, 8000, "Analytics");
    if (analytics) {
      addRow("initialised", "6. Analytics imeanza kwenye browser hii",
        "Measurement ID: " + cfg.measurementId + ". Kufika kwa matukio kwenye Firebase hakujathibitishwa hapa (Not Verified): angalia Firebase Console > Analytics > DebugView.");
    } else {
      addRow("notverified", "6. Analytics haijaanza",
        "Mazingira haya hayaiungi mkono (mfano file://, kuki zimezuiwa, au ad-blocker). Huduma nyingine haziathiriwi.");
    }
  } catch (e) {
    addRow("notverified", "6. Analytics haikuitikia", e.message);
  }

  finish();
}

function finish() {
  var parts = [];
  Object.keys(STATUS).forEach(function (k) {
    if (counts[k] && k !== "info") parts.push(STATUS[k].label + ": " + counts[k]);
  });
  var bad = (counts.notconnected || 0) + (counts.blocked || 0) + (counts.open || 0);
  summaryEl.textContent = (bad > 0
    ? "Kuna mambo " + bad + " yanayohitaji kurekebishwa. "
    : "Hakuna kosa lililogunduliwa. ") + (parts.length ? "(" + parts.join(" | ") + ")" : "");
}

async function copyReport() {
  var text = "USAFI SMART - Ukaguzi wa Firebase\n" + new Date().toISOString() +
             "\nOrigin: " + location.origin + "\n\n" + report.join("\n");
  try {
    await navigator.clipboard.writeText(text);
    copyMsg.textContent = "Ripoti imenakiliwa.";
  } catch (e) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (ignored) { ok = false; }
    document.body.removeChild(ta);
    copyMsg.textContent = ok ? "Ripoti imenakiliwa." : "Imeshindwa kunakili; piga picha ya skrini badala yake.";
  }
}

document.getElementById("rerun").addEventListener("click", function () { run(); });
copyBtn.addEventListener("click", copyReport);
run();
