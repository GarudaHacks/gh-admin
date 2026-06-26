/**
 * Types shared between the check-in API route (server) and the scanner page
 * (client). This file must stay free of any server-only imports (e.g. node
 * crypto / firebase) so the client can `import type` from it safely.
 */

export interface CheckedInHacker {
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

export type CheckInResponse =
  | {
      ok: true;
      alreadyCheckedIn: boolean;
      checkedInAt: string; // ISO string
      hacker: CheckedInHacker;
    }
  | { ok: false; reason: string };
