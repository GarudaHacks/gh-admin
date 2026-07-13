// Import solo participants as one-person teams into the `formations` collection.
//
// Input is a per-participant CSV/TSV (one row per person). Columns, in order:
//   UID, First Name, Last Name, Team Formation, Team Name
// The trailing "Team Formation"/"Team Name" columns are ignored -- the team name
// is derived as "<First Name> <Last Name> Team" and the sole member is the UID.
//
// Each row becomes one Firestore doc with an auto-generated id (same shape as
// scripts/import-formations.mjs):
//
//   {
//     id:        <same as the doc name>,
//     members:   [<uid>],
//     teamName:  "<First Name> <Last Name> Team",
//     createdAt: serverTimestamp,
//     updatedAt: serverTimestamp,
//     updatedBy: "system",
//     version:   "7.0",
//   }
//
// The input may be tab- or comma-separated (auto-detected from the first line,
// override with --delimiter). A header row whose first cell is "UID" is skipped.
// Example (tab-separated):
//
//   UID                            First Name  Last Name   Team Formation  Team Name
//   dGBu6aSp0rc9VlCdR5WZJvBXDOf2   Anandhio    Varistama   SOLO            N/A
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/import-solo-formations.mjs path/to/solos.csv
//   node --env-file=.env scripts/import-solo-formations.mjs path/to/solos.csv --dry-run
//   node --env-file=.env scripts/import-solo-formations.mjs path/to/solos.tsv --delimiter tab

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFile } from "node:fs/promises";

const VERSION = "7.0";
const UPDATED_BY = "system";
const COLLECTION = "formations";
const BATCH_LIMIT = 500; // Firestore hard cap per WriteBatch.

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const delimiterFlagIdx = args.indexOf("--delimiter");
const delimiterFlag = delimiterFlagIdx !== -1 ? args[delimiterFlagIdx + 1] : null;

// The CSV path is the first positional arg (anything not a flag / flag value).
const csvPath = args.find(
  (a, i) => !a.startsWith("--") && args[i - 1] !== "--delimiter"
);
if (!csvPath) {
  console.error(
    "Usage: node --env-file=.env scripts/import-solo-formations.mjs <path-to-csv> [--dry-run] [--delimiter tab|comma]"
  );
  process.exit(1);
}

// Parse one delimited line, honoring double-quoted fields ("" escapes a quote).
function parseLine(line, delimiter) {
  const fields = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields.map((f) => f.trim());
}

function resolveDelimiter(headerLine) {
  if (delimiterFlag) {
    if (delimiterFlag === "tab" || delimiterFlag === "\\t") return "\t";
    if (delimiterFlag === "comma") return ",";
    return delimiterFlag; // allow a literal single char
  }
  return headerLine.includes("\t") ? "\t" : ",";
}

const raw = await readFile(csvPath, "utf8");
// Split on newlines, tolerate CRLF, drop fully blank lines.
const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
if (lines.length === 0) {
  console.error(`No rows found in ${csvPath}`);
  process.exit(1);
}

const delimiter = resolveDelimiter(lines[0]);

// Skip a header row (first cell is "UID").
let startIdx = 0;
const firstCell = parseLine(lines[0], delimiter)[0] ?? "";
if (/^uid$/i.test(firstCell)) startIdx = 1;

const teams = [];
let skipped = 0;
for (let i = startIdx; i < lines.length; i++) {
  const cells = parseLine(lines[i], delimiter);
  const uid = (cells[0] ?? "").trim();
  const firstName = (cells[1] ?? "").trim();
  const lastName = (cells[2] ?? "").trim();

  if (!uid) {
    console.warn(`  [skip] line ${i + 1}: no UID`);
    skipped++;
    continue;
  }

  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (!name) {
    console.warn(`  [warn] line ${i + 1} (${uid}): no name; team name will be just "Team"`);
  }
  const teamName = `${name} Team`.trim();

  teams.push({ teamName, members: [uid] });
}

console.log(
  `Parsed ${teams.length} solo participant(s) from ${csvPath}` +
    ` (delimiter=${delimiter === "\t" ? "tab" : JSON.stringify(delimiter)}, ${skipped} skipped).`
);

if (teams.length === 0) process.exit(0);

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

if (dryRun) {
  console.log(`\n[dry-run] would create ${teams.length} doc(s) in "${COLLECTION}":\n`);
  for (const t of teams) {
    console.log(`  "${t.teamName}"  ->  members: [${t.members.join(", ")}]`);
  }
  process.exit(0);
}

let created = 0;
for (let i = 0; i < teams.length; i += BATCH_LIMIT) {
  const chunk = teams.slice(i, i + BATCH_LIMIT);
  const batch = db.batch();
  for (const t of chunk) {
    const ref = db.collection(COLLECTION).doc(); // auto id
    batch.set(ref, {
      id: ref.id,
      members: t.members,
      teamName: t.teamName,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: UPDATED_BY,
      version: VERSION,
    });
  }
  await batch.commit();
  created += chunk.length;
  console.log(`  committed ${created}/${teams.length}`);
}

console.log(`\nDone. Created ${created} formation doc(s) in "${COLLECTION}".`);
process.exit(0);
