import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import type {
  CheckInTeam,
  CheckInTeamMember,
  CheckInParticipant,
  CheckInHistoryEntry,
  CheckInTable,
} from "./checkin-types";

// Server-only: reads/writes the `formations` collection via the Admin SDK.
// Do not import from a client component.

const CONFIRMED_STATUS = "confirmed rsvp";
// Teams cap out at this size (matches the formations admin UI).
export const MAX_TEAM_SIZE = 4;
// Event iteration these edits belong to (matches the import scripts).
const FORMATION_VERSION = "7.0";

interface ResolvedUser {
  name: string;
  email: string;
  checkedIn: boolean;
}

// Resolve a batch of member UIDs to name / email / checked-in via one getAll.
async function resolveUsers(
  uids: string[]
): Promise<Map<string, ResolvedUser>> {
  const map = new Map<string, ResolvedUser>();
  if (uids.length === 0) return map;

  const refs = uids.map((uid) => adminDb.collection("users").doc(uid));
  const snaps = await adminDb.getAll(...refs);
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const d = snap.data() ?? {};
    const name = `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim();
    map.set(snap.id, {
      name: name || snap.id,
      email: d.email ?? "",
      checkedIn: Boolean(d.checkedInAt),
    });
  }
  return map;
}

// Shape a formations doc (id + members[]) into a resolved CheckInTeam.
async function shapeTeam(
  teamId: string,
  teamName: string,
  members: string[],
  leadUid: string
): Promise<CheckInTeam> {
  const resolved = await resolveUsers(members);
  const shaped: CheckInTeamMember[] = members.map((uid) => {
    const r = resolved.get(uid);
    return {
      uid,
      name: r?.name ?? uid,
      email: r?.email ?? "",
      checkedIn: r?.checkedIn ?? false,
      isLead: uid === leadUid,
    };
  });
  return { id: teamId, teamName: teamName ?? "", members: shaped };
}

/**
 * Finds the team a hacker belongs to via `formations.members array-contains uid`,
 * resolving each member's name / email / checked-in status. Returns null if the
 * hacker isn't on any team. `leadUid` marks the scanned hacker in the roster.
 */
export async function getTeamForUser(uid: string): Promise<CheckInTeam | null> {
  const snap = await adminDb
    .collection("formations")
    .where("members", "array-contains", uid)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  const members: string[] = Array.isArray(data.members) ? data.members : [];
  return shapeTeam(doc.id, data.teamName ?? "", members, uid);
}

/**
 * Finds the venue table a formation is seated at via
 * `tables.formations array-contains formationId`. Used at check-in to verify
 * the lanyard's table sticker. Returns null if the team hasn't been placed yet.
 */
export async function getTableForFormation(
  formationId: string
): Promise<CheckInTable | null> {
  const snap = await adminDb
    .collection("tables")
    .where("formations", "array-contains", formationId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  const d = doc.data();
  return {
    tableId: doc.id,
    tableNumber: Number(d.tableNumber) || 0,
    location: (d.location ?? "").toString(),
  };
}

/** Whether a single uid appears in any mobile-app team (`teams` collection). */
async function isUidInMobileTeam(uid: string): Promise<boolean> {
  const snap = await adminDb
    .collection("teams")
    .where("members", "array-contains", uid)
    .limit(1)
    .get();
  return !snap.empty;
}

/**
 * Whether a formation still needs its mobile-app team created/completed: true if
 * ANY of the given member uids hasn't joined a mobile `teams` doc yet (so it
 * also fires when a leader made the team but teammates haven't joined). Used at
 * check-in to remind multi-person teams. Best-effort, at most a few reads.
 */
export async function formationMissingFromMobile(
  memberUids: string[]
): Promise<boolean> {
  const results = await Promise.all(memberUids.map((uid) => isUidInMobileTeam(uid)));
  return results.some((inTeam) => !inTeam);
}

/** Reloads a team by its doc id (used after an edit). */
export async function getTeamById(
  teamId: string,
  leadUid: string
): Promise<CheckInTeam | null> {
  const doc = await adminDb.collection("formations").doc(teamId).get();
  if (!doc.exists) return null;
  const data = doc.data() ?? {};
  const members: string[] = Array.isArray(data.members) ? data.members : [];
  return shapeTeam(doc.id, data.teamName ?? "", members, leadUid);
}

export type TeamEditError =
  | "not_found"
  | "team_full"
  | "already_member"
  | "not_member";

/**
 * Adds or removes a member UID on a team. Adding enforces the size cap and,
 * to keep the one-team-per-hacker invariant, first removes the UID from any
 * other team it appears on. Returns the reloaded team, or an error code.
 *
 * `leadUid` is the hacker being checked in (so the reloaded roster keeps
 * marking them as the lead).
 */
export async function editTeamMember(
  teamId: string,
  uid: string,
  action: "add" | "remove",
  editor: string,
  leadUid: string
): Promise<CheckInTeam | TeamEditError> {
  const teamRef = adminDb.collection("formations").doc(teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) return "not_found";

  const members: string[] = Array.isArray(teamSnap.data()?.members)
    ? teamSnap.data()!.members
    : [];

  if (action === "add") {
    if (members.includes(uid)) return "already_member";
    if (members.length >= MAX_TEAM_SIZE) return "team_full";

    const batch = adminDb.batch();

    // Remove the UID from any other team so they only belong to one.
    const others = await adminDb
      .collection("formations")
      .where("members", "array-contains", uid)
      .get();
    for (const other of others.docs) {
      if (other.id === teamId) continue;
      batch.update(other.ref, {
        members: FieldValue.arrayRemove(uid),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: editor,
      });
    }

    batch.update(teamRef, {
      members: FieldValue.arrayUnion(uid),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: editor,
      version: FORMATION_VERSION,
    });
    await batch.commit();
  } else {
    if (!members.includes(uid)) return "not_member";
    await teamRef.update({
      members: FieldValue.arrayRemove(uid),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: editor,
    });
  }

  const team = await getTeamById(teamId, leadUid);
  return team ?? "not_found";
}

/**
 * Lists confirmed-RSVP participants for the "add member" search. Returns the
 * whole roster (the client caches it and filters locally).
 */
export async function listConfirmedParticipants(): Promise<
  CheckInParticipant[]
> {
  const snap = await adminDb
    .collection("users")
    .where("status", "==", CONFIRMED_STATUS)
    .get();

  const participants: CheckInParticipant[] = snap.docs.map((doc) => {
    const d = doc.data();
    const name = `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim();
    return {
      uid: doc.id,
      name: name || doc.id,
      email: d.email ?? "",
      checkedIn: Boolean(d.checkedInAt),
    };
  });

  participants.sort((a, b) => a.name.localeCompare(b.name));
  return participants;
}

