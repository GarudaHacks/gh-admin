// Generate leave (dispensation) letters for participants who requested one.
//
// Flow:
//   1. Find every `applications` doc whose `leaveLetter` field is exactly the
//      request sentence below. The application doc id IS the user's uid.
//   2. For each, read users/{uid} for firstName, lastName and occupationPlace.
//   3. Fill the .docx template ({place}, {participant_name}, {date_of_sending}),
//      convert it to PDF with LibreOffice, and write ./export/<uid>_leaveLetter.pdf
//   4. Upload the PDF to Cloud Storage at
//      users/generated/7.0/<uid>_leaveLetter.pdf (bucket from the env).
//   5. Stamp users/{uid}.leaveLetterGeneratedAt with a server timestamp.
//      (The email send, from the admin Mailing page, stamps leaveLetterSentAt.)
//
// Requires LibreOffice (`soffice`) for the docx -> pdf conversion.
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/generate-leave-letters.mjs
//   node --env-file=.env scripts/generate-leave-letters.mjs --dry-run
//   node --env-file=.env scripts/generate-leave-letters.mjs --force   # regenerate even if leaveLetterUrl is set
//   node --env-file=.env scripts/generate-leave-letters.mjs --uid <uid>
//     # regenerate for just this one user (implies --force)

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

const execFileP = promisify(execFile);

const LEAVE_LETTER_VALUE =
  "Yes, I would like to request a leave letter to attend Garuda Hacks 7.0";

// Only generate letters for users who have confirmed their RSVP.
const CONFIRMED_RSVP_STATUS = "confirmed rsvp";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const TEMPLATE_PATH = path.join(
  SCRIPT_DIR,
  "documents",
  "Garuda Hacks 7 - Dispensation Letter Template.docx"
);
const EXPORT_DIR = path.resolve(process.cwd(), "export");

// Cloud Storage destination. Bucket comes from the env (per-environment), the
// generated PDFs land under this prefix: users/generated/7.0/<uid>_leaveLetter.pdf
const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const STORAGE_PREFIX = "users/generated/7.0";

const dryRun = process.argv.includes("--dry-run");

const uidFlagIndex = process.argv.indexOf("--uid");
const uidArg = uidFlagIndex !== -1 ? process.argv[uidFlagIndex + 1] : undefined;
if (uidFlagIndex !== -1 && !uidArg) {
  console.error("Usage: --uid <uid> (missing value)");
  process.exit(1);
}

// By default skip users already processed (leaveLetterUrl present); --force
// regenerates. Targeting a single user with --uid always regenerates.
const force = process.argv.includes("--force") || Boolean(uidArg);

