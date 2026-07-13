import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminDb } from "@/lib/firebaseAdmin";
import { allQuestionsData } from "@/data/question";

export const runtime = "nodejs";

// Canonical overnightPlan answer strings, pulled from the form definition so
// they stay in sync with what the portal writes.
const overnightOptions =
  (allQuestionsData.find((q) => q.id === "overnightPlan") as
    | { options?: string[] }
    | undefined)?.options ?? [];
const OVERNIGHT_YES =
  overnightOptions.find((o) => /^yes/i.test(o)) ??
  "Yes, I will stay overnight at UMN";
const OVERNIGHT_NO =
  overnightOptions.find((o) => /^no/i.test(o)) ??
  "No, I have my own accommodation and will not stay overnight at UMN";

/**
 * Switches a hacker's overnight plan (applications/{uid}.overnightPlan) during
 * check-in. Admin-only. Body: { uid: string, overnight: boolean }.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { ok: false, reason: authResult.error.reason },
      { status: authResult.error.status }
    );
  }

  let uid: unknown;
  let overnight: unknown;
  try {
    ({ uid, overnight } = await req.json());
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Malformed request." },
      { status: 400 }
    );
  }

  if (typeof uid !== "string" || !uid.trim() || typeof overnight !== "boolean") {
    return NextResponse.json(
      { ok: false, reason: "Missing uid or overnight flag." },
      { status: 400 }
    );
  }

  try {
    await adminDb
      .collection("applications")
      .doc(uid)
      .set(
        {
          overnightPlan: overnight ? OVERNIGHT_YES : OVERNIGHT_NO,
          overnightUpdatedBy: authResult.admin.email,
          overnightUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    return NextResponse.json({ ok: true, overnight });
  } catch (err) {
    console.error("Failed to update overnight plan for", uid, err);
    return NextResponse.json(
      { ok: false, reason: "Failed to update overnight plan." },
      { status: 500 }
    );
  }
}
