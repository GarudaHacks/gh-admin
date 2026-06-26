import { getApps, initializeApp, cert, applicationDefault, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Admin SDK — server only.
 *
 * Unlike the client SDK (lib/firebase.ts), this authenticates with a service
 * account and bypasses Firestore security rules, which is what server routes
 * like /api/check-in need. Never import this from a client component.
 *
 * Credentials are resolved in this order:
 *   1. FIRESTORE_EMULATOR_HOST set  -> no credentials needed (local emulator)
 *   2. FIREBASE_SERVICE_ACCOUNT     -> the service-account JSON, inline
 *   3. GOOGLE_APPLICATION_CREDENTIALS / ADC (default)
 */
function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Local emulator: no real credentials required.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId });
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    return initializeApp({ credential: cert(JSON.parse(inline)), projectId });
  }

  return initializeApp({ credential: applicationDefault(), projectId });
}

const adminApp = getAdminApp();
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
