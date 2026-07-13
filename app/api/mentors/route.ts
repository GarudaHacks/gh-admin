import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

interface AddMentorBody {
  email?: unknown;
  displayName?: unknown;
  mentorTitle?: unknown;
  specialization?: unknown;
  discordUsername?: unknown;
  intro?: unknown;
  // When true, promote an already-registered account to a mentor instead of
  // creating a brand-new one (used after a duplicate-email 409).
  upgradeExisting?: unknown;
}

// Excludes ambiguous glyphs (0/O, 1/l/I) so the password is easy to read aloud.
const PASSWORD_ALPHABET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";

function generatePassword(length = 16): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Creates a mentor: a Firebase Auth account (with a freshly generated random
 * password) plus a matching `users/{uid}` document flagged `mentor: true`.
 * Admin only. The generated password is returned exactly once, in the response,
 * for the admin to hand off to the mentor — it is never stored in plaintext.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { ok: false, reason: authResult.error.reason },
      { status: authResult.error.status }
    );
  }

  let body: AddMentorBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Malformed request." },
      { status: 400 }
    );
  }

  const email = asTrimmedString(body.email).toLowerCase();
  const displayName = asTrimmedString(body.displayName);
  const mentorTitle = asTrimmedString(body.mentorTitle);
  const specialization = asTrimmedString(body.specialization);
  const discordUsername = asTrimmedString(body.discordUsername);
  const intro = asTrimmedString(body.intro);
  const upgradeExisting = body.upgradeExisting === true;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, reason: "A valid email is required." },
      { status: 400 }
    );
  }
  if (!displayName) {
    return NextResponse.json(
      { ok: false, reason: "Display name is required." },
      { status: 400 }
    );
  }
  if (!specialization) {
    return NextResponse.json(
      { ok: false, reason: "Specialization is required." },
      { status: 400 }
    );
  }

  // Upgrade path: the email already belongs to a registered user (hacker, etc.)
  // and the admin chose to promote them rather than fail. We keep their existing
  // login/password and just grant mentor access + save the mentor profile.
  if (upgradeExisting) {
    let existing;
    try {
      existing = await adminAuth.getUserByEmail(email);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/user-not-found") {
        return NextResponse.json(
          { ok: false, reason: "No existing account with this email to upgrade." },
          { status: 404 }
        );
      }
      console.error("Failed to look up user for upgrade:", error);
      return NextResponse.json(
        { ok: false, reason: "Failed to look up the existing account." },
        { status: 500 }
      );
    }

    const uid = existing.uid;
    const existingClaims = existing.customClaims ?? {};
    try {
      // Preserve unrelated claims (e.g. admin/usher). The backend gates mentor
      // features on `mentor === true`, so that's the authoritative flag; we also
      // set role: "mentor" to match the app's role convention, replacing the
      // user's previous role ("User" / "hacker").
      await adminAuth.setCustomUserClaims(uid, {
        ...existingClaims,
        mentor: true,
        role: "mentor",
      });
      if (displayName && displayName !== existing.displayName) {
        await adminAuth.updateUser(uid, { displayName });
      }
      // Merge so we don't clobber existing fields (createdAt, status, etc.).
      await adminDb
        .collection("users")
        .doc(uid)
        .set(
          {
            mentor: true,
            email,
            displayName,
            mentorTitle,
            specialization,
            discordUsername,
            intro,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (error) {
      // Best-effort restore of the prior claims so a failed write doesn't leave
      // the account in a half-upgraded state.
      await adminAuth
        .setCustomUserClaims(uid, existingClaims)
        .catch(() => undefined);
      console.error("Failed to upgrade user to mentor:", error);
      return NextResponse.json(
        { ok: false, reason: "Failed to upgrade the user to a mentor." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, uid, email, displayName, upgraded: true });
  }

  const password = generatePassword();

  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    uid = userRecord.uid;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      // `code` lets the client offer an "upgrade existing user" action.
      return NextResponse.json(
        {
          ok: false,
          code: "email-exists",
          reason: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }
    if (code === "auth/invalid-email") {
      return NextResponse.json(
        { ok: false, reason: "That email address is invalid." },
        { status: 400 }
      );
    }
    console.error("Failed to create mentor auth user:", error);
    return NextResponse.json(
      { ok: false, reason: "Failed to create the mentor account." },
      { status: 500 }
    );
  }

  try {
    // Mirror the `usher` pattern: a trusted custom claim so server routes can
    // authorize mentors regardless of email domain. The backend gates mentor
    // features on `mentor === true`; role: "mentor" matches the role convention.
    await adminAuth.setCustomUserClaims(uid, { mentor: true, role: "mentor" });
    await adminDb
      .collection("users")
      .doc(uid)
      .set({
        mentor: true,
        email,
        displayName,
        mentorTitle,
        specialization,
        discordUsername,
        intro,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    // Roll back the auth account so a failed write doesn't leave an orphan login.
    await adminAuth.deleteUser(uid).catch(() => undefined);
    console.error("Failed to write mentor document:", error);
    return NextResponse.json(
      { ok: false, reason: "Failed to save the mentor profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, uid, email, displayName, password });
}
