// Export the teams that are majority women -- MORE THAN 60% of members are
// women -- from the `teams` collection (the live portal/mobile Speed Dating
// output; doc shape { name, leader, members: [uid, ...] }).
//
// Gender lives on the user doc: users/{uid}.genderIdentity, one of the three
// application options "Male" / "Female" / "Would rather not say". A member
// counts as a woman when that field, normalized, equals "female".
//
// The ratio is womenCount / totalMembers -- every member counts in the
// denominator, so a member with unknown gender (no user doc, or blank/absent
// genderIdentity) is NOT counted as a woman and pulls the ratio down. A team is
// exported when that ratio is strictly greater than 0.60.
//
// A team that does NOT clear 60% as-is but WOULD if all its unknown-gender
// members turned out to be women is not exported, but is listed separately for
// manual review so a borderline team isn't silently dropped.
//
// Output (written to export/):
//   - women-majority-teams.csv   one row per >60%-women team
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/export-women-majority-teams.mjs
//   node --env-file=.env scripts/export-women-majority-teams.mjs --dry-run

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const EXPORT_DIR = path.resolve(process.cwd(), "export");
const OUT_FILE = path.join(EXPORT_DIR, "women-majority-teams.csv");

// A team qualifies when strictly MORE THAN this fraction of members are women.
const WOMEN_THRESHOLD = 0.6;

const dryRun = process.argv.includes("--dry-run");

function isFemale(genderIdentity) {
  return (genderIdentity ?? "").trim().toLowerCase() === "female";
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
    gender: u.genderIdentity,
  });
}

const teamsSnap = await db.collection("teams").get();
console.log(
  `Loaded ${teamsSnap.size} team(s) from "teams" and ${usersSnap.size} user(s).\n`
);

const qualifying = []; // womenRatio > WOMEN_THRESHOLD
const reviewTeams = []; // below threshold as-is, but would clear it if all unknowns were women
let emptyTeams = 0;
let belowThreshold = 0;

for (const doc of teamsSnap.docs) {
  const data = doc.data();
  const teamName = (data.name ?? "").trim();
  const leader = (data.leader ?? "").trim();
  const members = Array.isArray(data.members) ? data.members : [];

  if (members.length === 0) {
    emptyTeams++;
    continue;
  }

  let womenCount = 0;
  let unknownCount = 0; // no user doc, or blank/absent genderIdentity
  for (const uid of members) {
    const user = userByUid.get(uid);
    if (!user || (user.gender ?? "").trim() === "") unknownCount++;
    else if (isFemale(user.gender)) womenCount++;
  }

  const total = members.length;
  const ratio = womenCount / total;
  const record = {
    teamId: doc.id,
    teamName,
    leader,
    memberIds: members,
    memberNames: members.map((uid) => userByUid.get(uid)?.name ?? uid),
    womenCount,
    total,
    unknownCount,
    ratio,
  };

  if (ratio > WOMEN_THRESHOLD) {
    qualifying.push(record);
  } else if (unknownCount > 0 && (womenCount + unknownCount) / total > WOMEN_THRESHOLD) {
    reviewTeams.push(record);
  } else {
    belowThreshold++;
  }
}

// Most-women-first, then by name.
qualifying.sort((a, b) => b.ratio - a.ratio || a.teamName.localeCompare(b.teamName));

const pct = (r) => `${(r * 100).toFixed(0)}%`;

// --- summary -----------------------------------------------------------------

console.log("=".repeat(60));
console.log(`MAJORITY-WOMEN TEAMS  (> ${pct(WOMEN_THRESHOLD)} women)`);
console.log("=".repeat(60));
console.log(`  Qualifying teams (exported):  ${qualifying.length}`);
console.log(`  Below threshold:              ${belowThreshold}`);
console.log(`  Empty (no members):           ${emptyTeams}`);
console.log(
  `  Borderline (unknown members): ${reviewTeams.length}   (NOT exported -- review below)`
);
if (reviewTeams.length) {
  console.log(
    `\n  These teams don't clear ${pct(WOMEN_THRESHOLD)} as counted, but would if their\n` +
      "  unknown-gender members (no user doc / no genderIdentity) were women:\n"
  );
  for (const t of reviewTeams) {
    console.log(
      `   - ${t.teamName || "(unnamed)"} [${t.teamId}]  ` +
        `${t.womenCount}/${t.total} women (${t.unknownCount} unknown)`
    );
  }
}
console.log();

// --- write CSV ---------------------------------------------------------------

const header = [
  "Team ID",
  "Team Name",
  "Leader",
  "Member Count",
  "Women Count",
  "Women %",
  "Member IDs",
  "Member Names",
];
const rows = qualifying.map((t) =>
  [
    t.teamId,
    t.teamName,
    t.leader,
    t.total,
    t.womenCount,
    pct(t.ratio),
    t.memberIds.join(";"),
    t.memberNames.join(";"),
  ]
    .map(csvField)
    .join(",")
);
const csv = [header.join(","), ...rows].join("\n") + "\n";

if (dryRun) {
  console.log(`[dry-run] would write ${qualifying.length} row(s) to ${OUT_FILE}\n`);
  console.log(csv);
  process.exit(0);
}

await mkdir(EXPORT_DIR, { recursive: true });
await writeFile(OUT_FILE, csv, "utf8");

console.log(`Done. Wrote ${qualifying.length} majority-women team(s) to ${OUT_FILE}`);
process.exit(0);
