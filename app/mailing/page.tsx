"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import { auth } from "@/lib/firebase";

interface Candidate {
  uid: string;
  name: string;
  email: string;
  occupationPlace: string;
  leaveLetterUrl: string | null;
  leaveLetterGeneratedAt: number | null;
  leaveLetterSentAt: number | null;
}

function formatTimestamp(millis: number | null): string {
  if (!millis) return "—";
  return new Date(millis).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Build auth headers with the current admin's Firebase ID token; the API
// routes require a verified @garudahacks.com session.
async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MailingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // uids currently being sent (per-row + bulk) so buttons can show progress.
  const [sending, setSending] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dispensation-letters", {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to load");
      setCandidates(data.candidates as Candidate[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  // Only users with a generated letter can actually be emailed.
  const sendableUids = useMemo(
    () => candidates.filter((c) => c.leaveLetterUrl).map((c) => c.uid),
    [candidates]
  );

  const selectableSelected = useMemo(
    () => [...selected].filter((uid) => sendableUids.includes(uid)),
    [selected, sendableUids]
  );

  const allSelected =
    sendableUids.length > 0 && sendableUids.every((uid) => selected.has(uid));

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(sendableUids));
  };

  const toggleSelect = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  // Apply a fresh leaveLetterSentAt locally so the UI flips to "Re-send"
  // without a full refetch.
  const markSent = (uids: string[]) => {
    const now = Date.now();
    setCandidates((prev) =>
      prev.map((c) =>
        uids.includes(c.uid) ? { ...c, leaveLetterSentAt: now } : c
      )
    );
  };

  const sendOne = async (uid: string) => {
    setSending((prev) => new Set(prev).add(uid));
    try {
      const res = await fetch("/api/dispensation-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to send");
      markSent([uid]);
      toast.success("Dispensation letter sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    }
  };

  const sendBulk = async () => {
    const uids = selectableSelected;
    if (uids.length === 0) return;
    setBulkSending(true);
    try {
      const res = await fetch("/api/dispensation-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ uids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to send");

      const failedUids: string[] = (data.failures ?? []).map(
        (f: { uid: string }) => f.uid
      );
      const succeededUids = uids.filter((uid) => !failedUids.includes(uid));
      markSent(succeededUids);

      if (data.failed > 0) {
        toast.error(`Sent ${data.succeeded}, ${data.failed} failed`);
      } else {
        toast.success(`Sent ${data.succeeded} dispensation letter(s)`);
      }
      // Keep any that failed selected so they can be retried.
      setSelected(new Set(failedUids));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Mailing"
        subtitle="Send dispensation (leave) letters to confirmed-RSVP participants who requested one."
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          {error}
          <button
            onClick={loadCandidates}
            className="ml-3 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-muted-foreground">
              {candidates.length} requester(s) · {sendableUids.length} ready to send
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={loadCandidates}
                className="px-3 py-2 text-sm rounded-lg border border-border text-primary-foreground hover:bg-white/10 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={sendBulk}
                disabled={bulkSending || selectableSelected.length === 0}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                {bulkSending
                  ? "Sending…"
                  : `Send selected (${selectableSelected.length})`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-background-secondary text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={sendableUids.length === 0}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Occupation Place</th>
                  <th className="px-4 py-3 text-left">Letter</th>
                  <th className="px-4 py-3 text-left">Generated</th>
                  <th className="px-4 py-3 text-left">Last Sent</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No confirmed-RSVP participants have requested a dispensation
                      letter.
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => {
                    const isSending = sending.has(c.uid);
                    const hasUrl = Boolean(c.leaveLetterUrl);
                    const alreadySent = Boolean(c.leaveLetterSentAt);
                    return (
                      <tr
                        key={c.uid}
                        className="border-t border-border text-primary-foreground"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(c.uid)}
                            onChange={() => toggleSelect(c.uid)}
                            disabled={!hasUrl}
                            aria-label={`Select ${c.name}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{c.name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.email || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.occupationPlace || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {hasUrl ? (
                            <a
                              href={c.leaveLetterUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline hover:no-underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-yellow-500">
                              Not generated
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatTimestamp(c.leaveLetterGeneratedAt)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatTimestamp(c.leaveLetterSentAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => sendOne(c.uid)}
                            disabled={!hasUrl || isSending}
                            title={
                              !hasUrl
                                ? "Letter has not been generated yet"
                                : undefined
                            }
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                              alreadySent
                                ? "border border-border text-primary-foreground hover:bg-white/10"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          >
                            {isSending
                              ? "Sending…"
                              : alreadySent
                                ? "Re-send"
                                : "Send"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
