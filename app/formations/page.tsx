"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllFormations,
  fetchAllUsers,
  fetchAllTeams,
  formatApplicationDate,
  createFormation,
  moveFormationMember,
  addFormationMember,
  deleteFormation,
} from "@/lib/firebaseUtils";
import { TeamFormation, FirestoreUser, FirestoreTeam } from "@/lib/types";

// How many team cards to reveal per lazy-load step.
const PAGE_SIZE = 30;
// A team is "full" (can't receive more members) at this size.
const MAX_TEAM_SIZE = 4;

// Resolved user info we surface for each member UID.
interface MemberInfo {
  uid: string;
  name: string; // full name, or the UID if we couldn't resolve one
  email: string;
  resolved: boolean; // whether a matching users/{uid} doc was found
}

// Alphabetical by team name (matches fetchAllFormations); unnamed teams sort last.
const sortByName = (list: TeamFormation[]) =>
  [...list].sort((a, b) =>
    (a.teamName || "￿").localeCompare(b.teamName || "￿")
  );

export default function FormationPage() {
  const { user } = useAuth();
  const [formations, setFormations] = useState<TeamFormation[]>([]);
  const [userMap, setUserMap] = useState<Map<string, FirestoreUser>>(new Map());
  // UIDs that appear in the mobile-app `teams` collection (any team's members).
  const [mobileMemberSet, setMobileMemberSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Filter by exact member count ("all", "notfull", or "0".."4") and sort order.
  const [countFilter, setCountFilter] = useState<string>("all");
  // Optionally narrow to formations that don't match the mobile-app teams.
  const [mismatchOnly, setMismatchOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "members-desc" | "members-asc">(
    "name"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [copied, setCopied] = useState(false);

  // Add-team modal.
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  // Move-member modal.
  const [movingMember, setMovingMember] = useState<{
    uid: string;
    fromTeamId: string;
  } | null>(null);
  const [moveSearch, setMoveSearch] = useState("");
  const [moveBusy, setMoveBusy] = useState(false);

  // Delete-team confirmation.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add-member (from the users pool) modal.
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [addBusyUid, setAddBusyUid] = useState<string | null>(null);
  // A picked user who already belongs to another team: warn + offer to move.
  const [pendingMove, setPendingMove] = useState<{
    uid: string;
    name: string;
    fromTeamId: string;
    fromTeamName: string;
  } | null>(null);

  const editor = user?.email ?? "system";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Formations are required; user enrichment (names/emails) and the mobile
      // `teams` cross-check are best-effort so a slow/failed read never blocks.
      const [formationsData, users, teams] = await Promise.all([
        fetchAllFormations(),
        fetchAllUsers().catch(() => [] as FirestoreUser[]),
        fetchAllTeams().catch(() => [] as FirestoreTeam[]),
      ]);

      const map = new Map<string, FirestoreUser>();
      users.forEach((u) => map.set(u.id, u));

      const mobileSet = new Set<string>();
      teams.forEach((t) => (t.members ?? []).forEach((uid) => mobileSet.add(uid)));

      setFormations(formationsData);
      setUserMap(map);
      setMobileMemberSet(mobileSet);
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

  // A member of a multi-person formation who hasn't joined any mobile-app team.
  // Solo formations don't need a mobile team, so they're never flagged; and if
  // there are no mobile teams at all we skip the check entirely (nothing to
  // compare against — avoids flagging everyone before mobile teams exist).
  const missingFromMobile = useCallback(
    (f: TeamFormation): string[] =>
      mobileMemberSet.size > 0 && f.members.length > 1
        ? f.members.filter((uid) => !mobileMemberSet.has(uid))
        : [],
    [mobileMemberSet]
  );
  const hasMobileMismatch = useCallback(
    (f: TeamFormation): boolean => missingFromMobile(f).length > 0,
    [missingFromMobile]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = formations;

    if (q) list = list.filter((f) => haystacks.get(f.id)?.includes(q));

    if (countFilter !== "all") {
      list = list.filter((f) => {
        const n = f.members.length;
        if (countFilter === "notfull") return n < MAX_TEAM_SIZE;
        return n === Number(countFilter);
      });
    }

    if (mismatchOnly) list = list.filter((f) => hasMobileMismatch(f));

    // Sort is stable, so member-count ties keep the underlying alphabetical order.
    if (sortBy === "name") {
      list = sortByName(list);
    } else {
      list = [...list].sort((a, b) =>
        sortBy === "members-desc"
          ? b.members.length - a.members.length
          : a.members.length - b.members.length
      );
    }

    return list;
  }, [search, formations, haystacks, countFilter, sortBy, mismatchOnly, hasMobileMismatch]);

  const visible = filtered.slice(0, visibleCount);
  const selected = formations.find((f) => f.id === selectedId) ?? null;

  // Which team (if any) each UID currently belongs to — used to warn when adding
  // someone who's already on another formation.
  const memberTeamOf = useMemo(() => {
    const map = new Map<string, TeamFormation>();
    for (const f of formations) {
      for (const uid of f.members) if (!map.has(uid)) map.set(uid, f);
    }
    return map;
  }, [formations]);

  // Every UID that belongs to some formation — used to find the reverse
  // discrepancy: people in a mobile-app team but in no formation at all.
  const formationMemberSet = useMemo(() => {
    const set = new Set<string>();
    for (const f of formations) for (const uid of f.members) set.add(uid);
    return set;
  }, [formations]);

  const mobileOnlyMembers = useMemo(
    () => [...mobileMemberSet].filter((uid) => !formationMemberSet.has(uid)),
    [mobileMemberSet, formationMemberSet]
  );

  const mismatchCount = useMemo(
    () => formations.filter((f) => hasMobileMismatch(f)).length,
    [formations, hasMobileMismatch]
  );

  // The user pool to add from (everyone, not just people already on a team).
  const usersList = useMemo(() => [...userMap.values()], [userMap]);

  // Candidates for the add-member search: users matching the query who aren't
  // already on the selected team. Capped for rendering.
  const addCandidates = useMemo(() => {
    if (!selected) return [];
    const q = addMemberSearch.trim().toLowerCase();
    if (!q) return [];
    const current = new Set(selected.members);
    return usersList
      .filter((u) => !current.has(u.id))
      .filter((u) =>
        `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email ?? ""} ${u.id}`
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 25);
  }, [selected, addMemberSearch, usersList]);

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

  // Eligible destinations for the member being moved: any other team not full.
  const moveTargets = useMemo(() => {
    if (!movingMember) return [];
    const q = moveSearch.trim().toLowerCase();
    return formations
      .filter(
        (f) =>
          f.id !== movingMember.fromTeamId && f.members.length < MAX_TEAM_SIZE
      )
      .filter((f) => !q || `${f.id} ${f.teamName}`.toLowerCase().includes(q));
  }, [formations, movingMember, moveSearch]);

  const handleCreateTeam = async () => {
    const name = newTeamName.trim();
    if (!name || creating) return;
    try {
      setCreating(true);
      const created = await createFormation(name, editor);
      setFormations((prev) => sortByName([created, ...prev]));
      setSearch(""); // make sure the new team is visible in the list
      setVisibleCount(PAGE_SIZE);
      setSelectedId(created.id);
      setShowAddModal(false);
      setNewTeamName("");
      toast.success(`Created "${name}"`);
    } catch (err) {
      console.error("Error creating team:", err);
      toast.error("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const handleMoveMember = async (toTeamId: string) => {
    if (!movingMember || moveBusy) return;
    const { uid, fromTeamId } = movingMember;
    const toTeam = formations.find((f) => f.id === toTeamId);
    if (!toTeam) return;
    if (toTeam.members.length >= MAX_TEAM_SIZE) {
      toast.error("That team is already full");
      return;
    }
    try {
      setMoveBusy(true);
      const ok = await moveFormationMember(fromTeamId, toTeamId, uid, editor);
      if (!ok) {
        toast.error("Failed to move member");
        return;
      }
      const now = new Date();
      setFormations((prev) =>
        prev.map((f) => {
          if (f.id === fromTeamId) {
            return {
              ...f,
              members: f.members.filter((m) => m !== uid),
              updatedAt: now,
              updatedBy: editor,
            };
          }
          if (f.id === toTeamId) {
            return {
              ...f,
              members: f.members.includes(uid)
                ? f.members
                : [...f.members, uid],
              updatedAt: now,
              updatedBy: editor,
            };
          }
          return f;
        })
      );
      toast.success(`Moved to ${toTeam.teamName || toTeam.id}`);
      setMovingMember(null);
      setMoveSearch("");
    } catch (err) {
      console.error("Error moving member:", err);
      toast.error("Failed to move member");
    } finally {
      setMoveBusy(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selected || deleting) return;
    const { id, teamName } = selected;
    try {
      setDeleting(true);
      const ok = await deleteFormation(id);
      if (!ok) {
        toast.error("Failed to delete team");
        return;
      }
      const remaining = formations.filter((f) => f.id !== id);
      setFormations(remaining);
      // Move the selection to the next nearest team, if any.
      if (selectedId === id) {
        const idx = formations.findIndex((f) => f.id === id);
        setSelectedId(remaining[idx]?.id ?? remaining[idx - 1]?.id ?? null);
      }
      setConfirmingDelete(false);
      toast.success(`Deleted "${teamName || id}"`);
    } catch (err) {
      console.error("Error deleting team:", err);
      toast.error("Failed to delete team");
    } finally {
      setDeleting(false);
    }
  };

  const closeAddMember = () => {
    setAddingMember(false);
    setAddMemberSearch("");
    setPendingMove(null);
  };

  // Add locally: append the uid to the selected team and stamp it.
  const applyLocalAdd = (teamId: string, uid: string, now: Date) =>
    setFormations((prev) =>
      prev.map((f) =>
        f.id === teamId
          ? {
              ...f,
              members: f.members.includes(uid) ? f.members : [...f.members, uid],
              updatedAt: now,
              updatedBy: editor,
            }
          : f
      )
    );

  // Pick a user from the pool. If they're already on another team, defer to a
  // move confirmation instead of silently duplicating them.
  const handleAddMember = async (u: FirestoreUser) => {
    if (!selected || addBusyUid) return;
    if (selected.members.length >= MAX_TEAM_SIZE) {
      toast.error("Team is full (max 4)");
      return;
    }
    const existing = memberTeamOf.get(u.id);
    if (existing && existing.id !== selected.id) {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id;
      setPendingMove({
        uid: u.id,
        name,
        fromTeamId: existing.id,
        fromTeamName: existing.teamName || existing.id,
      });
      return;
    }

    try {
      setAddBusyUid(u.id);
      const ok = await addFormationMember(selected.id, u.id, editor);
      if (!ok) {
        toast.error("Failed to add member");
        return;
      }
      applyLocalAdd(selected.id, u.id, new Date());
      toast.success("Member added");
      setAddMemberSearch("");
    } catch (err) {
      console.error("Error adding member:", err);
      toast.error("Failed to add member");
    } finally {
      setAddBusyUid(null);
    }
  };

  // Confirmed moving a user off their existing team onto the selected one.
  const handleConfirmMoveInto = async () => {
    if (!selected || !pendingMove || addBusyUid) return;
    if (selected.members.length >= MAX_TEAM_SIZE) {
      toast.error("Team is full (max 4)");
      return;
    }
    const { uid, fromTeamId, name } = pendingMove;
    try {
      setAddBusyUid(uid);
      const ok = await moveFormationMember(fromTeamId, selected.id, uid, editor);
      if (!ok) {
        toast.error("Failed to move member");
        return;
      }
      const now = new Date();
      setFormations((prev) =>
        prev.map((f) => {
          if (f.id === fromTeamId) {
            return {
              ...f,
              members: f.members.filter((m) => m !== uid),
              updatedAt: now,
              updatedBy: editor,
            };
          }
          if (f.id === selected.id) {
            return {
              ...f,
              members: f.members.includes(uid) ? f.members : [...f.members, uid],
              updatedAt: now,
              updatedBy: editor,
            };
          }
          return f;
        })
      );
      toast.success(`Moved ${name} here`);
      setPendingMove(null);
      setAddMemberSearch("");
    } catch (err) {
      console.error("Error moving member:", err);
      toast.error("Failed to move member");
    } finally {
      setAddBusyUid(null);
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

      {/* Mobile-app vs formations reconciliation */}
      {(mismatchCount > 0 || mobileOnlyMembers.length > 0) && (
        <div className="card border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-amber-300 text-lg leading-none">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-200">
                Mobile app vs formations mismatch
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-amber-100/90 list-disc pl-5">
                {mismatchCount > 0 && (
                  <li>
                    {mismatchCount} formation{mismatchCount === 1 ? "" : "s"} have
                    member(s) not yet in the mobile app team.
                  </li>
                )}
                {mobileOnlyMembers.length > 0 && (
                  <li>
                    {mobileOnlyMembers.length} member
                    {mobileOnlyMembers.length === 1 ? "" : "s"} are in a mobile
                    app team but in no formation.
                  </li>
                )}
              </ul>
            </div>
            {mismatchCount > 0 && (
              <label className="shrink-0 flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mismatchOnly}
                  onChange={(e) => {
                    setMismatchOnly(e.target.checked);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="accent-primary"
                />
                Only mismatches
              </label>
            )}
          </div>

        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
        {/* List + search */}
        <div className="lg:col-span-5">
          <div className="card flex flex-col h-[70vh] lg:h-[calc(100vh-16rem)]">
            <div className="p-4 border-b border-white/10 flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Teams ({formations.length})
                </h3>
                <button
                  onClick={() => {
                    setNewTeamName("");
                    setShowAddModal(true);
                  }}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  + Add team
                </button>
              </div>
              <input
                onChange={onSearchChange}
                value={search}
                className="input w-full"
                type="text"
                placeholder="Search teams…"
              />
              <div className="flex gap-2">
                <label className="flex-1 flex flex-col gap-1">
                  <span className="text-xs text-white/50">Members</span>
                  <select
                    value={countFilter}
                    onChange={(e) => {
                      setCountFilter(e.target.value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className="input w-full text-sm"
                  >
                    <option value="all">All counts</option>
                    <option value="notfull">Not full (&lt;{MAX_TEAM_SIZE})</option>
                    <option value="0">Empty (0)</option>
                    <option value="1">1 member</option>
                    <option value="2">2 members</option>
                    <option value="3">3 members</option>
                    <option value="4">4 (full)</option>
                  </select>
                </label>
                <label className="flex-1 flex flex-col gap-1">
                  <span className="text-xs text-white/50">Sort by</span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as typeof sortBy);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className="input w-full text-sm"
                  >
                    <option value="name">Name (A–Z)</option>
                    <option value="members-desc">Members (most first)</option>
                    <option value="members-asc">Members (fewest first)</option>
                  </select>
                </label>
              </div>
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
                        <div className="shrink-0 flex items-center gap-1">
                          {hasMobileMismatch(team) && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40"
                              title="Some members haven't joined this team in the mobile app"
                            >
                              ⚠ mobile
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/20">
                            {team.members.length} member
                            {team.members.length === 1 ? "" : "s"}
                          </span>
                        </div>
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
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      selected.members.length >= MAX_TEAM_SIZE
                        ? "bg-white/10 text-white/70 border-white/20"
                        : "bg-primary/20 text-accent-accessible border-primary/40"
                    }`}
                  >
                    {selected.members.length}/{MAX_TEAM_SIZE} member
                    {selected.members.length === 1 ? "" : "s"}
                    {selected.members.length >= MAX_TEAM_SIZE ? " · full" : ""}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => copyTeamId(selected.id)}
                    className="inline-flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white/80 transition-colors min-w-0"
                    title="Copy team ID"
                  >
                    <span className="truncate">{selected.id}</span>
                    <span className="text-white/40 shrink-0">
                      {copied ? "✓ copied" : "⧉"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-600/10 border border-red-600/40 hover:bg-red-600/20 transition-colors"
                  >
                    Delete team
                  </button>
                </div>
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

              {/* Mobile-app reconciliation for this formation */}
              {(() => {
                if (mobileMemberSet.size === 0) return null;
                const missing = missingFromMobile(selected);
                if (missing.length > 0) {
                  return (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                      <p className="text-sm font-semibold text-amber-200">
                        ⚠ {missing.length} member
                        {missing.length === 1 ? "" : "s"} not in the mobile app
                        team
                      </p>
                      <p className="text-xs text-amber-100/80 mt-0.5">
                        These members exist in this formation but in no mobile{" "}
                        <code>teams</code> doc. Ask them to create/join the team
                        in the app.
                      </p>
                      <ul className="mt-2 space-y-1">
                        {missing.map((uid) => {
                          const m = resolveMember(uid);
                          return (
                            <li
                              key={uid}
                              className="text-sm text-amber-100/90 truncate"
                            >
                              {m.resolved ? m.name : uid}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                }
                if (selected.members.length > 1) {
                  return (
                    <p className="text-xs text-emerald-300/80">
                      ✓ All members are in the mobile app team.
                    </p>
                  );
                }
                return null;
              })()}

              {/* Members */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3 border-b border-white/10 pb-1">
                  <h3 className="font-semibold text-white text-sm">
                    Members ({selected.members.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setAddMemberSearch("");
                      setPendingMove(null);
                      setAddingMember(true);
                    }}
                    disabled={selected.members.length >= MAX_TEAM_SIZE}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 bg-white/5 border border-white/15 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                      selected.members.length >= MAX_TEAM_SIZE
                        ? "Team is full (max 4)"
                        : "Add a member from the participant pool"
                    }
                  >
                    + Add member
                  </button>
                </div>
                {selected.members.length === 0 ? (
                  <p className="text-white/50 text-sm">No members listed.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.members.map((uid, i) => {
                      const m = resolveMember(uid);
                      return (
                        <li
                          key={`${uid}-${i}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-accent-accessible text-xs font-semibold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
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
                            {mobileMemberSet.size > 0 &&
                              selected.members.length > 1 &&
                              !mobileMemberSet.has(uid) && (
                                <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                                  ⚠ not in mobile app
                                </span>
                              )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setMoveSearch("");
                              setMovingMember({
                                uid,
                                fromTeamId: selected.id,
                              });
                            }}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 bg-white/5 border border-white/15 hover:bg-white/10 transition-colors"
                          >
                            Move
                          </button>
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

      {/* Add-team modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !creating && setShowAddModal(false)}
        >
          <div
            className="modal-panel p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-semibold text-white">Add team</h3>
              <p className="text-sm text-white/60 mt-1">
                Creates an empty team. Move members into it afterwards.
              </p>
            </div>
            <input
              autoFocus
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTeam();
              }}
              className="input w-full"
              placeholder="Team name"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={creating || !newTeamName.trim()}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating…" : "Create team"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete-team confirmation */}
      {confirmingDelete && selected && (
        <ConfirmDialog
          title={`Delete "${selected.teamName || selected.id}"?`}
          description={
            selected.members.length > 0
              ? `This team has ${selected.members.length} member${
                  selected.members.length === 1 ? "" : "s"
                }. Deleting removes the team only — the members' user accounts are not affected, but they will no longer belong to this team. This cannot be undone.`
              : "This cannot be undone."
          }
          confirmLabel={deleting ? "Deleting…" : "Delete team"}
          loading={deleting}
          onConfirm={handleDeleteTeam}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {/* Move-member modal */}
      {movingMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !moveBusy && setMovingMember(null)}
        >
          <div
            className="modal-panel p-6 w-full max-w-lg flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-white">Move member</h3>
              <p className="text-sm text-white/60 mt-1">
                Moving{" "}
                <span className="text-white/90">
                  {resolveMember(movingMember.uid).name}
                </span>{" "}
                — pick a team that isn&apos;t full (max {MAX_TEAM_SIZE}).
              </p>
            </div>
            <input
              autoFocus
              value={moveSearch}
              onChange={(e) => setMoveSearch(e.target.value)}
              className="input w-full mb-3"
              placeholder="Search teams…"
            />
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
              {moveTargets.length === 0 ? (
                <p className="text-center text-white/50 text-sm py-8">
                  No available teams{moveSearch ? " match your search" : ""}.
                </p>
              ) : (
                moveTargets.map((t) => (
                  <button
                    key={t.id}
                    disabled={moveBusy}
                    onClick={() => handleMoveMember(t.id)}
                    className="w-full text-left p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-between gap-3 disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {t.teamName || "(unnamed team)"}
                      </p>
                      <p className="text-xs text-white/40 font-mono truncate">
                        {t.id}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-white/60">
                      {t.members.length}/{MAX_TEAM_SIZE}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => setMovingMember(null)}
                disabled={moveBusy}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add-member modal (from the participant pool) */}
      {addingMember && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !addBusyUid && closeAddMember()}
        >
          <div
            className="modal-panel p-6 w-full max-w-lg flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-white">Add member</h3>
              <p className="text-sm text-white/60 mt-1">
                Search the participant pool and add someone to{" "}
                <span className="text-white/90">
                  {selected.teamName || "(unnamed team)"}
                </span>
                .
              </p>
            </div>

            {pendingMove ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-200">
                  <span className="font-semibold">{pendingMove.name}</span> is
                  already in{" "}
                  <span className="font-semibold">
                    {pendingMove.fromTeamName}
                  </span>
                  . Move them here instead?
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setPendingMove(null)}
                    disabled={!!addBusyUid}
                    className="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmMoveInto}
                    disabled={!!addBusyUid}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {addBusyUid ? "Moving…" : "Move here"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  autoFocus
                  value={addMemberSearch}
                  onChange={(e) => setAddMemberSearch(e.target.value)}
                  className="input w-full mb-3"
                  placeholder="Search participants by name, email, or UID…"
                />
                <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
                  {addMemberSearch.trim() === "" ? (
                    <p className="text-center text-white/40 text-sm py-8">
                      Start typing to search participants.
                    </p>
                  ) : addCandidates.length === 0 ? (
                    <p className="text-center text-white/50 text-sm py-8">
                      No matching participants.
                    </p>
                  ) : (
                    addCandidates.map((u) => {
                      const existing = memberTeamOf.get(u.id);
                      const onOtherTeam =
                        existing && existing.id !== selected.id;
                      const name =
                        `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
                        u.id;
                      return (
                        <button
                          key={u.id}
                          disabled={!!addBusyUid}
                          onClick={() => handleAddMember(u)}
                          className="w-full text-left p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-between gap-3 disabled:opacity-50"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">
                              {name}
                            </p>
                            <p className="text-xs text-white/50 truncate">
                              {u.email || u.id}
                            </p>
                          </div>
                          {onOtherTeam && (
                            <span className="shrink-0 text-xs text-amber-300/90 whitespace-nowrap">
                              in {existing!.teamName || existing!.id}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={closeAddMember}
                    className="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
