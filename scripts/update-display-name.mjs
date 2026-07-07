// Update the display name of a Firebase Auth user, looked up by email.
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/update-display-name.mjs someone@example.com "New Name"

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
const email = args[0];
const displayName = args[1];
if (!email || !displayName) {
  console.error('Usage: node --env-file=.env scripts/update-display-name.mjs <email> "<new display name>"');
  process.exit(1);
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const auth = getAuth(app);

let user;
try {
  user = await auth.getUserByEmail(email);
} catch (err) {
  if (err.code === "auth/user-not-found") {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }
  throw err;
}

const previousName = user.displayName ?? "(none)";
const updated = await auth.updateUser(user.uid, { displayName });

console.log(`
Email:         ${updated.email}
UID:           ${updated.uid}
Display name:  ${previousName} -> ${updated.displayName}
`);

process.exit(0);
