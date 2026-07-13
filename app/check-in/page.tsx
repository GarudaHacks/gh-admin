"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, History, ScanLine, XCircle } from "lucide-react";
import QrScanner from "./QrScanner";
import { StepCard } from "./StepCard";
import { TeamConfirm } from "./TeamConfirm";
import { PhotoCapture } from "./PhotoCapture";
import { useCheckInFlow } from "./useCheckInFlow";
import { postCheckIn } from "./checkin-client";
import type {
  CheckInContext,
  CheckInResponse,
  CheckInTeam,
} from "@/lib/checkin-types";

// Sensible default before the first scan tells us who the hacker is. The flow
// re-filters its steps once `setContext` runs with the scanned hacker's facts.
const DEFAULT_CONTEXT: CheckInContext = {
  inTeam: false,
  joiningSpeedDating: false,
};

export default function CheckInPage() {
  const [context, setContext] = useState<CheckInContext>(DEFAULT_CONTEXT);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  // The team roster (mutable via the Confirm Team step), seeded from the scan.
  const [team, setTeam] = useState<CheckInTeam | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  // Guards against the camera firing the same code many times per second.
  const busyRef = useRef(false);

  const flow = useCheckInFlow(context);

  const handleScan = async (value: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setScanError(null);
    try {
      const data = await postCheckIn(value);
      if (!data.ok) {
        setScanError(data.reason);
        return;
      }
      setResult(data);
      setTeam(data.team);
      setContext(data.context); // re-filters the flow to this hacker
      flow.next(); // advance off the scan step
    } finally {
      busyRef.current = false;
    }
  };

  // reset for the next hacker
  const handleReset = () => {
    setResult(null);
    setTeam(null);
    setScanError(null);
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
                <QrScanner onScan={handleScan} paused={false} />
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

// Classify nationality to "Indonesian" / "Non" (or "—" when unknown).
function nationalityLabel(nationality: string): string {
  if (!nationality.trim()) return "—";
  return /indonesia/i.test(nationality) ? "Indonesian" : "Non";
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
        <Detail label="Email" value={hacker.email} />
        <Detail label="Phone" value={hacker.phone} />
        <Detail label="Gender" value={hacker.genderIdentity} />
        <Detail label="Date of birth" value={hacker.dateOfBirth} />
        <Detail label="Nationality" value={nationalityLabel(hacker.nationality)} />
        <Detail label="Affiliation" value={hacker.occupationPlace} />
        <Detail label="Occupation detail" value={hacker.occupationDetail} />
        <Detail label="Status" value={hacker.status} />
        <Detail label="Accepted at" value={formatDMYHMS(hacker.acceptedAt)} />
        <Detail
          label="Confirmed RSVP at"
          value={formatDMYHMS(hacker.confirmedRsvpAt)}
        />
        <Detail label="Checked in" value={new Date(checkedInAt).toLocaleString()} />
        <Detail label="UID" value={userId} mono />
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
