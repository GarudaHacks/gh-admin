// Report how many teams are interested in each track (Health, Safety,
// Agriculture), using a majority vote of each team's members.
//
// Teams live in the `formations` collection ({ members: [uid, ...], teamName }).
// Each member's track preference is stored on their own application doc as
// applications/{uid}.interestedTrack, one of the three application options:
//   "Health"  /  "Safety"  /  "Agriculture & Food Systems"
// which we normalize to the short codes HEALTH / SAFETY / AGRICULTURE.
//
// Per team we tally its members' picks and take the "most voter" (plurality):
//   - Clear winner            -> the team counts toward that track.
//   - Tie for the top         -> the team is undecided; it does NOT count for a
//                                single track. Instead it's logged separately,
//                                broken down by which two (or more) tracks it's
//                                split between (the "50/50" case).
//   - No member answered      -> logged as "no data".
//
// Members with no application / no interestedTrack are simply skipped from that
// team's vote (they don't count against anyone).
//
// Output: a brief terminal report -- each track with its interested-team count
// and the team names, then the split-preference and no-data logs.
//
// Usage (uses GOOGLE_APPLICATION_CREDENTIALS from .env):
//   node --env-file=.env scripts/track-interest-report.mjs
//   node --env-file=.env scripts/track-interest-report.mjs --names   # list team names under each track

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COLLECTION = "formations";
const TRACKS = ["HEALTH", "SAFETY", "AGRICULTURE"];
const TRACK_LABEL = {
  HEALTH: "Health",
  SAFETY: "Safety",
  AGRICULTURE: "Agriculture & Food Systems",
};

const showNames = process.argv.includes("--names");

// Map the stored free-text answer to a short track code. Substring matching so
// trivial wording drift still classifies. Returns null if unrecognized/blank.
function classifyTrack(raw) {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return null;
  if (s.includes("health")) return "HEALTH";
  if (s.includes("safety")) return "SAFETY";
  if (s.includes("agricultur") || s.includes("food")) return "AGRICULTURE";
  return null;
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

// Load every member's interestedTrack once (applications keyed by uid), so a
// person on multiple teams is read a single time.
const appsSnap = await db.collection("applications").get();
const trackByUid = new Map();
for (const doc of appsSnap.docs) {
  trackByUid.set(doc.id, classifyTrack(doc.data().interestedTrack));
}

const formationsSnap = await db.collection(COLLECTION).get();
console.log(
  `Loaded ${formationsSnap.size} team(s) from "${COLLECTION}" and ` +
    `${appsSnap.size} application(s).\n`
);

// Per-track buckets of team names, plus the split / no-data / unknown-member logs.
const teamsByTrack = { HEALTH: [], SAFETY: [], AGRICULTURE: [] };
const splitTeams = []; // { teamName, tiedTracks: [...], counts }
const noDataTeams = []; // teams where no member had a track
const splitPairCounts = new Map(); // "HEALTH+SAFETY" -> count (2-way ties only)

for (const doc of formationsSnap.docs) {
  const data = doc.data();
  const teamName = (data.teamName ?? "").trim() || `(unnamed ${doc.id})`;
  const members = Array.isArray(data.members) ? data.members : [];

  // Tally this team's votes.
  const counts = { HEALTH: 0, SAFETY: 0, AGRICULTURE: 0 };
  let voters = 0;
  for (const uid of members) {
    const track = trackByUid.get(uid);
    if (track && track in counts) {
      counts[track]++;
      voters++;
    }
  }

  if (voters === 0) {
    noDataTeams.push(teamName);
    continue;
  }

  // Plurality: find the max, then everyone tied at that max.
  const max = Math.max(counts.HEALTH, counts.SAFETY, counts.AGRICULTURE);
  const winners = TRACKS.filter((t) => counts[t] === max);

  if (winners.length === 1) {
    teamsByTrack[winners[0]].push(teamName);
  } else {
    splitTeams.push({ teamName, tiedTracks: winners, counts });
    if (winners.length === 2) {
      const key = winners.join("+");
      splitPairCounts.set(key, (splitPairCounts.get(key) ?? 0) + 1);
    }
  }
}

// --- report ------------------------------------------------------------------

const decided = TRACKS.reduce((n, t) => n + teamsByTrack[t].length, 0);

console.log("=".repeat(60));
console.log("TRACK INTEREST REPORT  (majority vote per team)");
console.log("=".repeat(60));
for (const t of TRACKS) {
  const list = teamsByTrack[t];
  console.log(`\n${TRACK_LABEL[t]}: ${list.length} team(s)`);
  if (showNames) {
    for (const name of [...list].sort((a, b) => a.localeCompare(b))) {
      console.log(`   - ${name}`);
    }
  }
}

console.log("\n" + "-".repeat(60));
console.log(
  `Split / undecided (top is tied): ${splitTeams.length} team(s)`
);
if (splitTeams.length) {
  // How many teams are split between each specific pair of tracks.
  for (const [key, count] of [...splitPairCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    const label = key
      .split("+")
      .map((t) => TRACK_LABEL[t])
      .join("  &  ");
    console.log(`   ${label}: ${count} team(s)`);
  }
  const threeWay = splitTeams.filter((s) => s.tiedTracks.length >= 3).length;
  if (threeWay) console.log(`   3-way tie: ${threeWay} team(s)`);
  if (showNames) {
    for (const s of splitTeams) {
      const tracks = s.tiedTracks.map((t) => TRACK_LABEL[t]).join(" / ");
      console.log(
        `   - ${s.teamName}  [${tracks}]  ` +
          `(H:${s.counts.HEALTH} S:${s.counts.SAFETY} A:${s.counts.AGRICULTURE})`
      );
    }
  }
}

console.log(
  `\nNo track data (no member answered): ${noDataTeams.length} team(s)`
);
if (showNames && noDataTeams.length) {
  for (const name of [...noDataTeams].sort((a, b) => a.localeCompare(b))) {
    console.log(`   - ${name}`);
  }
}

console.log("\n" + "=".repeat(60));
console.log(
  `Totals: ${formationsSnap.size} team(s) = ` +
    `${decided} decided + ${splitTeams.length} split + ${noDataTeams.length} no-data`
);
console.log("=".repeat(60));

process.exit(0);
