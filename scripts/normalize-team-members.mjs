// Normalize the free-text `teamMembers` field for confirmed-RSVP participants
// into a canonical set of participant UIDs -- always including the applicant's
// own UID -- and emit a review report (no DB writes).
//
// Why: applications/{uid}.teamMembers is a comma-separated string of names that
// people typed by hand. The names are inexact (typos, nicknames, name-order
// swaps, diacritics, extra/missing middle names) and, per the applications UI,
// "may or may not" include the applicant themselves. This script resolves each
// listed name to a real confirmed-RSVP participant via fuzzy matching so teams
// can be reconstructed by UID.
//
// Match pool: confirmed-RSVP users ONLY. A teammate name that belongs to a
// non-confirmed (or non-existent) person is reported as unmatched, not resolved.
//
// Matching, per listed name:
//   - CONFIDENT  -> top candidate scores >= MATCH_THRESHOLD and beats the
//                   runner-up by >= MATCH_MARGIN. Its UID goes into memberIds.
//   - AMBIGUOUS  -> scores >= REVIEW_THRESHOLD but not confident (e.g. several
//                   people share a first name). Reported with suggestions; NOT
//                   auto-resolved.
//   - UNMATCHED  -> below REVIEW_THRESHOLD. Reported for manual handling.
// An email in the teamMembers text is matched directly against user emails.
// The applicant's own UID is always added, so a team is at minimum just [self].
//
// Output (written to export/):
//   - team-normalization.json  full structured result, keyed by uid
//   - team-normalization.csv   one row per confirmed-RSVP user for spreadsheets
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/normalize-team-members.mjs
//   node --env-file=.env scripts/normalize-team-members.mjs --dry-run   # print summary, don't write files

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CONFIRMED_STATUS = "confirmed rsvp";
const EXPORT_DIR = path.resolve(process.cwd(), "export");
const JSON_OUT = path.join(EXPORT_DIR, "team-normalization.json");
const CSV_OUT = path.join(EXPORT_DIR, "team-normalization.csv");

// A name resolves to a UID only when it's a confident match. Everything between
// REVIEW and MATCH is surfaced for a human; below REVIEW is treated as unmatched.
const MATCH_THRESHOLD = 0.9; // top score needed to auto-resolve
const MATCH_MARGIN = 0.06; // how far the top must beat the runner-up
const REVIEW_THRESHOLD = 0.72; // below this we don't even suggest

const dryRun = process.argv.includes("--dry-run");

// --- name normalization & fuzzy matching (no external deps) ------------------

function normalize(s) {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // punctuation -> space
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s) {
  return normalize(s).split(" ").filter(Boolean);
}

