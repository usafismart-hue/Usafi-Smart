/* ==========================================================================
   USAFI SMART — Firebase connection check (ES module)
   Diagnostic only. Reports what actually happened in THIS browser; it never
   claims a service works unless the check really succeeded.
   ========================================================================== */

var list = document.getElementById("checks");
var summaryEl = document.getElementById("summary");
var counts = { ok: 0, warn: 0, fail: 0 };

var LABELS = { ok: "Sawa", warn: "Angalia", fail: "Tatizo", info: "Taarifa" };

function addRow(status, title, detail) {
  if (counts[status] !== undefined) counts[status]++;

  var li = document.createElement("li");
  li.className = status;

  var badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = LABELS[status] || status;

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

function withTimeout(promise, ms, label) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error(label + " haikujibu ndani ya sekunde " + ms / 1000)); }, ms);
    promise.then(function (v) { clearTimeout(t); resolve(v); },
                 function (e) { clearTimeout(t); reject(e); });
  });
}

async function run() {
  list.replaceChildren();
  counts = { ok: 0, warn: 0, fail: 0 };
  summaryEl.textContent = "";

  /* 1. Page origin */
  if (location.protocol === "file:") {
    addRow("warn", "Ukurasa umefunguliwa kama faili (file://)",
      "Fungua kupitia Live Server (http://localhost:5500). Analytics na baadhi ya vipengele havifanyi kazi kwenye file://.");
  } else {
    addRow("ok", "Ukurasa unaendeshwa kupitia " + location.protocol + "//" + location.host);
  }

  /* 2. Load the SDK + config (dynamic import so a blocked CDN shows a clear error) */
  var cfgModule, authModule, dbModule;
  try {
    cfgModule = await import("../shared/firebase-config.js");
    authModule = await import("../shared/auth.js");
    dbModule = await import("../shared/database.js");
    await import("../shared/storage.js");
    addRow("ok", "Moduli za Firebase SDK zimepakiwa",
      "Project: " + cfgModule.firebaseConfig.projectId);
  } catch (e) {
    addRow("fail", "Imeshindwa kupakia Firebase SDK",
      "Sababu: " + e.message + ". Hakikisha una intaneti, na kwamba toleo lililoandikwa kwenye shared/firebase-config.js lipo kwenye gstatic.com/firebasejs.");
    finish();
    return;
  }

  var cfg = cfgModule.firebaseConfig;

  /* 3. appId format */
  if (/^1:\d+:web:[0-9a-f]+$/i.test(cfg.appId)) {
    addRow("ok", "appId ina muundo sahihi");
  } else {
    addRow("warn", "appId inaonekana haijakamilika",
      "Thamani ya sasa: " + cfg.appId + ". Muundo kamili ni 1:803722934636:web:<herufi-na-namba>. Nakili kamili kutoka Firebase Console > Project settings > Your apps. Analytics inaweza isifanye kazi hadi irekebishwe.");
  }

  /* 4. Authentication */
  try {
    var user = await withTimeout(new Promise(function (resolve) {
      var off = authModule.onAuthChange(function (u) { if (typeof off === "function") off(); resolve(u); });
    }), 8000, "Authentication");
    addRow("ok", "Authentication imeanza",
      user ? "Umeingia kama UID " + user.uid : "Hakuna mtumiaji aliyeingia (hali ya kawaida kwa sasa).");
    addRow("info", "Njia za kuingia (Email/Password) hazijajaribiwa hapa",
      "Zinajaribiwa katika Phase 2/3. Hakikisha Email/Password imewashwa kwenye Firebase Console > Authentication > Sign-in method.");
  } catch (e) {
    addRow("fail", "Authentication haikuanza", e.message);
  }

  /* 5. Realtime Database connection (.info/connected needs no read permission) */
  try {
    var connected = await withTimeout(new Promise(function (resolve) {
      var off = dbModule.onValue(dbModule.ref(cfgModule.db, ".info/connected"), function (snap) {
        if (snap.val() === true) { if (typeof off === "function") off(); resolve(true); }
      });
    }), 10000, "Realtime Database");
    addRow("ok", "Realtime Database imeunganishwa", cfg.databaseURL);
  } catch (e) {
    addRow("warn", "Realtime Database haikuunganishwa",
      e.message + ". Angalia kwamba database imeundwa kwenye Firebase Console, kwamba databaseURL ni sahihi, na kwamba una intaneti.");
  }

  /* 6. Storage (initialised only — rules decide what can be read/written) */
  try {
    addRow("ok", "Storage imeanzishwa", "Bucket: " + cfgModule.storage.app.options.storageBucket);
    addRow("info", "Ruhusa za upakiaji na usomaji hazijajaribiwa",
      "Zinadhibitiwa na Storage Rules. Hakikisha zimewekwa kabla ya kuhifadhi nyaraka halisi (NIDA, BRELA).");
  } catch (e) {
    addRow("fail", "Storage haikuanza", e.message);
  }

  /* 7. Analytics */
  try {
    var analytics = await withTimeout(cfgModule.analyticsReady, 8000, "Analytics");
    if (analytics) {
      addRow("ok", "Analytics imeanza", "Measurement ID: " + cfg.measurementId);
    } else {
      addRow("warn", "Analytics haijaanza",
        "Haitumiki kwenye mazingira haya (mfano file://, kivinjari kinazuia, au appId haijakamilika). Huduma nyingine haziathiriwi.");
    }
  } catch (e) {
    addRow("warn", "Analytics haikuitikia", e.message);
  }

  finish();
}

function finish() {
  if (counts.fail > 0) {
    summaryEl.textContent = "Kuna matatizo " + counts.fail + " yanayohitaji kurekebishwa kabla ya kuendelea.";
  } else if (counts.warn > 0) {
    summaryEl.textContent = "Hakuna tatizo kubwa, lakini kuna mambo " + counts.warn + " ya kuangalia.";
  } else {
    summaryEl.textContent = "Ukaguzi umepita. Firebase imeanza vizuri kwenye kivinjari hiki.";
  }
}

document.getElementById("rerun").addEventListener("click", function () { run(); });
run();
