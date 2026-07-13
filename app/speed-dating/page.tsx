"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllApplications,
  fetchAllUsers,
  fetchAllFormations,
  fetchAllTeams,
  markApplicationFoundTeam,
} from "@/lib/firebaseUtils";
import {
  FirestoreUser,
  TeamFormation,
  FirestoreTeam,
  APPLICATION_STATUS,
} from "@/lib/types";
import { allQuestionsData } from "@/data/question";

// Only participants who are in the event count: accepted or confirmed RSVP.
// Anyone rejected / still submitted / withdrawn is not looking for a team here.
const ELIGIBLE_STATUSES = new Set<string>([
  APPLICATION_STATUS.ACCEPTED,
  APPLICATION_STATUS.CONFIRMED_RSVP,
]);

// How many participant rows to reveal per lazy-load step.
const PAGE_SIZE = 40;

// --- Question-derived constants (kept in sync with data/question.ts) -------

const teamFormationOptions =
  (allQuestionsData.find((q) => q.id === "teamFormation") as
    | { options?: string[] }
    | undefined)?.options ?? [];

// The teamFormation answer that means "I want to look for a team via Speed Dating".
const SPEED_DATING_OPTION =
  teamFormationOptions.find((o) => /speed dating/i.test(o)) ?? "";

// The teamFormation answer we switch someone to once they've found a team.
const ALREADY_HAVE_TEAM_OPTION =
  teamFormationOptions.find((o) => /^yes/i.test(o)) ??
  "Yes, I already have a team";

// The primaryRole categories participants can be filtered by.
const PRIMARY_ROLE_OPTIONS =
  (allQuestionsData.find((q) => q.id === "primaryRole") as
    | { options?: string[] }
    | undefined)?.options ?? [];

// --- Types -----------------------------------------------------------------

// A team/formation a participant already belongs to (source of a warning).
interface MembershipRef {
  id: string;
  name: string; // team/formation display name (falls back to the id)
}

interface Participant {
  uid: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: string;
  status: string; // user status — always "accepted" or "confirmed rsvp" here
  primaryRole: string;
  roleProficiency: string;
  email: string;
  resolved: boolean; // whether a matching users/{uid} doc was found
  // Warnings: the participant opted into Speed Dating but is already placed.
  inFormation: MembershipRef | null;
  inTeam: MembershipRef | null;
}

// Alphabetical by full name; blank/unresolved names sort last.
const sortByName = (list: Participant[]) =>
  [...list].sort((a, b) =>
    (a.fullName || "￿").localeCompare(b.fullName || "￿")
  );

