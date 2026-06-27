/**
 * Types shared between the check-in API route (server) and the scanner page
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
  isUnderage: boolean;
  joiningSpeedDating: boolean;
}

export type CheckInResponse =
  | {
      ok: true;
      alreadyCheckedIn: boolean;
      checkedInAt: string; // ISO string
      hacker: CheckedInHacker;
      context: CheckInContext;
    }
  | { ok: false; reason: string };
