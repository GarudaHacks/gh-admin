// Export the teams whose members are all pre-university (high school / SMA/SMK
// or lower), from the `teams` collection (the live portal/mobile Speed Dating
// output; doc shape { name, leader, members: [uid, ...] }).
//
// Level of study lives on the user doc: users/{uid}.currentOccupation, one of
// the application options:
//   "Currently in high school (SMA/SMK) or lower"        <- PRE-UNIVERSITY
//   "Currently studying for Bachelor's Degree (Sarjana)"
//   "Currently studying for Master's Degree (Magister)"
//   "Currently studying for Doctorate Degree (Doktor)"
//   "Currently employed"
// A member counts as pre-university when currentOccupation mentions "high
// school" / SMA / SMK (i.e. the first option; nothing else does).
//
// A team is exported as ALL-PRE-UNIVERSITY only when it has >=1 member AND every
// member resolves to a user who is pre-university. If a team is all-pre-uni
// among the members we *could* resolve but has any member with unknown level
// (no user doc, or blank/absent currentOccupation), it is NOT exported -- we
// can't assert "all pre-university" -- but it's listed separately for manual
// review so nobody is silently mislabeled.
//
// Output (written to export/):
//   - preuniversity-teams.csv   one row per all-pre-university team
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/export-preuniversity-teams.mjs
//   node --env-file=.env scripts/export-preuniversity-teams.mjs --dry-run

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const EXPORT_DIR = path.resolve(process.cwd(), "export");
const OUT_FILE = path.join(EXPORT_DIR, "preuniversity-teams.csv");

const dryRun = process.argv.includes("--dry-run");

// The pre-university option is the only currentOccupation value mentioning high
// school / SMA / SMK. Substring matching so trivial wording drift still counts.
function isPreUniversity(currentOccupation) {
  const s = (currentOccupation ?? "").toLowerCase();
  return s.includes("high school") || s.includes("sma") || s.includes("smk");
}

function fullName(firstName, lastName) {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  const hasLast = last && last !== ".";
  return (hasLast ? `${first} ${last}` : first).trim();
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

// Load every user once so a member on multiple teams is read a single time.
const usersSnap = await db.collection("users").get();
const userByUid = new Map();
for (const doc of usersSnap.docs) {
  const u = doc.data();
  userByUid.set(doc.id, {
    name: fullName(u.firstName, u.lastName) || doc.id,
    occupation: u.currentOccupation,
  });
}

const teamsSnap = await db.collection("teams").get();
console.log(
  `Loaded ${teamsSnap.size} team(s) from "teams" and ${usersSnap.size} user(s).\n`
);

const preUni = []; // fully resolved, every member pre-university
const reviewTeams = []; // all pre-uni among resolved, but has unknown-level member(s)
let emptyTeams = 0;
let mixedTeams = 0; // has at least one known non-pre-university member

for (const doc of teamsSnap.docs) {
  const data = doc.data();
  const teamName = (data.name ?? "").trim();
  const leader = (data.leader ?? "").trim();
  const members = Array.isArray(data.members) ? data.members : [];

  if (members.length === 0) {
    emptyTeams++;
    continue;
  }

  let hasNonPreUni = false; // a member whose known level is NOT pre-university
  let hasUnknown = false; // no user doc, or blank/absent currentOccupation
  for (const uid of members) {
    const user = userByUid.get(uid);
    if (!user || (user.occupation ?? "").trim() === "") {
      hasUnknown = true;
    } else if (!isPreUniversity(user.occupation)) {
      hasNonPreUni = true;
    }
  }

  if (hasNonPreUni) {
    mixedTeams++;
    continue;
  }

  const record = {
    teamId: doc.id,
    teamName,
    leader,
    memberIds: members,
    memberNames: members.map((uid) => userByUid.get(uid)?.name ?? uid),
    unknownLevelCount: members.filter((uid) => {
      const u = userByUid.get(uid);
      return !u || (u.occupation ?? "").trim() === "";
    }).length,
  };

  if (hasUnknown) reviewTeams.push(record);
  else preUni.push(record);
}

preUni.sort((a, b) => a.teamName.localeCompare(b.teamName));

// --- summary -----------------------------------------------------------------

console.log("=".repeat(60));
console.log("ALL PRE-UNIVERSITY (SMA/SMK OR LOWER) TEAMS");
console.log("=".repeat(60));
console.log(`  All-pre-uni teams (exported): ${preUni.length}`);
console.log(`  Mixed / has non-pre-uni:      ${mixedTeams}`);
console.log(`  Empty (no members):           ${emptyTeams}`);
console.log(
  `  All-pre-uni + unknown member: ${reviewTeams.length}   (NOT exported -- review below)`
);
if (reviewTeams.length) {
  console.log(
    "\n  These teams are all-pre-university among the members we could resolve,\n" +
      "  but have member(s) with no user doc or no currentOccupation set:\n"
  );
  for (const t of reviewTeams) {
    console.log(
      `   - ${t.teamName || "(unnamed)"} [${t.teamId}] ` +
        `(${t.unknownLevelCount}/${t.memberIds.length} unknown)`
    );
  }
}
console.log();

// --- write CSV ---------------------------------------------------------------

const header = ["Team ID", "Team Name", "Leader", "Member Count", "Member IDs", "Member Names"];
const rows = preUni.map((t) =>
  [
    t.teamId,
    t.teamName,
    t.leader,
    t.memberIds.length,
    t.memberIds.join(";"),
    t.memberNames.join(";"),
  ]
    .map(csvField)
    .join(",")
);
const csv = [header.join(","), ...rows].join("\n") + "\n";

if (dryRun) {
  console.log(`[dry-run] would write ${preUni.length} row(s) to ${OUT_FILE}\n`);
  console.log(csv);
  process.exit(0);
}

await mkdir(EXPORT_DIR, { recursive: true });
await writeFile(OUT_FILE, csv, "utf8");

console.log(`Done. Wrote ${preUni.length} all-pre-university team(s) to ${OUT_FILE}`);
process.exit(0);