export default function SpeedDatingPage() {
  const { user } = useAuth();
  const editor = user?.email ?? "system";

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  // "all" | "warnings" — narrow to participants who are already placed.
  const [warningFilter, setWarningFilter] = useState<"all" | "warnings">("all");

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [copied, setCopied] = useState(false);

  // UIDs marked as "already found a team" this session (kept for instant UI).
  const [markedUids, setMarkedUids] = useState<Set<string>>(new Set());
  const [confirmingMark, setConfirmingMark] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Applications carry the Speed Dating opt + primaryRole; users carry the
      // profile (name/gender). Formations/teams tell us who is already placed.
      const [applications, users, formations, teams] = await Promise.all([
        fetchAllApplications(),
        fetchAllUsers().catch(() => [] as FirestoreUser[]),
        fetchAllFormations().catch(() => [] as TeamFormation[]),
        fetchAllTeams().catch(() => [] as FirestoreTeam[]),
      ]);

      const userMap = new Map<string, FirestoreUser>();
      users.forEach((u) => userMap.set(u.id, u));

      // uid -> the first formation / team that already contains them.
      const formationOf = new Map<string, MembershipRef>();
      for (const f of formations) {
        for (const uid of f.members) {
          if (!formationOf.has(uid)) {
            formationOf.set(uid, {
              id: f.id,
              name: f.teamName || f.id,
            });
          }
        }
      }
      const teamOf = new Map<string, MembershipRef>();
      for (const t of teams) {
        for (const uid of t.members ?? []) {
          if (!teamOf.has(uid)) {
            teamOf.set(uid, { id: t.id, name: t.name || t.id });
          }
        }
      }

      const list: Participant[] = applications
        .filter((a) => a.teamFormation === SPEED_DATING_OPTION)
        .map((a): Participant | null => {
          const u = userMap.get(a.id);
          // Only surface accepted / confirmed-RSVP participants.
          if (!u || !ELIGIBLE_STATUSES.has(u.status)) return null;
          const firstName = u.firstName ?? "";
          const lastName = u.lastName ?? "";
          const fullName = `${firstName} ${lastName}`.trim();
          return {
            uid: a.id,
            fullName,
            firstName,
            lastName,
            gender: u.genderIdentity ?? "",
            status: u.status,
            primaryRole: a.primaryRole ?? "",
            roleProficiency: a.roleProficiency ?? "",
            email: u.email ?? "",
            resolved: true,
            inFormation: formationOf.get(a.id) ?? null,
            inTeam: teamOf.get(a.id) ?? null,
          };
        })
        .filter((p): p is Participant => p !== null);

      const sorted = sortByName(list);
      setParticipants(sorted);
      setSelectedUid(sorted[0]?.uid ?? null);
    } catch (err) {
      console.error("Error loading speed dating participants:", err);
      setError("Failed to load Speed Dating participants. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = participants;

    if (roleFilter !== "all") {
      list = list.filter((p) => p.primaryRole === roleFilter);
    }

    if (warningFilter === "warnings") {
      list = list.filter((p) => p.inFormation || p.inTeam);
    }

    if (q) {
      list = list.filter((p) =>
        `${p.fullName} ${p.email} ${p.uid}`.toLowerCase().includes(q)
      );
    }

    return list;
  }, [participants, search, roleFilter, warningFilter]);

  const visible = filtered.slice(0, visibleCount);
  const selected = participants.find((p) => p.uid === selectedUid) ?? null;

  // How many participants carry at least one warning (for the header count).
  const warningCount = useMemo(
    () => participants.filter((p) => p.inFormation || p.inTeam).length,
    [participants]
  );

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setVisibleCount(PAGE_SIZE);
  };

  // Lazy loading: reveal another page when the sentinel scrolls into view.
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

  const copyUid = async (uid: string) => {
    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const handleMarkFoundTeam = async () => {
    if (!selected || marking) return;
    try {
      setMarking(true);
      const ok = await markApplicationFoundTeam(
        selected.uid,
        editor,
        ALREADY_HAVE_TEAM_OPTION
      );
      if (!ok) {
        toast.error("Failed to update entry");
        return;
      }
      setMarkedUids((prev) => new Set(prev).add(selected.uid));
      setConfirmingMark(false);
      toast.success(`${selected.fullName || selected.uid} marked as found team`);
    } catch (err) {
      console.error("Error marking found team:", err);
      toast.error("Failed to update entry");
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Speed Dating"
          subtitle="Participants looking for a team through Speed Dating."
        />
        <LoadingSpinner text="Loading Speed Dating participants..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Speed Dating"
          subtitle="Participants looking for a team through Speed Dating."
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
        title="Speed Dating"
        subtitle="Accepted / confirmed-RSVP participants who opted to look for a team through Speed Dating. Rows are flagged when someone is already in a formation or team."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
        {/* List + filters */}
        <div className="lg:col-span-5">
          <div className="card flex flex-col h-[70vh] lg:h-[calc(100vh-16rem)]">
            <div className="p-4 border-b border-white/10 flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Participants ({participants.length})
                </h3>
                {warningCount > 0 && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                    ⚠ {warningCount} already placed
                  </span>
                )}
              </div>
              <input
                onChange={onSearchChange}
                value={search}
                className="input w-full"
                type="text"
                placeholder="Search by name, email, or UID…"
              />
              <div className="flex gap-2">
                <label className="flex-1 flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-white/50">Primary role</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className="input w-full text-sm"
                  >
                    <option value="all">All roles</option>
                    {PRIMARY_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex-1 flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-white/50">Show</span>
                  <select
                    value={warningFilter}
                    onChange={(e) => {
                      setWarningFilter(e.target.value as "all" | "warnings");
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className="input w-full text-sm"
                  >
                    <option value="all">Everyone</option>
                    <option value="warnings">Already placed only</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/60">Sorted by name (A–Z).</p>
                <span className="text-xs text-white/60 whitespace-nowrap ml-2">
                  {filtered.length} shown
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-white/70">
                  No participants found
                </div>
              ) : (
                <>
                  {visible.map((p) => {
                    const marked = markedUids.has(p.uid);
                    const hasWarning = !marked && (p.inFormation || p.inTeam);
                    return (
                      <button
                        key={p.uid}
                        onClick={() => setSelectedUid(p.uid)}
                        className={`w-full text-left p-4 border-b border-white/10 cursor-pointer transition-colors hover:bg-white/5 ${
                          selectedUid === p.uid
                            ? "bg-primary/10 border-primary/30"
                            : ""
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3 mb-1">
                          <h4 className="font-medium text-sm text-white truncate">
                            {p.resolved ? (
                              p.fullName || "(no name)"
                            ) : (
                              <span className="text-white/60 italic">
                                Unknown user
                              </span>
                            )}
                          </h4>
                          <div className="shrink-0 flex items-center gap-1">
                            {marked && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                                ✓ Found team
                              </span>
                            )}
                            {hasWarning && (
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40"
                                title={warningTitle(p)}
                              >
                                ⚠{" "}
                                {p.inFormation && p.inTeam
                                  ? "In formation + team"
                                  : p.inFormation
                                  ? "In formation"
                                  : "In team"}
                              </span>
                            )}
                          </div>
                        </div>
                        {p.primaryRole && (
                          <p className="text-xs text-accent-accessible truncate">
                            {p.primaryRole}
                          </p>
                        )}
                        <p className="text-xs text-white/40 font-mono truncate">
                          {p.uid}
                        </p>
                      </button>
                    );
                  })}
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
        </div>

        {/* Detail */}
        <div className="lg:col-span-7 lg:sticky lg:top-6 lg:self-start">
          {!selected ? (
            <div className="card p-10 text-center text-white/60">
              Select a participant to view their details.
            </div>
          ) : (
            <ParticipantDetail
              participant={selected}
              marked={markedUids.has(selected.uid)}
              copied={copied}
              onCopyUid={() => copyUid(selected.uid)}
              onMarkFoundTeam={() => setConfirmingMark(true)}
            />
          )}
        </div>
      </div>

      {/* Confirm "already found a team" */}
      {confirmingMark && selected && (
        <ConfirmDialog
          title={`Mark ${selected.fullName || selected.uid} as found team?`}
          description={`This rewrites their application's team answer to "${ALREADY_HAVE_TEAM_OPTION}", so they drop out of the Speed Dating pool on the next reload. Use this when they are already in a ${
            selected.inFormation && selected.inTeam
              ? "formation and a team"
              : selected.inFormation
              ? "formation"
              : "team"
          }.`}
          confirmLabel={marking ? "Updating…" : "Mark as found team"}
          loading={marking}
          onConfirm={handleMarkFoundTeam}
          onCancel={() => setConfirmingMark(false)}
        />
      )}
    </div>
  );
}

// Prettify a raw status string, e.g. "confirmed rsvp" -> "Confirmed RSVP".
function formatStatus(status: string): string {
  if (!status) return "—";
  return status
    .split(" ")
    .map((w) => (w.toLowerCase() === "rsvp" ? "RSVP" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// Tooltip text summarizing where a participant is already placed.
function warningTitle(p: Participant): string {
  const parts: string[] = [];
  if (p.inFormation) parts.push(`Formation: ${p.inFormation.name}`);
  if (p.inTeam) parts.push(`Team: ${p.inTeam.name}`);
  return parts.join(" · ");
}

function ParticipantDetail({
  participant: p,
  marked,
  copied,
  onCopyUid,
  onMarkFoundTeam,
}: {
  participant: Participant;
  marked: boolean;
  copied: boolean;
  onCopyUid: () => void;
  onMarkFoundTeam: () => void;
}) {
  const hasWarning = Boolean(p.inFormation || p.inTeam);

  return (
    <div className="card p-6 space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-white">
            {p.resolved ? (
              p.fullName || "(no name)"
            ) : (
              <span className="text-white/60 italic">Unknown user</span>
            )}
          </h2>
          {marked && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
              ✓ Found team
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onCopyUid}
          className="mt-2 inline-flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white/80 transition-colors min-w-0 max-w-full"
          title="Copy UID"
        >
          <span className="truncate">{p.uid}</span>
          <span className="text-white/40 shrink-0">
            {copied ? "✓ copied" : "⧉"}
          </span>
        </button>
      </div>

      {/* Warnings */}
      {hasWarning && !marked && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-200">
            ⚠ Already placed but opted into Speed Dating
          </p>
          <ul className="space-y-1 text-sm text-amber-100/90">
            {p.inFormation && (
              <li>
                Exists in <span className="font-semibold">formations</span> —{" "}
                <span className="font-medium">{p.inFormation.name}</span>{" "}
                <span className="font-mono text-amber-200/70 text-xs">
                  ({p.inFormation.id})
                </span>
              </li>
            )}
            {p.inTeam && (
              <li>
                Exists in <span className="font-semibold">teams</span> —{" "}
                <span className="font-medium">{p.inTeam.name}</span>{" "}
                <span className="font-mono text-amber-200/70 text-xs">
                  ({p.inTeam.id})
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-2 gap-4 text-sm border-y border-white/10 py-4">
        <DetailCell label="Full name" value={p.fullName || "—"} />
        <DetailCell label="Status" value={formatStatus(p.status)} />
        <DetailCell label="Gender" value={p.gender || "—"} />
        <DetailCell label="Primary role" value={p.primaryRole || "—"} />
        <DetailCell label="Proficiency" value={p.roleProficiency || "—"} />
        <DetailCell label="Email" value={p.email || "—"} />
        <DetailCell label="UID" value={p.uid} mono />
      </div>

      {/* Actions */}
      {hasWarning &&
        (marked ? (
          <p className="text-sm text-emerald-300/90">
            Marked as already found a team. They will drop out of the Speed
            Dating pool on the next reload.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-white/60">
              They already belong to a{" "}
              {p.inFormation && p.inTeam
                ? "formation and a team"
                : p.inFormation
                ? "formation"
                : "team"}
              .
            </p>
            <button
              type="button"
              onClick={onMarkFoundTeam}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-emerald-300 bg-emerald-600/10 border border-emerald-600/40 hover:bg-emerald-600/20 transition-colors"
            >
              Mark as found team
            </button>
          </div>
        ))}
    </div>
  );
}

function DetailCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-white/50 mb-0.5">{label}</p>
      <p className={`text-white/90 break-words ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}
