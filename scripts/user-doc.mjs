// Print a Firestore document's fields, looked up by UID (document id).
// Defaults to the `users` collection; pass a different collection as 2nd arg.
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/user-doc.mjs <uid>
//   node --env-file=.env scripts/user-doc.mjs <uid> applications
//   node --env-file=.env scripts/user-doc.mjs <uid> --json

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const json = args.includes("--json");
const positional = args.filter((a) => !a.startsWith("--"));
const [uid, collection = "users"] = positional;
if (!uid) {
  console.error(
    "Usage: node --env-file=.env scripts/user-doc.mjs <uid> [collection] [--json]"
  );
  process.exit(1);
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

const snap = await db.collection(collection).doc(uid).get();
if (!snap.exists) {
  console.error(`No document at ${collection}/${uid}`);
  process.exit(1);
}

const data = snap.data();
if (json) {
  console.log(JSON.stringify(data, null, 2));
} else {
  console.log(`\n${collection}/${uid}\n`);
  for (const [key, value] of Object.entries(data)) {
    console.log(`${key.padEnd(24)} ${JSON.stringify(value)}`);
  }
  console.log();
}

process.exit(0);
