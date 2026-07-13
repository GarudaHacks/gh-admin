// Import teams from a CSV/TSV into the `formations` collection.
//
// Each data row is one team: the first column is the team name, every
// remaining column is a member UID (blanks are ignored). One Firestore doc is
// created per row with an auto-generated id:
//
//   {
//     id:        <same as the doc name>,
//     members:   [<uid>, ...],   // member UIDs, in column order, blanks dropped
//     teamName:  <TEAM NAME>,
//     createdAt: serverTimestamp,
//     updatedAt: serverTimestamp,
//     updatedBy: "system",       // later overwritten with the editor's email
//     version:   "7.0",
//   }
//
// The input may be tab- or comma-separated; the delimiter is auto-detected from
// the first line (override with --delimiter). A header row whose first cell
// matches /team\s*name/i is skipped. Example (tab-separated):
//
//   TEAM NAME              MEMBER 1  MEMBER 2  MEMBER 3  MEMBER 4
//   Kartu loyalitas Anda   QIGX...   y5YL...   UY7X...   WznC...
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/import-formations.mjs path/to/teams.csv
//   node --env-file=.env scripts/import-formations.mjs path/to/teams.csv --dry-run
//   node --env-file=.env scripts/import-formations.mjs path/to/teams.tsv --delimiter tab

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
    "Usage: node --env-file=.env scripts/import-formations.mjs <path-to-csv> [--dry-run] [--delimiter tab|comma]"
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

// Skip a header row (first cell looks like "TEAM NAME").
let startIdx = 0;
const firstCell = parseLine(lines[0], delimiter)[0] ?? "";
if (/team\s*name/i.test(firstCell)) startIdx = 1;

const teams = [];
let skipped = 0;
for (let i = startIdx; i < lines.length; i++) {
  const cells = parseLine(lines[i], delimiter);
  const teamName = (cells[0] ?? "").trim();
  const members = cells.slice(1).map((c) => c.trim()).filter(Boolean);

  if (!teamName) {
    console.warn(`  [skip] line ${i + 1}: no team name`);
    skipped++;
    continue;
  }
  if (members.length === 0) {
    console.warn(`  [warn] line ${i + 1} ("${teamName}"): no members`);
  }
  teams.push({ teamName, members });
}

console.log(
  `Parsed ${teams.length} team(s) from ${csvPath}` +
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
    console.log(`  ${t.teamName}  ->  members: [${t.members.join(", ")}]`);
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
