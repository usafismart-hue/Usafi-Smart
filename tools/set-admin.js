/* USAFI SMART - give a person the `admin` custom claim (run on YOUR computer).

   Usage (PowerShell example):
     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\usafi-service-account.json"
     $env:ADMIN_PASSWORD="<a strong password, only needed if the account does not exist yet>"
     node set-admin.js admin@example.com

   - The service-account key stays OUTSIDE this repository (.gitignore also blocks it).
   - No password is stored in any file. ADMIN_PASSWORD is read from the environment once.
   - Writes users/<uid> = { accountType: "admin" } with the Admin SDK (rules do not apply to it).
   - The person must sign out and in again to receive the new claim. */

const admin = require("firebase-admin");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node set-admin.js <email>");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "usafi-smart",
  databaseURL: "https://usafi-smart-default-rtdb.firebaseio.com"
});

(async () => {
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.length < 12) {
      console.error("Account does not exist. Set ADMIN_PASSWORD (12+ characters) in the environment to create it.");
      process.exit(1);
    }
    user = await admin.auth().createUser({ email, password, emailVerified: true });
    console.log("Created Auth user", user.uid);
  }

  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  await admin.database().ref("users/" + user.uid).update({
    accountType: "admin",
    fullName: "Admin",
    email,
    createdAt: admin.database.ServerValue.TIMESTAMP
  });
  console.log("Admin claim set for", email, "(uid " + user.uid + "). Sign out and in again.");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