// Levenshtein edit distance (iterative, two-row).
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function ratio(a, b) {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

// Order-independent whole-name similarity: sort tokens, join, compare.
function tokenSortRatio(a, b) {
  return ratio(tokens(a).sort().join(" "), tokens(b).sort().join(" "));
}

// How well every query token is covered by some candidate token. Rewards
// partial names ("Kevin" vs "Kevin Sanjaya") and missing middle names, but is
// asymmetric: it ignores extra candidate tokens, so a bare "Daniel" scores 1.0
// against every "Daniel ...". That's why it's damped below (CONTAINMENT_WEIGHT):
// a subset/superset match alone must never out-rank or tie an exact full name.
function containment(query, candidate) {
  const qt = tokens(query);
  const ct = tokens(candidate);
  if (!qt.length || !ct.length) return 0;
  let sum = 0;
  for (const q of qt) {
    let best = 0;
    for (const c of ct) {
      const r = q === c ? 1 : ratio(q, c);
      if (r > best) best = r;
    }
    sum += best;
  }
  return sum / qt.length;
}

// Cap on containment so a pure subset/superset match tops out below
// MATCH_THRESHOLD -- it can suggest (ambiguous) but never auto-resolve on its
// own. Only the symmetric tokenSortRatio (exact/typo full names) reaches 1.0.
const CONTAINMENT_WEIGHT = 0.85;

function nameScore(query, candidate) {
  return Math.max(
    tokenSortRatio(query, candidate),
    CONTAINMENT_WEIGHT * containment(query, candidate)
  );
}

// --- helpers -----------------------------------------------------------------

function fullName(firstName, lastName) {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  const hasLast = last && last !== ".";
  return hasLast ? `${first} ${last}` : first;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Split the free-text teamMembers string into individual member entries.
// Delimiters: comma, semicolon, slash, pipe, ampersand, newlines, and the
// standalone words " and ". (We deliberately do NOT split on Indonesian "dan"
// to avoid breaking names where "Dan" is a given/middle name.)
function splitMembers(raw) {
  return (raw ?? "")
    .split(/\s*(?:,|;|\/|\||&|\r?\n|\band\b)\s*/i)
    .map((m) => m.trim())
    .filter((m) => /[a-z0-9]/i.test(m)); // drop blanks and punctuation-only ("-", ".")
}

function csvField(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// --- load data ---------------------------------------------------------------

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

const usersSnap = await db
  .collection("users")
  .where("status", "==", CONFIRMED_STATUS)
  .get();

console.log(`Found ${usersSnap.size} confirmed-rsvp user(s).`);

// Candidate pool (confirmed-rsvp users only), plus an email index. `candidates`
// holds everyone (used as the roster to process); `nameCandidates` excludes
// blank-named users so a listed name can never fuzzy-match an empty name.
const candidates = [];
const nameCandidates = [];
const emailIndex = new Map();
for (const doc of usersSnap.docs) {
  const u = doc.data();
  const name = fullName(u.firstName, u.lastName);
  const email = (u.email ?? "").trim().toLowerCase();
  const cand = { uid: doc.id, name, email };
  candidates.push(cand);
  if (normalize(name)) nameCandidates.push(cand);
  if (email) emailIndex.set(email, cand);
}

// Best candidate(s) for one listed name.
function matchName(entry) {
  const asEmail = entry.trim().toLowerCase();
  if (EMAIL_RE.test(asEmail) && emailIndex.has(asEmail)) {
    const c = emailIndex.get(asEmail);
    return { verdict: "confident", uid: c.uid, name: c.name, score: 1, via: "email" };
  }

  if (!normalize(entry)) return { verdict: "unmatched", score: 0 };

  let best = null;
  let second = null;
  for (const c of nameCandidates) {
    const score = nameScore(entry, c.name);
    if (!best || score > best.score) {
      second = best;
      best = { ...c, score };
    } else if (!second || score > second.score) {
      second = { ...c, score };
    }
  }
  if (!best) return { verdict: "unmatched" };

  const margin = best.score - (second?.score ?? 0);
  if (best.score >= MATCH_THRESHOLD && margin >= MATCH_MARGIN) {
    return { verdict: "confident", uid: best.uid, name: best.name, score: best.score, via: "name" };
  }
  if (best.score >= REVIEW_THRESHOLD) {
    return {
      verdict: "ambiguous",
      score: best.score,
      suggestions: [best, second]
        .filter((c) => c && c.score >= REVIEW_THRESHOLD)
        .map((c) => ({ uid: c.uid, name: c.name, score: Number(c.score.toFixed(3)) })),
    };
  }
  return { verdict: "unmatched", score: Number(best.score.toFixed(3)) };
}

// --- process each confirmed-rsvp user ---------------------------------------

const result = {};
let statTeamMembersPresent = 0;
let statConfident = 0;
let statAmbiguous = 0;
let statUnmatched = 0;

for (const cand of candidates) {
  const appSnap = await db.collection("applications").doc(cand.uid).get();
  const application = appSnap.exists ? appSnap.data() : {};
  const rawMembers = application.teamMembers ?? "";
  const entries = splitMembers(rawMembers);
  if (entries.length) statTeamMembersPresent++;

  // Always include self.
  const memberIds = new Set([cand.uid]);
  const memberNames = new Map([[cand.uid, cand.name]]);
  const resolved = [];
  const ambiguous = [];
  const unmatched = [];

  for (const entry of entries) {
    const m = matchName(entry);
    if (m.verdict === "confident") {
      statConfident++;
      memberIds.add(m.uid);
      memberNames.set(m.uid, m.name);
      resolved.push({ entry, uid: m.uid, name: m.name, score: Number(m.score.toFixed(3)), via: m.via });
    } else if (m.verdict === "ambiguous") {
      statAmbiguous++;
      ambiguous.push({ entry, suggestions: m.suggestions });
    } else {
      statUnmatched++;
      unmatched.push({ entry, topScore: m.score ?? 0 });
    }
  }

  result[cand.uid] = {
    uid: cand.uid,
    name: cand.name,
    email: cand.email,
    teamName: (application.teamName ?? "").trim(),
    teamFormation: (application.teamFormation ?? "").trim(),
    rawTeamMembers: rawMembers,
    memberIds: [...memberIds],
    memberNames: [...memberIds].map((id) => memberNames.get(id)),
    resolved,
    ambiguous,
    unmatched,
  };
}

// --- summary -----------------------------------------------------------------

const users = Object.values(result);
console.log(`
Summary
  Confirmed-rsvp users:        ${users.length}
  With teamMembers listed:     ${statTeamMembersPresent}
  Name entries resolved:       ${statConfident}
  Name entries ambiguous:      ${statAmbiguous}   (need manual review)
  Name entries unmatched:      ${statUnmatched}   (not a confirmed participant?)
`);

if (dryRun) {
  const sample = users.filter((u) => u.resolved.length || u.ambiguous.length || u.unmatched.length).slice(0, 5);
  console.log("[dry-run] sample (first 5 users with any listed members):\n");
  console.log(JSON.stringify(sample, null, 2));
  console.log(`\n[dry-run] would write ${users.length} record(s) to:\n  ${JSON_OUT}\n  ${CSV_OUT}`);
  process.exit(0);
}

// --- write reports -----------------------------------------------------------

await mkdir(EXPORT_DIR, { recursive: true });

await writeFile(JSON_OUT, JSON.stringify(result, null, 2) + "\n", "utf8");

const header = [
  "uid",
  "name",
  "email",
  "teamName",
  "teamFormation",
  "memberCount",
  "memberIds",
  "memberNames",
  "ambiguous",
  "unmatched",
];
const rows = users
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((u) =>
    [
      u.uid,
      u.name,
      u.email,
      u.teamName,
      u.teamFormation,
      u.memberIds.length,
      u.memberIds.join(";"),
      u.memberNames.join(";"),
      u.ambiguous
        .map((a) => `${a.entry} -> ${a.suggestions.map((s) => `${s.name}(${s.score})`).join(" | ")}`)
        .join(" ;; "),
      u.unmatched.map((x) => x.entry).join(";"),
    ]
      .map(csvField)
      .join(",")
  );
const csv = [header.join(","), ...rows].join("\n") + "\n";
await writeFile(CSV_OUT, csv, "utf8");

console.log(`Done. Wrote ${users.length} record(s) to:\n  ${JSON_OUT}\n  ${CSV_OUT}`);
process.exit(0);
