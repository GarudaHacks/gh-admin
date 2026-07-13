import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminStorage, STORAGE_BUCKET } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

// The image is already compressed client-side; this is a generous safety cap.
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const STORAGE_PREFIX = "users/checkin/7.0";

/**
 * Uploads a hacker's check-in photo to Storage at
 * `users/checkin/7.0/{uid}.jpg` (Admin SDK — client writes are denied by rules)
 * and stamps users/{uid} with checkInPhotoUrl / checkInPhotoAt. The photo is
 * compressed on the client; this route just persists it.
 *
 * The object is left PRIVATE (no public ACL, no download token). The stored
 * `checkInPhotoUrl` is the canonical, un-signed
 * `https://storage.googleapis.com/<bucket>/<path>` form — viewing it later goes
 * through /api/file-url, which mints a short-lived signed URL.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { ok: false, reason: authResult.error.reason },
      { status: authResult.error.status }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Malformed request." },
      { status: 400 }
    );
  }

  const uid = formData.get("uid");
  const file = formData.get("file");
  if (typeof uid !== "string" || !uid.trim()) {
    return NextResponse.json(
      { ok: false, reason: "Missing hacker id." },
      { status: 400 }
    );
  }
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, reason: "A valid image file is required." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, reason: "Image is too large." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const objectPath = `${STORAGE_PREFIX}/${uid}.jpg`;
    const storageFile = adminStorage.bucket(STORAGE_BUCKET).file(objectPath);

    // Private object: no public:true, no download token. Access later via a
    // signed URL from /api/file-url.
    await storageFile.save(buffer, { contentType: "image/jpeg" });

    const url = `https://storage.googleapis.com/${STORAGE_BUCKET}/${objectPath}`;

    await adminDb.collection("users").doc(uid).set(
      {
        checkInPhotoUrl: url,
        checkInPhotoAt: FieldValue.serverTimestamp(),
        checkInPhotoBy: authResult.admin.email,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error(`Failed to upload check-in photo for ${uid}:`, error);
    return NextResponse.json(
      { ok: false, reason: "Failed to upload the photo." },
      { status: 500 }
    );
  }
}
