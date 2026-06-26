import { NextRequest } from "next/server";
import { adminAuth } from "./firebaseAdmin";

const ADMIN_EMAIL_DOMAIN = "@garudahacks.com";

export interface AdminAuthError {
  status: number;
  reason: string;
}

/**
 * Verifies the Firebase ID token in the `Authorization: Bearer <token>` header
 * and enforces the same policy the app uses everywhere else: a verified
 * @garudahacks.com account. Returns null on success, or an error to respond
 * with. Server only.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<AdminAuthError | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { status: 401, reason: "Missing auth token." };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email ?? "";
    if (!decoded.email_verified || !email.endsWith(ADMIN_EMAIL_DOMAIN)) {
      return { status: 403, reason: "Not authorized for check-in." };
    }
    return null;
  } catch {
    return { status: 401, reason: "Invalid or expired session." };
  }
}
