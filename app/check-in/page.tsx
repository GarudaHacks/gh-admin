"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  History,
  Info,
  Loader2,
  MapPin,
  ScanLine,
  XCircle,
} from "lucide-react";
import QrScanner from "./QrScanner";
import { StepCard } from "./StepCard";
import { TeamConfirm } from "./TeamConfirm";
import { OvernightConfirm } from "./OvernightConfirm";
import { PhotoCapture } from "./PhotoCapture";
import { useCheckInFlow } from "./useCheckInFlow";
import { postCheckIn } from "./checkin-client";
import type {
  CheckInContext,
  CheckInResponse,
  CheckInTable,
  CheckInTeam,
} from "@/lib/checkin-types";

// Sensible default before the first scan tells us who the hacker is. The flow
// re-filters its steps once `setContext` runs with the scanned hacker's facts.
const DEFAULT_CONTEXT: CheckInContext = {
  inTeam: false,
  joiningSpeedDating: false,
  hasTable: false,
  needsMobileTeam: false,
};

export default function CheckInPage() {
  const [context, setContext] = useState<CheckInContext>(DEFAULT_CONTEXT);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  // The team roster (mutable via the Confirm Team step), seeded from the scan.
  const [team, setTeam] = useState<CheckInTeam | null>(null);
  // The hacker's overnight plan (mutable via the Overnight Plan step).
  const [overnight, setOvernight] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  // True while a scanned code is being validated / checked in (network in flight).
  const [scanning, setScanning] = useState(false);
  // Guards against the camera firing the same code many times per second.
  const busyRef = useRef(false);

  const flow = useCheckInFlow(context);

  const handleScan = async (value: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setScanError(null);
    setScanning(true);
    try {
      const data = await postCheckIn(value);
      if (!data.ok) {
        setScanError(data.reason);
        return;
      }
      setResult(data);
      setTeam(data.team);
      setOvernight(data.overnight);
      setContext(data.context); // re-filters the flow to this hacker
      flow.next(); // advance off the scan step
    } finally {
      setScanning(false);
      busyRef.current = false;
    }
  };

  // reset for the next hacker
  const handleReset = () => {
    setResult(null);
    setTeam(null);
    setOvernight(false);
    setScanError(null);
    setScanning(false);
    setContext(DEFAULT_CONTEXT);
    busyRef.current = false;
    flow.reset();
  };

  return (
    <div className="min-h-screen text-white px-4 py-10">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-[#874ffe]" />
            <h1 className="text-xl font-semibold">Guided Check-In</h1>
          </div>
          <Link
            href="/check-in/history"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
          >
            <History className="h-4 w-4" />
            History
          </Link>
        </header>

        <StepCard
          flow={flow}
          onReset={handleReset}
          slots={{
            scanQr: (
              <div>
                <div className="relative">
                  <QrScanner onScan={handleScan} paused={scanning} />
                  {scanning && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/60 backdrop-blur-sm">
                      <Loader2 className="h-8 w-8 animate-spin text-[#874ffe]" />
                      <p className="text-sm font-medium text-white/80">
                        Checking in…
                      </p>
                    </div>
                  )}
                </div>
                {scanError && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-red-300">
                    <XCircle className="h-4 w-4" />
                    {scanError}
                  </p>
                )}
              </div>
            ),
            getHackerInformations: result?.ok ? (
              <HackerSummary result={result} />
            ) : null,
            verifyTable: result?.ok && result.table ? (
              <div className="space-y-2">
                <TableCallout table={result.table} />
                <p className="text-xs text-white/50">
                  Compare against the sticker on the lanyard — both the location
                  and the table number must match.
                </p>
              </div>
            ) : null,
            announceTable: result?.ok && result.table ? (
              <TableCallout table={result.table} />
            ) : null,
            noTableYet: (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <p className="text-sm text-amber-100/90">
                  No table assigned yet. Let them know they&apos;ll get their
                  table after the Speed Dating session.
                </p>
              </div>
            ),
            createMobileTeam: (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <p className="text-sm text-amber-100/90">
                  Team{" "}
                  <span className="font-semibold text-white">
                    {result?.ok && team ? team.teamName || "(unnamed)" : ""}
                  </span>{" "}
                  isn&apos;t created in the mobile app yet. Have them create it
                  and make sure every member joins — it&apos;s needed for
                  attendance confirmation later.
                </p>
              </div>
            ),
            confirmOvernight: result?.ok ? (
              <OvernightConfirm
                uid={result.userId}
                overnight={overnight}
                onChange={setOvernight}
              />
            ) : null,
            speedDatingBooth: (
              <div className="flex items-start gap-3 rounded-xl border border-[#874ffe]/40 bg-[#874ffe]/10 p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#b794ff]" />
                <p className="text-sm text-white/80">
                  Point them to the{" "}
                  <span className="font-semibold text-white">
                    Speed Dating Booth
                  </span>{" "}
                  near the VIP booth.
                </p>
              </div>
            ),
            confirmTeam:
              result?.ok && team ? (
                <TeamConfirm
                  team={team}
                  leadUid={result.userId}
                  onTeamChange={setTeam}
                />
              ) : (
                <p className="text-sm text-white/50">
                  This hacker isn&apos;t on any team.
                </p>
              ),
            takePicture: result?.ok ? (
              <PhotoCapture uid={result.userId} onUploaded={() => {}} />
            ) : null,
          }}
        />
      </div>
    </div>
  );
}

