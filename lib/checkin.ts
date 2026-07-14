import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { FirestoreUser, APPLICATION_STATUS } from "./types";
import { isHmacEnabled, verifyCheckIn } from "./hmac";
import { CheckInResponse } from "./checkin-types";
import {
  getTeamForUser,
  getTableForFormation,
  isUserInMobileTeam,
} from "./checkinTeam";

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
/**
 * Normalizes a Firestore Timestamp / {seconds} / Date / ISO value to an ISO
 * string (or null). Used to serialize acceptedAt / confirmedRsvpAt for the card.
 */
function toIso(value: unknown): string | null {
  if (!value) return null;
  const v = value as { toDate?: () => Date; seconds?: number };
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  if (typeof v.seconds === "number") return new Date(v.seconds * 1000).toISOString();
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

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
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    status: user.status ?? "",
    phone: user.phone ?? "",
    genderIdentity: user.genderIdentity ?? "",
    dateOfBirth: user.dateOfBirth ?? "",
    nationality: user.nationality ?? "",
    occupationPlace: user.occupationPlace ?? "",
    occupationDetail: user.occupationDetail ?? "",
    acceptedAt: toIso(user.acceptedAt),
    confirmedRsvpAt: toIso(user.confirmedRsvpAt),
  };

  // Idempotent: keep the first check-in time, but still stamp checkedInAt below
  // BEFORE resolving the team so the scanned hacker shows as checked in.
  const alreadyCheckedIn = !!user.checkedInAt;
  const checkedInAt = user.checkedInAt ?? new Date().toISOString();

  if (!alreadyCheckedIn) {
    await userRef.update({
      checkedInAt,
      checkedInAtServer: FieldValue.serverTimestamp(),
      checkedInBy: checkedInBy.uid,
      checkedInByEmail: checkedInBy.email,
    });
  }

  // The hacker's team comes from the `formations` collection (members = UIDs).
  // Team lookup must not fail the check-in, so tolerate errors.
  let team = null;
  try {
    team = await getTeamForUser(parsed.userId);
  } catch (err) {
    console.error("Failed to resolve team for", parsed.userId, err);
  }

  // The team's assigned venue table (from `tables`), for the lanyard-sticker
  // verification step. Best-effort — never fail the check-in over it.
  let table = null;
  if (team) {
    try {
      table = await getTableForFormation(team.id);
    } catch (err) {
      console.error("Failed to resolve table for", parsed.userId, err);
    }
  }

  // From the hacker's application: whether they opted into Speed Dating
  // (teamFormation) and whether they plan to stay overnight (overnightPlan).
  // Best-effort — never fail the check-in over it.
  let joiningSpeedDating = false;
  let overnight = false;
  try {
    const appSnap = await adminDb
      .collection("applications")
      .doc(parsed.userId)
      .get();
    const appData = appSnap.exists ? appSnap.data() : undefined;
    const teamFormation = appData?.teamFormation as string | undefined;
    const overnightPlan = appData?.overnightPlan as string | undefined;
    joiningSpeedDating = !!teamFormation && /speed dating/i.test(teamFormation);
    overnight = !!overnightPlan && /^yes/i.test(overnightPlan);
  } catch (err) {
    console.error("Failed to read application for", parsed.userId, err);
  }

  // A multi-member formation whose hacker hasn't joined a mobile-app team yet
  // needs to create/join one (it drives attendance confirmation). Best-effort.
  let needsMobileTeam = false;
  if (team && team.members.length > 1) {
    try {
      needsMobileTeam = !(await isUserInMobileTeam(parsed.userId));
    } catch (err) {
      console.error("Failed to check mobile team for", parsed.userId, err);
    }
  }

  const context = {
    inTeam: !!team,
    joiningSpeedDating,
    hasTable: !!table,
    needsMobileTeam,
  };

  return {
    ok: true,
    userId: parsed.userId,
    alreadyCheckedIn,
    checkedInAt,
    hacker,
    context,
    team,
    table,
    overnight,
  };
}
