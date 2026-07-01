import { auth } from "@/lib/firebase";

/**
 * Fetch a short-lived signed URL for a participant upload from /api/file-url.
 * Accepts either a raw object path or a stored file URL. Admin only (the API
 * route enforces auth). Throws with a human-readable message on failure.
 */
export async function getSignedFileUrl(pathOrUrl: string): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("You must be signed in to open this file.");

  const res = await fetch(`/api/file-url?url=${encodeURIComponent(pathOrUrl)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Could not open this file.");
  }
  return data.url;
}

/**
 * Open a participant upload in a new tab via a signed URL.
 *
 * A blank tab is opened synchronously inside the click gesture so popup
 * blockers allow it, then redirected once the signed URL resolves. Returns
 * false (and surfaces an alert) if the URL could not be obtained.
 */
export async function openStorageFile(pathOrUrl: string): Promise<boolean> {
  const win = window.open("", "_blank", "noopener,noreferrer");
  try {
    const url = await getSignedFileUrl(pathOrUrl);
    if (win) {
      win.location.href = url;
    } else {
      // Popup was blocked; fall back to navigating the signed URL directly.
      window.location.href = url;
    }
    return true;
  } catch (err) {
    win?.close();
    alert(err instanceof Error ? err.message : "Could not open this file.");
    return false;
  }
}
