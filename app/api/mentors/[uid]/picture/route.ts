import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminDb, adminStorage, STORAGE_BUCKET } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Uploads a mentor's profile picture to Storage at `mentors/{displayName}.png`,
 * the path `getMentorProfilePicture()` reads from elsewhere in the app. Goes
 * through the Admin SDK (service account) rather than the client SDK because
 * this project's Storage rules deny all client reads/writes.
 */
export async function POST(
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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Malformed request." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, reason: "A valid image file is required." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, reason: "Image must be smaller than 5MB." },
      { status: 400 }
    );
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const displayName = userSnap.data()?.displayName;
  if (!userSnap.exists || typeof displayName !== "string" || !displayName) {
    return NextResponse.json(
      { ok: false, reason: "Mentor not found." },
      { status: 404 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const storageFile = adminStorage
      .bucket(STORAGE_BUCKET)
      .file(`mentors/${displayName}.png`);

    // Mirrors the metadata a client-side uploadBytes() call would produce, so
    // any download-URL flow that expects a token keeps working.
    await storageFile.save(buffer, {
      contentType: "image/png",
      metadata: { metadata: { firebaseStorageDownloadTokens: randomUUID() } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`Failed to upload mentor picture for ${uid}:`, error);
    return NextResponse.json(
      { ok: false, reason: "Failed to upload the mentor picture." },
      { status: 500 }
    );
  }
}
