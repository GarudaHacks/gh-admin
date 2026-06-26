import { NextRequest } from "next/server";
import { adminAuth } from "./firebaseAdmin";

const ADMIN_EMAIL_DOMAIN = "@garudahacks.com";

export interface AdminAuthError {
  status: number;
  reason: string;
}

export interface AdminIdentity {
  uid: string;
  email: string;
}

/**
 * Verifies the Firebase ID token in the `Authorization: Bearer <token>` header
 * and enforces the same policy the app uses everywhere else: a verified
 * @garudahacks.com account. Returns the admin's identity on success, or an
 * error to respond with. Server only.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<{ admin: AdminIdentity } | { error: AdminAuthError }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { error: { status: 401, reason: "Missing auth token." } };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email ?? "";
    const isAdmin =
      decoded.email_verified === true && email.endsWith(ADMIN_EMAIL_DOMAIN);
    // Ushers are non-admin staff granted check-in access via a custom claim,
    // set server-side by an admin, so it's trusted regardless of email domain.
    const isUsher = decoded.usher === true;
    if (!isAdmin && !isUsher) {
      return { error: { status: 403, reason: "Not authorized for check-in." } };
    }
    return { admin: { uid: decoded.uid, email } };
  } catch {
    return { error: { status: 401, reason: "Invalid or expired session." } };
  }
}
