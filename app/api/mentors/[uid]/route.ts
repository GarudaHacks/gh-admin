import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

/**
 * Deletes a mentor: removes both the Firebase Auth account and the
 * `users/{uid}` document. Admin only. Deleting a non-existent auth user or
 * doc is treated as success so the call is idempotent — re-running it after a
 * partial failure still converges to "gone".
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const authResult = await requireAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { ok: false, reason: authResult.error.reason },
      { status: authResult.error.status }
    );
  }

  const { uid } = await params;
  if (!uid) {
    return NextResponse.json(
      { ok: false, reason: "Missing mentor id." },
      { status: 400 }
    );
  }

  try {
    await adminAuth.deleteUser(uid);
  } catch (error: unknown) {
    // Already gone from Auth is fine; surface anything else.
    if ((error as { code?: string })?.code !== "auth/user-not-found") {
      console.error(`Failed to delete mentor auth user ${uid}:`, error);
      return NextResponse.json(
        { ok: false, reason: "Failed to delete the mentor account." },
        { status: 500 }
      );
    }
  }

  try {
    await adminDb.collection("users").doc(uid).delete();
  } catch (error) {
    console.error(`Failed to delete mentor document ${uid}:`, error);
    return NextResponse.json(
      { ok: false, reason: "Failed to delete the mentor profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, uid });
}
