import { NextRequest, NextResponse } from "next/server";
import { adminStorage, STORAGE_BUCKET } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";

// firebase-admin needs the Node runtime, and this route signs URLs on the fly
// so it must never be statically prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Signed URLs are intentionally short-lived: long enough to open the file,
// short enough that a leaked link is useless quickly.
const SIGNED_URL_TTL_MS = 10 * 60 * 1000;

// Only files uploaded by participants may be signed through this route. This
// prevents the endpoint from being used to sign arbitrary objects in the bucket.
const ALLOWED_PREFIX = "users/uploads/";

/**
 * Extract the storage object path from either a raw path or a stored URL.
 * Handles:
 *   - "users/uploads/7.0/uid_resume.pdf"                (raw path)
 *   - "https://storage.googleapis.com/<bucket>/<path>"  (public-style URL)
 *   - "https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded>?..."
 * Returns null if it can't confidently resolve a path.
 */
function resolveObjectPath(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  if (!value.startsWith("http")) {
    // Raw object path; normalise a stray leading slash.
    return value.replace(/^\/+/, "");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  // firebasestorage.googleapis.com/v0/b/<bucket>/o/<url-encoded-path>
  const fbMatch = url.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)$/);
  if (fbMatch) {
    return decodeURIComponent(fbMatch[1]);
  }

  // storage.googleapis.com/<bucket>/<path>  ->  strip the leading /<bucket>/
  const segments = url.pathname.replace(/^\/+/, "").split("/");
  if (segments.length >= 2) {
    return segments.slice(1).join("/");
  }

  return null;
}

/**
 * GET /api/file-url?path=<objectPath>  (or ?url=<storedUrl>)
 *
 * Returns a short-lived signed URL for a participant upload. Admin only.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error.reason },
      { status: authResult.error.status }
    );
  }

  const raw =
    req.nextUrl.searchParams.get("path") ??
    req.nextUrl.searchParams.get("url") ??
    "";

  const objectPath = resolveObjectPath(raw);
  if (!objectPath) {
    return NextResponse.json(
      { error: "Missing or unrecognised file path." },
      { status: 400 }
    );
  }

  if (!objectPath.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      { error: "Refusing to sign a file outside participant uploads." },
      { status: 403 }
    );
  }

  if (!STORAGE_BUCKET) {
    return NextResponse.json(
      { error: "Storage bucket is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const file = adminStorage.bucket(STORAGE_BUCKET).file(objectPath);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + SIGNED_URL_TTL_MS,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to sign file URL:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate file link", details },
      { status: 500 }
    );
  }
}
