/**
 * Types shared between the check-in API routes (server) and the scanner page
 * (client).
 */

export interface CheckedInHacker {
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

export interface CheckInContext {
  inTeam: boolean;
  joiningSpeedDating: boolean;
}

/** One member of the scanned hacker's team, resolved from the formations doc. */
export interface CheckInTeamMember {
  uid: string;
  name: string; // full name, or the UID if the user doc couldn't be resolved
  email: string;
  checkedIn: boolean; // has this member already checked in?
  isLead: boolean; // is this the hacker who was just scanned?
}

/** The scanned hacker's team, from the `formations` collection. */
export interface CheckInTeam {
  id: string;
  teamName: string;
  members: CheckInTeamMember[];
}

/** A confirmed-RSVP participant, for the "add member" search. */
export interface CheckInParticipant {
  uid: string;
  name: string;
  email: string;
  checkedIn: boolean;
}

export type CheckInResponse =
  | {
    ok: true;
    userId: string; // the scanned hacker's UID
    alreadyCheckedIn: boolean;
    checkedInAt: string; // ISO string
    hacker: CheckedInHacker;
    context: CheckInContext;
    /** The hacker's team, if one exists in `formations`. */
    team: CheckInTeam | null;
  }
  | { ok: false; reason: string };

/** Response shape for the team-roster edit endpoint. */
export type TeamEditResponse =
  | { ok: true; team: CheckInTeam }
  | { ok: false; reason: string };
