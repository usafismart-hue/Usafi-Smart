/* USAFI SMART - Realtime Database rules tests (run against the LOCAL EMULATOR only).

   From the repo root, in two terminals:
     1)  firebase emulators:start --only database --project usafi-smart
     2)  cd tools && npm install && npm run test:rules

   Needs Java 21+ and the Firebase CLI. Nothing here touches the live project.
   These tests are written but have NOT been run yet (the build environment could
   not download the emulator). Treat the rules as untested until they pass. */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");

const TS = { ".sv": "timestamp" }; // server timestamp for the compat database API
let env;

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: "usafi-smart",
    database: {
      host: "127.0.0.1",
      port: 9000,
      rules: fs.readFileSync(path.join(__dirname, "..", "database.rules.json"), "utf8")
    }
  });
});
test.after(async () => { await env.cleanup(); });
test.beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.database();
    await db.ref("services/house").set({ name: "Usafi wa nyumba", active: true });
    await db.ref("services/old").set({ name: "Zamani", active: false });
  });
});

const db = (uid, claims) => env.authenticatedContext(uid, claims).database();
const anon = () => env.unauthenticatedContext().database();

const customerWrites = (uid) => ({
  ["users/" + uid]: { accountType: "customer", fullName: "Asha", phone: "+255712345678", email: "a@x.com", createdAt: TS },
  ["customers/" + uid]: { fullName: "Asha", phone: "+255712345678", email: "a@x.com", createdAt: TS }
});

const booking = (uid, extra) => Object.assign({
  customerId: uid, serviceId: "house", status: "created",
  location: { address: "Mtaa 1", district: "Kinondoni" },
  scheduledDate: "2026-12-01", scheduledTime: "09:00", createdAt: TS
}, extra || {});

/* ---------- Registration ---------- */

test("customer can register (users + customers in one update)", async () => {
  await assertSucceeds(db("c1").ref().update(customerWrites("c1")));
});

test("cannot register as admin", async () => {
  const w = customerWrites("c1");
  w["users/c1"].accountType = "admin";
  await assertFails(db("c1").ref().update(w));
});

test("cannot write another person's profile", async () => {
  await assertFails(db("c2").ref().update(customerWrites("c1")));
});

test("signed-out visitors read nothing", async () => {
  await assertFails(anon().ref("users/c1").get());
  await assertFails(anon().ref("services").get());
});

test("cleaner registers as pending; cannot self-approve", async () => {
  const w = {
    "users/p1": { accountType: "cleaner", fullName: "Juma", phone: "+255712345678", email: "j@x.com", createdAt: TS },
    "cleaners/p1": { fullName: "Juma", phone: "+255712345678", nidaNumber: "19900101123450000123", residentialAddress: "Tandale", available: true, serviceAreas: ["Kinondoni"], createdAt: TS },
    "provider_verification/p1": { providerType: "cleaner", status: "pending", submittedAt: TS }
  };
  await assertSucceeds(db("p1").ref().update(w));
  await assertFails(db("p1").ref("provider_verification/p1/status").set("approved"));
});

test("company registers with director; verification starts pending", async () => {
  const w = {
    "users/k1": { accountType: "company", fullName: "Safi Ltd", phone: "+255712345678", email: "k@x.com", createdAt: TS },
    "companies/k1": {
      companyName: "Safi Ltd", brelaNumber: "B123", businessLicenseNumber: "L456", phone: "+255712345678",
      director: { fullName: "Mkurugenzi", phone: "+255712345679" }, createdAt: TS
    },
    "provider_verification/k1": { providerType: "company", status: "pending", submittedAt: TS }
  };
  await assertSucceeds(db("k1").ref().update(w));
});

test("admin claim can approve a provider", async () => {
  await assertSucceeds(db("adm", { admin: true }).ref("provider_verification/p1").set({ providerType: "cleaner", status: "approved" }));
});

/* ---------- Services ---------- */

test("signed-in users read services but cannot write them", async () => {
  await assertSucceeds(db("c1").ref("services/house").get());
  await assertFails(db("c1").ref("services/x").set({ name: "X", active: true }));
  await assertSucceeds(db("adm", { admin: true }).ref("services/x").set({ name: "X", active: true }));
});

/* ---------- Bookings ---------- */

test("customer creates a booking, then the index entry", async () => {
  await assertSucceeds(db("c1").ref("bookings/b1").set(booking("c1")));
  await assertSucceeds(db("c1").ref("user_bookings/c1").update({ b1: true }));
});

test("booking index entry is refused before the booking exists", async () => {
  await assertFails(db("c1").ref("user_bookings/c1").update({ nope: true }));
});

test("booking cannot carry price, provider or payment fields", async () => {
  await assertFails(db("c1").ref("bookings/b1").set(booking("c1", { quote: 1000 })));
  await assertFails(db("c1").ref("bookings/b1").set(booking("c1", { cleanerId: "p1" })));
  await assertFails(db("c1").ref("bookings/b1").set(booking("c1", { paymentStatus: "paid" })));
});

test("booking must use an active, existing service and own customerId", async () => {
  await assertFails(db("c1").ref("bookings/b1").set(booking("c1", { serviceId: "old" })));
  await assertFails(db("c1").ref("bookings/b1").set(booking("c1", { serviceId: "missing" })));
  await assertFails(db("c1").ref("bookings/b1").set(booking("c2")));
});

test("status must start as 'created'", async () => {
  await assertFails(db("c1").ref("bookings/b1").set(booking("c1", { status: "completed" })));
});

test("another customer cannot read my booking; I can", async () => {
  await db("c1").ref("bookings/b1").set(booking("c1"));
  await assertSucceeds(db("c1").ref("bookings/b1").get());
  await assertFails(db("c2").ref("bookings/b1").get());
  await assertFails(db("c1").ref("bookings").get()); // listing all bookings is admin only
});

test("customer can cancel early with status + cancelReason", async () => {
  await db("c1").ref("bookings/b1").set(booking("c1"));
  await assertSucceeds(db("c1").ref("bookings/b1").update({ status: "cancelled", cancelReason: "Imeghairiwa na mteja" }));
});

test("customer cannot move a booking to completed or edit the price", async () => {
  await db("c1").ref("bookings/b1").set(booking("c1"));
  await assertFails(db("c1").ref("bookings/b1/status").set("completed"));
  await assertFails(db("c1").ref("bookings/b1/quote").set(1));
});

test("KNOWN GAP: a non-admin cannot write updatedAt on an existing booking", async () => {
  // The draft rules give no .write for bookings/$bid/updatedAt, so the app writes only
  // status + cancelReason. If updatedAt becomes wanted, the rules need a deliberate change.
  await db("c1").ref("bookings/b1").set(booking("c1"));
  await assertFails(db("c1").ref("bookings/b1/updatedAt").set(TS));
});
