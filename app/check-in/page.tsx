"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ScanLine, XCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import QrScanner from "./QrScanner";
import { StepCard } from "./StepCard";
import { useCheckInFlow } from "./useCheckInFlow";
import type { CheckInContext, CheckInResponse } from "@/lib/checkin-types";

// Sensible default before the first scan tells us who the hacker is. The flow
// re-filters its steps once `setContext` runs with the scanned hacker's facts.
const DEFAULT_CONTEXT: CheckInContext = {
  inTeam: false,
  isUnderage: false,
  joiningSpeedDating: false,
};

export default function CheckInPage() {
  const [context, setContext] = useState<CheckInContext>(DEFAULT_CONTEXT);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  // Guards against the camera firing the same code many times per second.
  const busyRef = useRef(false);

  const flow = useCheckInFlow(context);

  const handleScan = async (value: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setScanError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setScanError("You must be signed in to check people in.");
        return;
      }
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: value }),
      });
      const data = (await res.json()) as CheckInResponse;
      if (!data.ok) {
        setScanError(data.reason);
        return;
      }
      setResult(data);
      setContext(data.context); // re-filters the flow to this hacker
      flow.next(); // advance off the scan step
    } catch {
      setScanError("Something went wrong. Try again.");
    } finally {
      busyRef.current = false;
    }
  };

  // reset for the next hacker
  const handleReset = () => {
    setResult(null);
    setScanError(null);
    setContext(DEFAULT_CONTEXT);
    busyRef.current = false;
    flow.reset();
  };

  return (
    <div className="min-h-screen text-white px-4 py-10">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-[#874ffe]" />
          <h1 className="text-xl font-semibold">Guided Check-In</h1>
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
          }}
        />
      </div>
    </div>
  );
}

function HackerSummary({
  result,
}: {
  result: Extract<CheckInResponse, { ok: true }>;
}) {
  const { hacker, alreadyCheckedIn, checkedInAt } = result;
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
        <CheckCircle2 className="h-4 w-4" />
        {alreadyCheckedIn ? "Already checked in" : "Checked in"}
      </p>
      <div className="mt-3 space-y-1">
        <Detail label="Name" value={`${hacker.firstName} ${hacker.lastName}`} />
        <Detail label="Email" value={hacker.email} />
        <Detail label="Status" value={hacker.status} />
        <Detail label="When" value={new Date(checkedInAt).toLocaleString()} />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-right font-medium text-white/90">{value || "—"}</span>
    </div>
  );
}
