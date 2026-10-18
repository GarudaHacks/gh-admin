// Mark a Firebase Auth user's email as verified (or unverified), looked up by
// email. Sets the `emailVerified` flag on the auth record -- the same field
// shown by scripts/user-info.mjs.
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/set-email-verified.mjs someone@example.com
//   node --env-file=.env scripts/set-email-verified.mjs someone@example.com --unverify

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [, , email, flag] = process.argv;
if (!email) {
  console.error(
    "Usage: node --env-file=.env scripts/set-email-verified.mjs <email> [--unverify]"
  );
  process.exit(1);
}
const emailVerified = flag !== "--unverify";

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

const previous = user.emailVerified;
const updated = await auth.updateUser(user.uid, { emailVerified });

console.log(`
Email:           ${updated.email}
UID:             ${updated.uid}
Email verified:  ${previous} -> ${updated.emailVerified}
`);

process.exit(0);
