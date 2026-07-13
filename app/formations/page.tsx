"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  fetchAllFormations,
  fetchAllUsers,
  formatApplicationDate,
} from "@/lib/firebaseUtils";
import { TeamFormation, FirestoreUser } from "@/lib/types";

// How many team cards to reveal per lazy-load step.
const PAGE_SIZE = 30;

// Resolved user info we surface for each member UID.
interface MemberInfo {
  uid: string;
  name: string; // full name, or the UID if we couldn't resolve one
  email: string;
  resolved: boolean; // whether a matching users/{uid} doc was found
}

export default function FormationPage() {
  const [formations, setFormations] = useState<TeamFormation[]>([]);
  const [userMap, setUserMap] = useState<Map<string, FirestoreUser>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Formations are required; user enrichment (names/emails for member UIDs)
      // is best-effort so a slow/failed users read never blocks the list.
      const [formationsData, users] = await Promise.all([
        fetchAllFormations(),
        fetchAllUsers().catch(() => [] as FirestoreUser[]),
      ]);

      const map = new Map<string, FirestoreUser>();
      users.forEach((u) => map.set(u.id, u));

      setFormations(formationsData);
      setUserMap(map);
      setSelectedId(formationsData[0]?.id ?? null);
    } catch (err) {
      console.error("Error loading formations:", err);
      setError("Failed to load team formations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resolve a member UID to a display name / email via the users map.
  const resolveMember = useCallback(
    (uid: string): MemberInfo => {
      const u = userMap.get(uid);
      const name = u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "";
      return {
        uid,
        name: name || uid,
        email: u?.email ?? "",
        resolved: Boolean(u),
      };
    },
    [userMap]
  );

  // Precompute a lowercase search haystack per team: id + name + every member's
  // UID, resolved name and email. Rebuilt only when data changes.
  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of formations) {
      const memberText = f.members
        .map((uid) => {
          const m = resolveMember(uid);
          return `${m.uid} ${m.name} ${m.email}`;
        })
        .join(" ");
      map.set(f.id, `${f.id} ${f.teamName} ${memberText}`.toLowerCase());
    }
    return map;
  }, [formations, resolveMember]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return formations;
    return formations.filter((f) => haystacks.get(f.id)?.includes(q));
  }, [search, formations, haystacks]);

  const visible = filtered.slice(0, visibleCount);
  const selected = formations.find((f) => f.id === selectedId) ?? null;

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setVisibleCount(PAGE_SIZE); // restart lazy paging for the new result set
  };

  // Lazy loading: reveal another page whenever the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  const copyTeamId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Team Formation"
          subtitle="Displays all team formations. All solo users (speed dating or not) are treated as Team as well."
        />
        <LoadingSpinner text="Loading team formations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Team Formation"
          subtitle="Displays all team formations. All solo users (speed dating or not) are treated as Team as well."
        />
        <div className="card p-6 text-center">
          <div className="text-destructive mb-4">{error}</div>
          <button onClick={loadData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Formation"
        subtitle="Displays all team formations. All solo users (speed dating or not) are treated as Team as well."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
        {/* List + search */}
        <div className="lg:col-span-5">
          <div className="card flex flex-col h-[70vh] lg:h-[calc(100vh-16rem)]">
            <div className="p-4 border-b border-white/10 flex flex-col gap-2 flex-shrink-0">
              <input
                onChange={onSearchChange}
                value={search}
                className="input w-full"
                type="text"
                placeholder="Search teams…"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/60">
                  Search by team ID, team name, or member (UID, name, email).
                </p>
                <span className="text-xs text-white/60 whitespace-nowrap ml-2">
                  {filtered.length} team{filtered.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-white/70">
                  No teams found
                </div>
              ) : (
                <>
                  {visible.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedId(team.id)}
                      className={`w-full text-left p-4 border-b border-white/10 cursor-pointer transition-colors hover:bg-white/5 ${
                        selectedId === team.id
                          ? "bg-primary/10 border-primary/30"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <h4 className="font-medium text-sm text-white truncate">
                          {team.teamName || "(unnamed team)"}
                        </h4>
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/20">
                          {team.members.length} member
                          {team.members.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 font-mono truncate">
                        {team.id}
                      </p>
                    </button>
                  ))}
                  {/* Sentinel: intersecting it reveals the next page. */}
                  <div ref={sentinelRef} />
                  <div className="p-3 text-center text-xs text-white/40">
                    {visibleCount < filtered.length
                      ? `Showing ${visible.length} of ${filtered.length}…`
                      : `All ${filtered.length} team${
                          filtered.length === 1 ? "" : "s"
                        } shown`}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-7 lg:sticky lg:top-6 lg:self-start">
          {!selected ? (
            <div className="card p-10 text-center text-white/60">
              Select a team to view its details.
            </div>
          ) : (
            <div className="card p-6 space-y-6">
              <div>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-white">
                    {selected.teamName || "(unnamed team)"}
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-accent-accessible border border-primary/40">
                    {selected.members.length} member
                    {selected.members.length === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyTeamId(selected.id)}
                  className="mt-2 inline-flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white/80 transition-colors"
                  title="Copy team ID"
                >
                  <span className="truncate">{selected.id}</span>
                  <span className="text-white/40">{copied ? "✓ copied" : "⧉"}</span>
                </button>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-y border-white/10 py-4">
                <MetaCell label="Version" value={selected.version || "—"} />
                <MetaCell label="Updated by" value={selected.updatedBy || "—"} />
                <MetaCell
                  label="Created"
                  value={
                    selected.createdAt
                      ? formatApplicationDate(selected.createdAt)
                      : "—"
                  }
                />
                <MetaCell
                  label="Updated"
                  value={
                    selected.updatedAt
                      ? formatApplicationDate(selected.updatedAt)
                      : "—"
                  }
                />
              </div>

              {/* Members */}
              <div>
                <h3 className="font-semibold text-white mb-3 text-sm border-b border-white/10 pb-1">
                  Members ({selected.members.length})
                </h3>
                {selected.members.length === 0 ? (
                  <p className="text-white/50 text-sm">No members listed.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.members.map((uid, i) => {
                      const m = resolveMember(uid);
                      return (
                        <li
                          key={`${uid}-${i}`}
                          className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-accent-accessible text-xs font-semibold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">
                              {m.resolved ? (
                                m.name
                              ) : (
                                <span className="text-white/60 italic">
                                  Unknown user
                                </span>
                              )}
                            </p>
                            {m.email && (
                              <p className="text-xs text-white/50 truncate">
                                {m.email}
                              </p>
                            )}
                            <p className="text-xs text-white/40 font-mono truncate">
                              {uid}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/50 mb-0.5">{label}</p>
      <p className="text-white/90 break-words">{value}</p>
    </div>
  );
}
