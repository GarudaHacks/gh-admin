// Export a CSV of each accepted / confirmed-rsvp applicant's team-formation
// intent.
//
// For each qualifying user (status "accepted" or "confirmed rsvp") we read
// applications/{uid} (the application doc id IS the user's uid) and emit the
// applicant's UID, first name, last name, normalized team formation, team name
// and the raw teamMembers string.
//
// The stored `teamFormation` is one of three long free-text sentences from the
// application form. We normalize it to a short code:
//   "Yes, I already have a team"                -> TEAM
//   "No, I will be joining Garuda Hacks solo"   -> SOLO
//   "...look for a team through Speed Dating"    -> SPEED_DATING
// Anything else is emitted as UNKNOWN (and warned about) so it doesn't get
// silently mislabeled.
//
// Flow:
//   1. Find every `users` doc whose status is "accepted" or "confirmed rsvp".
//   2. For each, read applications/{uid} (uid === doc id).
//   3. Write export/team-formation.csv with headers
//      "UID,First Name,Last Name,Team Formation,Team Name,Team Members".
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/export-team-formation.mjs
//   node --env-file=.env scripts/export-team-formation.mjs --dry-run

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_STATUSES = ["accepted", "confirmed rsvp"];
const EXPORT_DIR = path.resolve(process.cwd(), "export");
const OUT_FILE = path.join(EXPORT_DIR, "team-formation.csv");

const dryRun = process.argv.includes("--dry-run");

// Map the free-text application answer to a short code. Substring matching (not
// exact equality) so trivial wording/whitespace drift still classifies.
function classifyFormation(raw) {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("speed dating")) return "SPEED_DATING";
  if (s.includes("solo")) return "SOLO";
  if (s.includes("already have a team") || s.includes("have a team")) return "TEAM";
  return "UNKNOWN";
}

function csvField(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

const usersSnap = await db
  .collection("users")
  .where("status", "in", ALLOWED_STATUSES)
  .get();
console.log(`Found ${usersSnap.size} accepted/confirmed rsvp user(s).`);

const rows = [];
let missingApp = 0;
let unknownFormation = 0;

for (const userDoc of usersSnap.docs) {
  const uid = userDoc.id;
  const user = userDoc.data();

  const appSnap = await db.collection("applications").doc(uid).get();
  const application = appSnap.exists ? appSnap.data() : {};
  if (!appSnap.exists) {
    console.warn(`  [warn] ${uid}: no applications/${uid} document`);
    missingApp++;
  }

  const teamFormation = classifyFormation(application.teamFormation);
  if (teamFormation === "UNKNOWN") {
    unknownFormation++;
    console.warn(
      `  [warn] ${uid}: unrecognized teamFormation "${application.teamFormation ?? "(none)"}"`
    );
  }

  rows.push({
    uid,
    firstName: (user.firstName ?? "").trim(),
    lastName: (user.lastName ?? "").trim(),
    teamFormation,
    teamName: (application.teamName ?? "").trim(),
    teamMembers: (application.teamMembers ?? "").trim(),
  });
}

rows.sort((a, b) => a.firstName.localeCompare(b.firstName) || a.uid.localeCompare(b.uid));

const lines = [
  "UID,First Name,Last Name,Team Formation,Team Name,Team Members",
  ...rows.map((r) =>
    [r.uid, r.firstName, r.lastName, r.teamFormation, r.teamName, r.teamMembers]
      .map(csvField)
      .join(",")
  ),
];
const csv = lines.join("\n") + "\n";

if (dryRun) {
  console.log(`\n[dry-run] would write ${rows.length} row(s) to ${OUT_FILE}\n`);
  console.log(csv);
  process.exit(0);
}

await mkdir(EXPORT_DIR, { recursive: true });
await writeFile(OUT_FILE, csv, "utf8");

console.log(
  `\nDone. Wrote ${rows.length} row(s) to ${OUT_FILE}` +
    ` (${missingApp} without an application doc, ${unknownFormation} unknown formation).`
);
process.exit(0);
