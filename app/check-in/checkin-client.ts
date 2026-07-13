import { auth } from "@/lib/firebase";
import type {
  CheckInResponse,
  CheckInParticipant,
  CheckInTeam,
  CheckInHistoryEntry,
  TeamEditResponse,
} from "@/lib/checkin-types";

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

/** Fetches all confirmed-RSVP participants for the "add member" search. */
export async function fetchParticipants(): Promise<CheckInParticipant[]> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) return [];
  try {
    const res = await fetch("/api/check-in/participants", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.ok ? (data.participants as CheckInParticipant[]) : [];
  } catch {
    return [];
  }
}

/** Adds or removes a member on a team; returns the reloaded team or an error. */
export async function editTeamMember(input: {
  teamId: string;
  uid: string;
  action: "add" | "remove";
  leadUid: string;
}): Promise<TeamEditResponse> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    return { ok: false, reason: "You must be signed in." };
  }
  try {
    const res = await fetch("/api/check-in/team", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
    return (await res.json()) as TeamEditResponse;
  } catch {
    return { ok: false, reason: "Something went wrong. Try again." };
  }
}

/** Fetches the check-in history (all checked-in users, newest first). */
export async function fetchCheckInHistory(): Promise<
  { ok: true; history: CheckInHistoryEntry[] } | { ok: false; reason: string }
> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    return { ok: false, reason: "You must be signed in." };
  }
  try {
    const res = await fetch("/api/check-in/history", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await res.json()) as
      | { ok: true; history: CheckInHistoryEntry[] }
      | { ok: false; reason: string };
  } catch {
    return { ok: false, reason: "Failed to load history. Try again." };
  }
}

/** Uploads a (client-compressed) check-in photo. Returns the stored URL. */
export async function uploadCheckInPhoto(
  uid: string,
  blob: Blob
): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    return { ok: false, reason: "You must be signed in." };
  }
  try {
    const form = new FormData();
    form.append("uid", uid);
    form.append("file", blob, `${uid}.jpg`);
    const res = await fetch("/api/check-in/photo", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return (await res.json()) as
      | { ok: true; url: string }
      | { ok: false; reason: string };
  } catch {
    return { ok: false, reason: "Upload failed. Try again." };
  }
}

export type { CheckInTeam };
