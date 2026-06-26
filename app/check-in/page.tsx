"use client";

import { useRef, useState } from "react";
import { CheckCircle2, XCircle, ScanLine, RotateCcw } from "lucide-react";
import { auth } from "@/lib/firebase";
import QrScanner from "./QrScanner";
import type { CheckInResponse } from "@/lib/checkin-types";

type Status = "scanning" | "checking" | "done";

export default function CheckInPage() {
  const [status, setStatus] = useState<Status>("scanning");
  const [result, setResult] = useState<CheckInResponse | null>(null);
  // Guards against the camera firing the same code many times per second.
  const busyRef = useRef(false);

  const handleScan = async (value: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus("checking");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setResult({ ok: false, reason: "You must be signed in to check people in." });
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
      setResult((await res.json()) as CheckInResponse);
    } catch {
      setResult({ ok: false, reason: "Something went wrong. Try again." });
    } finally {
      setStatus("done");
    }
  };

  const reset = () => {
    setResult(null);
    setStatus("scanning");
    busyRef.current = false;
  };

  return (
    <div className="min-h-screen text-white px-4 py-10">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-[#874ffe]" />
          <h1 className="text-xl font-semibold">Check-In Scanner</h1>
        </header>

        {status !== "done" && (
          <>
            <QrScanner onScan={handleScan} paused={status === "checking"} />
            <p className="mt-3 text-center text-sm text-white/50">
              {status === "checking"
                ? "Validating…"
                : "Point the camera at an hacker's boarding pass QR."}
            </p>
          </>
        )}

        {status === "done" && result && (
          <ResultCard result={result} onReset={reset} />
        )}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  onReset,
}: {
  result: CheckInResponse;
  onReset: () => void;
}) {
  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-400" />
        <p className="mt-3 text-lg font-semibold text-red-200">Invalid code</p>
        <p className="mt-1 text-sm text-red-200/70">{result.reason}</p>
        <ResetButton onReset={onReset} />
      </div>
    );
  }

  const { hacker: hacker, alreadyCheckedIn, checkedInAt } = result;
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
      <p className="mt-3 text-lg font-semibold text-emerald-100">
        {alreadyCheckedIn ? "Already checked in" : "Checked in!"}
      </p>

      <div className="mt-4 rounded-xl bg-black/20 p-4 text-left">
        <Detail label="Name" value={`${hacker.firstName} ${hacker.lastName}`} />
        <Detail label="Email" value={hacker.email} />
        <Detail label="Status" value={hacker.status} />
        <Detail
          label={alreadyCheckedIn ? "First checked in" : "Checked in at"}
          value={new Date(checkedInAt).toLocaleString()}
        />
      </div>

      <ResetButton onReset={onReset} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-right font-medium text-white/90">{value || "—"}</span>
    </div>
  );
}

function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      onClick={onReset}
      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#874ffe] px-4 py-2 text-sm font-medium text-white hover:bg-[#7440e0]"
    >
      <RotateCcw className="h-4 w-4" />
      Scan next
    </button>
  );
}
