// Grant (or revoke) the `usher` custom claim, which lets a non-@garudahacks.com
// account sign in to the admin app and use ONLY the check-in scanner.
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/set-usher.mjs someone@example.com
//   node --env-file=.env scripts/set-usher.mjs someone@example.com --remove
//
// The user must sign out / refresh their token for the change to take effect.

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [, , email, flag] = process.argv;
if (!email) {
  console.error("Usage: node --env-file=.env scripts/set-usher.mjs <email> [--remove]");
  process.exit(1);
}
const remove = flag === "--remove";

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const auth = getAuth(app);

const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, remove ? {} : { usher: true });

console.log(
  `${remove ? "Revoked" : "Granted"} usher claim for ${email} (${user.uid}). ` +
    "They must re-login for it to take effect."
);
process.exit(0);