/**
 * Lists every user who has checked in, newest first. `checkedInAt` is stored as
 * an ISO string, which sorts chronologically, and Firestore excludes docs
 * missing the field — so this naturally returns only checked-in users. Each
 * entry carries the user's current team name and their (private) photo URL,
 * which the client signs for display.
 */
export async function listCheckInHistory(): Promise<CheckInHistoryEntry[]> {
  const usersSnap = await adminDb
    .collection("users")
    .orderBy("checkedInAt", "desc")
    .get();

  // Map each UID to the name of the team it belongs to (first team wins).
  const formationsSnap = await adminDb.collection("formations").get();
  const teamOf = new Map<string, string>();
  for (const doc of formationsSnap.docs) {
    const data = doc.data();
    const members: string[] = Array.isArray(data.members) ? data.members : [];
    for (const uid of members) {
      if (!teamOf.has(uid)) teamOf.set(uid, data.teamName ?? "");
    }
  }

  return usersSnap.docs.map((doc) => {
    const d = doc.data();
    const name = `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim();
    return {
      uid: doc.id,
      name: name || doc.id,
      email: d.email ?? "",
      checkedInAt: typeof d.checkedInAt === "string" ? d.checkedInAt : "",
      teamName: teamOf.get(doc.id) ?? null,
      photoUrl: typeof d.checkInPhotoUrl === "string" ? d.checkInPhotoUrl : null,
    };
  });
}