// dd/mm/yyyy HH:mm:ss (24h) from an ISO string, or "—".
function formatDMYHMS(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Date-only display (dd/mm/yyyy) in UTC so the day matches the stored ISO date.
function formatDMY(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

// Classify nationality to "Indonesian" / "Non" (or "—" when unknown).
function nationalityLabel(nationality: string): string {
  if (!nationality.trim()) return "—";
  return /indonesia/i.test(nationality) ? "Indonesian" : "Non";
}

// Prominent display of a team's assigned table — used to verify the lanyard
// sticker and to read the table out to the hacker.
function TableCallout({ table }: { table: CheckInTable }) {
  return (
    <div className="rounded-xl border border-[#874ffe]/40 bg-[#874ffe]/10 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-white/50">
        Assigned table
      </p>
      <p className="mt-1 text-3xl font-bold text-white">
        Table {table.tableNumber}
      </p>
      <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/70">
        <MapPin className="h-4 w-4 text-[#b794ff]" />
        {table.location || "—"}
      </p>
    </div>
  );
}

function HackerSummary({
  result,
}: {
  result: Extract<CheckInResponse, { ok: true }>;
}) {
  const { hacker, userId, alreadyCheckedIn, checkedInAt } = result;
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
        <CheckCircle2 className="h-4 w-4" />
        {alreadyCheckedIn ? "Already checked in" : "Checked in"}
      </p>
      <div className="mt-3 space-y-1">
        <Detail label="Name" value={`${hacker.firstName} ${hacker.lastName}`} />
        <Detail label="Date of birth" value={formatDMY(hacker.dateOfBirth)} />
        <Detail label="Nationality" value={nationalityLabel(hacker.nationality)} />
        <Detail label="Gender" value={hacker.genderIdentity} />
        <Detail label="Affiliation" value={hacker.occupationPlace} />
        <Detail label="Email" value={hacker.email} />
        <Detail label="Status" value={hacker.phone} />
        <Detail label="CHECK-IN CODE" value={userId} mono />
        <Detail label="A-" value={formatDMYHMS(hacker.acceptedAt)} />
        <Detail
          label="C-"
          value={formatDMYHMS(hacker.confirmedRsvpAt)}
        />
        <Detail label="Checked in" value={new Date(checkedInAt).toLocaleString()} />
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-white/50">{label}</span>
      <span
        className={`text-right font-medium text-white/90 break-all ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}
