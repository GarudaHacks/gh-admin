"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import SignedImage from "@/components/SignedImage";
import { fetchCheckInHistory } from "../checkin-client";
import type { CheckInHistoryEntry } from "@/lib/checkin-types";

// Rows revealed per lazy-load step (images inside sign lazily too).
const PAGE_SIZE = 40;

// dd/mm/yyyy HH:mm:ss (24h) from an ISO string, or "—".
function formatDMYHMS(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function CheckInHistoryPage() {
  const [entries, setEntries] = useState<CheckInHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCheckInHistory();
      if (!res.ok) {
        setError(res.reason);
        return;
      }
      setEntries(res.history);
      setVisibleCount(PAGE_SIZE);
    } catch {
      setError("Failed to load check-in history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      `${e.name} ${e.email} ${e.teamName ?? ""} ${e.uid}`
        .toLowerCase()
        .includes(q)
    );
  }, [entries, search]);

  const visible = filtered.slice(0, visibleCount);

  // Lazy list: reveal another page as the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (obsEntries) => {
        if (obsEntries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <PageHeader
          title="Check-in History"
          subtitle="Everyone who has checked in, most recent first."
        />
        <Link
          href="/check-in"
          className="mt-8 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to check-in
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading check-in history..." />
      ) : error ? (
        <div className="card p-6 text-center">
          <div className="text-destructive mb-4">{error}</div>
          <button onClick={load} className="btn-primary">
            Retry
          </button>
        </div>
      ) : (
        <div className="card flex flex-col h-[calc(100vh-14rem)]">
          <div className="p-4 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="input flex-1"
              type="text"
              placeholder="Search name, email, team, or UID…"
            />
            <span className="inline-flex items-center gap-1.5 text-xs text-white/60 whitespace-nowrap">
              <Users className="h-4 w-4" />
              {filtered.length} checked in
            </span>
            <button
              onClick={load}
              className="shrink-0 rounded-lg border border-white/15 bg-white/5 p-2 text-white/70 hover:bg-white/10 transition-colors"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-white/60">
                No check-ins found.
              </div>
            ) : (
              <>
                {visible.map((e) => (
                  <div
                    key={e.uid}
                    className="flex items-center gap-4 p-3 border-b border-white/10"
                  >
                    {e.photoUrl ? (
                      <SignedImage
                        src={e.photoUrl}
                        alt={e.name}
                        enableLightbox
                        className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/40">
                        no photo
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {e.name}
                      </p>
                      <p className="truncate text-xs text-white/50">
                        {e.email || e.uid}
                      </p>
                      {e.teamName && (
                        <span className="mt-1 inline-block max-w-full truncate rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                          {e.teamName}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 text-right text-xs text-white/60">
                      {formatDMYHMS(e.checkedInAt)}
                    </div>
                  </div>
                ))}
                <div ref={sentinelRef} />
                <div className="p-3 text-center text-xs text-white/40">
                  {visibleCount < filtered.length
                    ? `Showing ${visible.length} of ${filtered.length}…`
                    : `All ${filtered.length} shown`}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
