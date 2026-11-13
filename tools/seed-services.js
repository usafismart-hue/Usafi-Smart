/* USAFI SMART - load SAMPLE services and base prices (run on YOUR computer).

   Customers can only book a service that exists and has active: true, so the
   booking page stays empty until services are seeded.

   !! The names and TZS prices below are PLACEHOLDERS for testing. Replace them
   !! with your real services and prices (later, from the admin pages).

   Usage:
     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\usafi-service-account.json"
     node seed-services.js
   Against the local emulator instead (no credentials needed):
     $env:FIREBASE_DATABASE_EMULATOR_HOST="127.0.0.1:9000"; node seed-services.js --emulator
*/

const admin = require("firebase-admin");
const emulator = process.argv.includes("--emulator");

admin.initializeApp(
  emulator
    ? { projectId: "usafi-smart", databaseURL: "http://127.0.0.1:9000?ns=usafi-smart-default-rtdb" }
    : { credential: admin.credential.applicationDefault(), projectId: "usafi-smart", databaseURL: "https://usafi-smart-default-rtdb.firebaseio.com" }
);

const SERVICES = {
  house_cleaning:  { name: "Usafi wa nyumba",          description: "Kusafisha nyumba nzima",      basePrice: 40000 },
  office_cleaning: { name: "Usafi wa ofisi",           description: "Kusafisha ofisi na biashara", basePrice: 60000 },
  deep_cleaning:   { name: "Usafi wa kina",            description: "Usafi wa kina wa nyumba",     basePrice: 90000 },
  sofa_carpet:     { name: "Kusafisha sofa na zulia",  description: "Sofa, zulia na magodoro",     basePrice: 35000 },
  windows:         { name: "Kusafisha madirisha",      description: "Madirisha ya ndani na nje",   basePrice: 25000 }
};

(async () => {
  const updates = {};
  for (const [id, s] of Object.entries(SERVICES)) {
    updates["services/" + id] = { name: s.name, description: s.description, active: true };
    updates["pricing/" + id] = { basePrice: s.basePrice };
  }
  await admin.database().ref().update(updates);
  console.log("Seeded", Object.keys(SERVICES).length, "sample services.");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
