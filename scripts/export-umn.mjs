// Export a CSV of UMN-affiliated participants: those referred in with the
// special "GarudieTotoLanjutGas" code, or whose occupationPlace identifies
// Universitas Multimedia Nusantara (aka UMN).
//
// Note: this does NOT filter on `overnightPlan` -- that field is randomly
// seeded in this dataset and isn't a meaningful signal.
//
// Flow:
//   1. Find every `users` doc whose `status` is "accepted" or "confirmed rsvp".
//   2. For each, read applications/{uid} for referralCode (uid === doc id).
//   3. Keep the user if referralCode === "GarudieTotoLanjutGas", or if
//      occupationPlace contains "multimedia" or "umn" (case-insensitive) --
//      covers "Universitas Multimedia Nusantara", "Multimedia Nusantara
//      University", "UMN", or any other string containing "Multimedia".
//   4. Build the full name as `firstName` + ` lastName`, dropping lastName
//      when it's empty or just "." (some applicants use "." when they have
//      no last name).
//   5. Write export/umn.csv with headers "Nama Lengkap,Jenis Kelamin,Keterangan",
//      where Keterangan is the referral code (if that's why they matched) or
//      else their occupationPlace.
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/export-umn.mjs
//   node --env-file=.env scripts/export-umn.mjs --dry-run

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REFERRAL_CODE = "GarudieTotoLanjutGas";
const ALLOWED_STATUSES = ["accepted", "confirmed rsvp"];
const EXPORT_DIR = path.resolve(process.cwd(), "export");
const OUT_FILE = path.join(EXPORT_DIR, "umn.csv");

const dryRun = process.argv.includes("--dry-run");

function fullName(firstName, lastName) {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  const hasLast = last && last !== ".";
  return hasLast ? `${first} ${last}` : first;
}

function isUmnAffiliated(occupationPlace) {
  const p = (occupationPlace ?? "").toLowerCase();
  return p.includes("multimedia") || p.includes("umn");
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
  .collection("users")
  .where("status", "in", ALLOWED_STATUSES)
  .get();

console.log(`Found ${snap.size} accepted/confirmed rsvp user(s).`);

const rows = [];
let skipped = 0;

for (const userDoc of snap.docs) {
  const uid = userDoc.id;
  const user = userDoc.data();

  const appSnap = await db.collection("applications").doc(uid).get();
  const referralCode = appSnap.exists ? appSnap.data().referralCode : undefined;

  const matches =
    referralCode === REFERRAL_CODE || isUmnAffiliated(user.occupationPlace);
  if (!matches) {
    skipped++;
    continue;
  }

  const name = fullName(user.firstName, user.lastName);
  const gender = (user.genderIdentity ?? "").trim();
  const keterangan =
    referralCode === REFERRAL_CODE ? referralCode : (user.occupationPlace ?? "").trim();

  if (!name) {
    console.warn(`  [skip] ${uid}: missing firstName`);
    skipped++;
    continue;
  }

  rows.push({ name, gender, keterangan });
}

rows.sort((a, b) => a.name.localeCompare(b.name));

const lines = [
  "Nama Lengkap,Jenis Kelamin,Keterangan",
  ...rows.map(
    (r) => `${csvField(r.name)},${csvField(r.gender)},${csvField(r.keterangan)}`
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
  `\nDone. Wrote ${rows.length} row(s) (${skipped} not UMN-affiliated) to ${OUT_FILE}`
);
process.exit(0);
