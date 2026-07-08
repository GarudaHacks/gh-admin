// Export a CSV of participants staying overnight at UMN.
//
// Flow:
//   1. Find every `applications` doc whose `overnightPlan` field is exactly
//      the overnight-stay confirmation sentence below. The application doc
//      id IS the user's uid.
//   2. For each, read users/{uid} for status, firstName, lastName,
//      genderIdentity, occupationPlace and currentOccupation. Only keep users
//      whose status is "accepted" or "confirmed rsvp".
//   3. Build the full name as `firstName` + ` lastName`, dropping lastName
//      when it's empty or just "." (some applicants use "." when they have
//      no last name).
//   4. Write export/overnight-stay.csv with headers
//      "Nama Lengkap,Jenis Kelamin,Occupation Place,Current Occupation".
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/export-overnight-stay.mjs
//   node --env-file=.env scripts/export-overnight-stay.mjs --dry-run

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OVERNIGHT_VALUE = "Yes, I will stay overnight at UMN";
const ALLOWED_STATUSES = ["accepted", "confirmed rsvp"];
const EXPORT_DIR = path.resolve(process.cwd(), "export");
const OUT_FILE = path.join(EXPORT_DIR, "overnight-stay.csv");

const dryRun = process.argv.includes("--dry-run");

function fullName(firstName, lastName) {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  const hasLast = last && last !== ".";
  return hasLast ? `${first} ${last}` : first;
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

const snap = await db
  .collection("applications")
  .where("overnightPlan", "==", OVERNIGHT_VALUE)
  .get();

console.log(`Found ${snap.size} application(s) staying overnight.`);

const rows = [];
let skipped = 0;

for (const appDoc of snap.docs) {
  const uid = appDoc.id; // application id === user uid
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    console.warn(`  [skip] ${uid}: no users/${uid} document`);
    skipped++;
    continue;
  }
  const user = userSnap.data();
  if (!ALLOWED_STATUSES.includes(user.status)) {
    console.warn(`  [skip] ${uid}: status is "${user.status ?? "(none)"}", not accepted/confirmed rsvp`);
    skipped++;
    continue;
  }

  const name = fullName(user.firstName, user.lastName);
  const gender = (user.genderIdentity ?? "").trim();
  const occupationPlace = (user.occupationPlace ?? "").trim();
  const currentOccupation = (user.currentOccupation ?? "").trim();

  if (!name) {
    console.warn(`  [skip] ${uid}: missing firstName`);
    skipped++;
    continue;
  }

  rows.push({ name, gender, occupationPlace, currentOccupation });
}

rows.sort((a, b) => a.name.localeCompare(b.name));

const lines = [
  "Nama Lengkap,Jenis Kelamin,Occupation Place,Current Occupation",
  ...rows.map(
    (r) =>
      `${csvField(r.name)},${csvField(r.gender)},${csvField(r.occupationPlace)},${csvField(r.currentOccupation)}`
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

console.log(`\nDone. Wrote ${rows.length} row(s) (${skipped} skipped) to ${OUT_FILE}`);
process.exit(0);
