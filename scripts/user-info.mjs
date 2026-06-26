// Print the Firebase Auth record for a user, looked up by email.
// Shows uid, emailVerified, disabled, sign-in timestamps, providers and claims.
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/user-info.mjs someone@example.com
//   node --env-file=.env scripts/user-info.mjs someone@example.com --json

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
const json = args.includes("--json");
const email = args.find((a) => !a.startsWith("--"));
if (!email) {
  console.error("Usage: node --env-file=.env scripts/user-info.mjs <email> [--json]");
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

if (json) {
  console.log(JSON.stringify(user.toJSON(), null, 2));
  process.exit(0);
}

const m = user.metadata;
console.log(`
Email:            ${user.email}
UID:              ${user.uid}
Display name:     ${user.displayName ?? "(none)"}
Email verified:   ${user.emailVerified}
Disabled:         ${user.disabled}
Created:          ${m.creationTime ?? "(unknown)"}
Last sign-in:     ${m.lastSignInTime ?? "(never)"}
Last refresh:     ${m.lastRefreshTime ?? "(unknown)"}
Phone:            ${user.phoneNumber ?? "(none)"}
Providers:        ${user.providerData.map((p) => p.providerId).join(", ") || "(none)"}
Custom claims:    ${JSON.stringify(user.customClaims ?? {})}
`);

process.exit(0);