// Resolve the LibreOffice binary. Prefer SOFFICE_BIN, then known install
// locations that actually exist on disk, then a bare `soffice` from PATH.
function resolveSoffice() {
  const candidates = [
    process.env.SOFFICE_BIN,
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/opt/homebrew/bin/soffice",
    "/usr/local/bin/soffice",
    "/usr/bin/soffice",
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return "soffice";
}
const SOFFICE = resolveSoffice();

// Make a name safe for use in a filename / storage path: keep alphanumerics,
// collapse everything else (spaces, punctuation) to single underscores.
function slug(s) {
  return s
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatDate(d) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

// Fill the template and return a Buffer of the rendered .docx.
function renderDocx(templateBuffer, data) {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer" });
}

// Convert a .docx file to PDF in EXPORT_DIR using a throwaway LO profile.
async function docxToPdf(docxPath, profileDir) {
  await execFileP(SOFFICE, [
    "--headless",
    "--norestore",
    `-env:UserInstallation=file://${profileDir}`,
    "--convert-to",
    "pdf",
    "--outdir",
    EXPORT_DIR,
    docxPath,
  ]);
}

if (!BUCKET_NAME) {
  console.error(
    "Missing NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in env; cannot resolve the upload bucket."
  );
  process.exit(1);
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: BUCKET_NAME,
});
const db = getFirestore(app);
const bucket = getStorage(app).bucket(BUCKET_NAME);

const templateBuffer = await readFile(TEMPLATE_PATH);

let appDocs;
if (uidArg) {
  const appDoc = await db.collection("applications").doc(uidArg).get();
  if (!appDoc.exists) {
    console.error(`No applications/${uidArg} document found`);
    process.exit(1);
  }
  if (appDoc.data().leaveLetter !== LEAVE_LETTER_VALUE) {
    console.error(`applications/${uidArg} never requested a leave letter`);
    process.exit(1);
  }
  console.log(`Regenerating leave letter for uid ${uidArg}.`);
  appDocs = [appDoc];
} else {
  const snap = await db
    .collection("applications")
    .where("leaveLetter", "==", LEAVE_LETTER_VALUE)
    .get();
  console.log(`Found ${snap.size} application(s) requesting a leave letter.`);
  if (snap.empty) process.exit(0);
  appDocs = snap.docs;
}

await mkdir(EXPORT_DIR, { recursive: true });
const workDir = await mkdtemp(path.join(tmpdir(), "leave-letters-"));
const profileDir = path.join(workDir, "lo-profile");
const dateOfSending = formatDate(new Date());

let ok = 0;
let skipped = 0;
let failed = 0;

for (const appDoc of appDocs) {
  const uid = appDoc.id; // application id === user uid
  try {
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      console.warn(`  [skip] ${uid}: no users/${uid} document`);
      skipped++;
      continue;
    }
    const user = userSnap.data();
    if (user.status !== CONFIRMED_RSVP_STATUS) {
      console.warn(
        `  [skip] ${uid}: status is "${user.status ?? "(none)"}", not "${CONFIRMED_RSVP_STATUS}"`
      );
      skipped++;
      continue;
    }
    if (user.leaveLetterUrl && !force) {
      console.warn(`  [skip] ${uid}: already has leaveLetterUrl (use --force to regenerate)`);
      skipped++;
      continue;
    }
    const firstName = (user.firstName ?? "").trim();
    const lastName = (user.lastName ?? "").trim();
    const place = (user.occupationPlace ?? "").trim();
    const participantName = `${firstName} ${lastName}`.trim();

    if (!participantName || !place) {
      console.warn(
        `  [skip] ${uid}: missing ${!participantName ? "name" : ""}${!participantName && !place ? " & " : ""
        }${!place ? "occupationPlace" : ""}`
      );
      skipped++;
      continue;
    }

    const filled = renderDocx(templateBuffer, {
      place,
      participant_name: participantName,
      date_of_sending: dateOfSending,
    });

    const pdfName = `${uid}_${slug(firstName)}_${slug(lastName)}_leaveLetter.pdf`;
    if (dryRun) {
      console.log(
        `  [dry-run] ${uid}: would write ${pdfName} (name="${participantName}", place="${place}"), upload to gs://${BUCKET_NAME}/${STORAGE_PREFIX}/${pdfName}, set leaveLetterUrl=https://storage.googleapis.com/${BUCKET_NAME}/${STORAGE_PREFIX}/${pdfName} and stamp leaveLetterGeneratedAt`
      );
      ok++;
      continue;
    }

    // LibreOffice names the PDF after the input file's basename, so the docx
    // must share pdfName's basename to land at export/<pdfName>.
    const docxPath = path.join(workDir, pdfName.replace(/\.pdf$/, ".docx"));
    await writeFile(docxPath, filled);
    await docxToPdf(docxPath, profileDir);

    const pdfPath = path.join(EXPORT_DIR, pdfName);
    if (!existsSync(pdfPath)) {
      throw new Error(`expected PDF not produced at ${pdfPath}`);
    }

    const destination = `${STORAGE_PREFIX}/${pdfName}`;
    await bucket.upload(pdfPath, {
      destination,
      public: true, // grants allUsers read so the storage.googleapis.com URL resolves
      metadata: { contentType: "application/pdf" },
    });

    const leaveLetterUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
    await db.collection("users").doc(uid).set(
      {
        leaveLetterGeneratedAt: FieldValue.serverTimestamp(),
        leaveLetterUrl,
      },
      { merge: true }
    );

    console.log(`  [ok]   ${uid}: ${pdfName} -> ${leaveLetterUrl}`);
    ok++;
  } catch (err) {
    console.error(`  [fail] ${uid}: ${err.message}`);
    failed++;
  }
}

await rm(workDir, { recursive: true, force: true });

console.log(
  `\nDone. ${ok} generated, ${skipped} skipped, ${failed} failed. PDFs in ${EXPORT_DIR}`
);
process.exit(failed > 0 ? 1 : 0);
