import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { dispensationLetter } from "@/templates/dispensationLetter";

// The exact application answer that flags a leave-letter request. Must match the
// value used by scripts/generate-leave-letters.mjs so the candidate sets agree.
const LEAVE_LETTER_VALUE =
  "Yes, I would like to request a leave letter to attend Garuda Hacks 7.0";

// Only users who have confirmed their RSVP are eligible.
const CONFIRMED_RSVP_STATUS = "confirmed rsvp";

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: Number(process.env.SES_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USERNAME,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});

const fromAddress =
  process.env.SES_FROM_EMAIL || "Garuda Hacks <no-reply@send.garudahacks.com>";

interface Candidate {
  uid: string;
  name: string;
  email: string;
  occupationPlace: string;
  leaveLetterUrl: string | null;
  // Epoch millis of when the letter email was last sent, or null if never.
  leaveLetterSentAt: number | null;
}

// Firestore Timestamp -> epoch millis (or null for missing/odd values).
function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * GET — list every confirmed-RSVP user who requested a dispensation letter,
 * together with their generated letter URL and last-sent timestamp.
 */
export async function GET() {
  try {
    const appsSnap = await adminDb
      .collection("applications")
      .where("leaveLetter", "==", LEAVE_LETTER_VALUE)
      .get();

    const candidates: Candidate[] = [];

    await Promise.all(
      appsSnap.docs.map(async (appDoc) => {
        const uid = appDoc.id; // application id === user uid
        const userSnap = await adminDb.collection("users").doc(uid).get();
        if (!userSnap.exists) return;

        const user = userSnap.data() as Record<string, unknown>;
        if (user.status !== CONFIRMED_RSVP_STATUS) return;

        const firstName = String(user.firstName ?? "").trim();
        const lastName = String(user.lastName ?? "").trim();

        candidates.push({
          uid,
          name: `${firstName} ${lastName}`.trim(),
          email: String(user.email ?? ""),
          occupationPlace: String(user.occupationPlace ?? ""),
          leaveLetterUrl: (user.leaveLetterUrl as string) || null,
          leaveLetterSentAt: toMillis(user.leaveLetterSentAt),
        });
      })
    );

    candidates.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Failed to list dispensation-letter candidates:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to list candidates", details },
      { status: 500 }
    );
  }
}

// Send one user's dispensation-letter email and stamp leaveLetterSentAt.
// Retries a few times so transient SMTP hiccups don't fail a bulk send.
async function sendToUser(uid: string): Promise<void> {
  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) throw new Error("user not found");

  const user = userSnap.data() as Record<string, unknown>;
  const email = String(user.email ?? "").trim();
  const leaveLetterUrl = (user.leaveLetterUrl as string) || "";

  if (!email) throw new Error("user has no email");
  if (!leaveLetterUrl) throw new Error("letter has not been generated yet");

  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: "Garuda Hacks 7.0 - Your Dispensation Letter",
        html: dispensationLetter({ actionUrl: leaveLetterUrl }),
        text: `Dispensation Letter\n\nPlease download the dispensation letter you requested:\n${leaveLetterUrl}\n\nRegards,\nGaruda Hacks 7.0 Committee\n\n© 2026 Garuda Hacks. All rights reserved.`,
      });
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  if (lastErr) throw lastErr;

  await adminDb
    .collection("users")
    .doc(uid)
    .set({ leaveLetterSentAt: FieldValue.serverTimestamp() }, { merge: true });
}

// Run tasks with bounded concurrency to stay under SMTP rate limits.
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<PromiseSettledResult<void>[]> {
  const results: PromiseSettledResult<void>[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        await worker(items[index]);
        results[index] = { status: "fulfilled", value: undefined };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * POST — send the dispensation-letter email to one user (`{ uid }`) or many
 * (`{ uids: [...] }`). Stamps leaveLetterSentAt on each success.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const uids: string[] = body.uids || (body.uid ? [body.uid] : []);

    if (uids.length === 0) {
      return NextResponse.json(
        { error: "Missing required parameter: uid or uids" },
        { status: 400 }
      );
    }

    const results = await runWithConcurrency(uids, 5, sendToUser);

    const failures = uids
      .map((uid, i) => ({ uid, result: results[i] }))
      .filter((r) => r.result.status === "rejected")
      .map((r) => ({
        uid: r.uid,
        error: (r.result as PromiseRejectedResult).reason?.message ?? "Unknown error",
      }));

    const succeeded = uids.length - failures.length;

    if (uids.length === 1 && failures.length > 0) {
      return NextResponse.json(
        { error: "Failed to send email", details: failures[0].error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Sent ${succeeded} of ${uids.length} email(s)`,
      succeeded,
      failed: failures.length,
      failures,
    });
  } catch (error) {
    console.error("Failed to send dispensation letters:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to send email", details },
      { status: 500 }
    );
  }
}
