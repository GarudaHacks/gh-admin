import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { FirestoreUser, APPLICATION_STATUS } from "./types";
import { isHmacEnabled, verifyCheckIn } from "./hmac";
import { CheckInResponse } from "./checkin-types";

// Server-only: imports node crypto (via ./hmac) and is invoked from the
// /api/check-in route. Do not import this from a client component.

interface ParsedQr {
  userId: string;
  firstName: string;
  lastName: string;
  confirmedRsvpAt: string;
  /** The canonical message that the signature covers. */
  message: string;
  /** Present only on signed (current-format) codes. */
  signature?: string;
}

/**
 * Parses the QR string produced by the portal's BoardingPass:
 *   unsigned (legacy): userId/firstName/lastName/confirmedRsvpAt
 *   signed (current):  userId/firstName/lastName/confirmedRsvpAt/<sig>
 * The signature, when present, is the trailing base64url segment.
 */
export function parseQr(raw: string): ParsedQr | null {
  const parts = raw.trim().split("/");
  if (parts.length < 4) return null;

  // A 5th segment is the signature (the fields above never contain a slash:
  // userId is a Firestore id, the timestamp is ISO, names come from a form).
  let fieldParts = parts;
  let signature: string | undefined;
  if (parts.length >= 5) {
    signature = parts[parts.length - 1];
    fieldParts = parts.slice(0, -1);
  }

  const [userId, firstName, lastName, ...rest] = fieldParts;
  if (!userId || !firstName || !lastName) return null;

  return {
    userId,
    firstName,
    lastName,
    confirmedRsvpAt: rest.join("/"),
    message: fieldParts.join("/"),
    signature,
  };
}

/**
 * Validates a scanned QR and, if valid, marks the hacker as checked in.
 *
 * Two layers of trust:
 *  1. HMAC — when CHECKIN_HMAC_SECRET is set, the code must carry a valid
 *     signature, so a hand-crafted QR is rejected without ever touching the DB.
 *  2. Firestore (source of truth) — the user id must resolve to a real doc,
 *     the printed name must match, and the RSVP must be confirmed.
 */
export async function validateAndCheckIn(
  raw: string,
  checkedInBy: { uid: string; email: string }
): Promise<CheckInResponse> {
  const parsed = parseQr(raw);
  if (!parsed) {
    return { ok: false, reason: "Not a Garuda Hacks check-in code." };
  }

  if (isHmacEnabled()) {
    if (!parsed.signature || !verifyCheckIn(parsed.message, parsed.signature)) {
      return { ok: false, reason: "Code signature is invalid or missing." };
    }
  }

  const userRef = adminDb.collection("users").doc(parsed.userId);
  const snap = await userRef.get();
  if (!snap.exists) {
    return { ok: false, reason: "No hacker matches this code." };
  }

  const user = { id: snap.id, ...snap.data() } as FirestoreUser & {
    checkedInAt?: string;
  };

  const nameMatches =
    user.firstName?.trim().toLowerCase() === parsed.firstName.trim().toLowerCase() &&
    user.lastName?.trim().toLowerCase() === parsed.lastName.trim().toLowerCase();
  if (!nameMatches) {
    return { ok: false, reason: "Code does not match this hacker's record." };
  }

  const confirmed =
    user.status === APPLICATION_STATUS.CONFIRMED_RSVP || !!user.confirmedRsvpAt;
  if (!confirmed) {
    return { ok: false, reason: "Hacker has not confirmed their RSVP." };
  }

  const hacker = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: user.status,
  };

  // Idempotent: keep the first check-in time.
  if (user.checkedInAt) {
    return {
      ok: true,
      alreadyCheckedIn: true,
      checkedInAt: user.checkedInAt,
      hacker: hacker,
    };
  }

  const checkedInAt = new Date().toISOString();
  await userRef.update({
    checkedInAt,
    checkedInAtServer: FieldValue.serverTimestamp(),
    checkedInBy: checkedInBy.uid,
    checkedInByEmail: checkedInBy.email,
  });

  return { ok: true, alreadyCheckedIn: false, checkedInAt, hacker: hacker };
}
