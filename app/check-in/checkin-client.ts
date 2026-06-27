import { auth } from "@/lib/firebase";
import type { CheckInResponse } from "@/lib/checkin-types";

/**
 * Posts a scanned QR code to the check-in API and returns the parsed response.
 * Shared by the lead-hacker scan and the group (teammate) scan so both behave
 * identically. Never throws — network/parse failures come back as `ok: false`.
 */
export async function postCheckIn(code: string): Promise<CheckInResponse> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    return { ok: false, reason: "You must be signed in to check people in." };
  }
  try {
    const res = await fetch("/api/check-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    return (await res.json()) as CheckInResponse;
  } catch {
    return { ok: false, reason: "Something went wrong. Try again." };
  }
}
