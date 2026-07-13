"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Crown,
  Loader2,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import type { CheckInParticipant, CheckInTeam } from "@/lib/checkin-types";
import { editTeamMember, fetchParticipants } from "./checkin-client";

const MAX_TEAM_SIZE = 4;

/**
 * The "Confirm Team" step: shows the scanned hacker's team from `formations`,
 * flags which members have already checked in, and lets the admin fix the roster
 * (remove a member, or search participants to add one). Writes go through the
 * server (admin SDK) and this reflects the reloaded team each time.
 */
export function TeamConfirm({
  team,
  leadUid,
  onTeamChange,
}: {
  team: CheckInTeam;
  leadUid: string;
  onTeamChange: (team: CheckInTeam) => void;
}) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const isFull = team.members.length >= MAX_TEAM_SIZE;
  const checkedInCount = team.members.filter((m) => m.checkedIn).length;

  const handleRemove = async (uid: string) => {
    setBusyUid(uid);
    const res = await editTeamMember({
      teamId: team.id,
      uid,
      action: "remove",
      leadUid,
    });
    setBusyUid(null);
    if (!res.ok) {
      toast.error(res.reason);
      return;
    }
    onTeamChange(res.team);
    toast.success("Member removed");
  };

  const handleAdd = async (p: CheckInParticipant) => {
    setBusyUid(p.uid);
    const res = await editTeamMember({
      teamId: team.id,
      uid: p.uid,
      action: "add",
      leadUid,
    });
    setBusyUid(null);
    if (!res.ok) {
      toast.error(res.reason);
      return;
    }
    onTeamChange(res.team);
    toast.success(`Added ${p.name}`);
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {team.teamName || "(unnamed team)"}
          </p>
          <p className="text-xs text-white/50">
            {checkedInCount}/{team.members.length} checked in
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
            isFull
              ? "border-white/20 bg-white/10 text-white/70"
              : "border-[#874ffe]/40 bg-[#874ffe]/20 text-[#c6b0ff]"
          }`}
        >
          {team.members.length}/{MAX_TEAM_SIZE}
          {isFull ? " · full" : ""}
        </span>
      </div>

      {/* Roster */}
      <ul className="space-y-2">
        {team.members.map((m) => (
          <li
            key={m.uid}
            className="flex items-center gap-3 rounded-lg bg-black/20 p-3"
          >
            {m.checkedIn ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-white/25" />
            )}

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white/90">
                {m.name}
                {m.isLead && (
                  <span
                    className="inline-flex items-center gap-0.5 text-xs text-amber-300/90"
                    title="The hacker being checked in"
                  >
                    <Crown className="h-3 w-3" />
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-white/50">
                {m.email || m.uid}
              </p>
            </div>

            <span
              className={`shrink-0 text-xs font-medium ${
                m.checkedIn ? "text-emerald-300/90" : "text-white/40"
              }`}
            >
              {m.checkedIn ? "checked in" : "not yet"}
            </span>

            <button
              type="button"
              onClick={() => handleRemove(m.uid)}
              disabled={busyUid === m.uid}
              className="shrink-0 text-white/30 hover:text-red-300 disabled:opacity-40"
              aria-label={`Remove ${m.name}`}
            >
              {busyUid === m.uid ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Add member */}
      {adding ? (
        <AddMemberSearch
          team={team}
          busyUid={busyUid}
          isFull={isFull}
          onPick={handleAdd}
          onClose={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={isFull}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UserPlus className="h-4 w-4" />
          {isFull ? "Team is full" : "Add member"}
        </button>
      )}
    </div>
  );
}

function AddMemberSearch({
  team,
  busyUid,
  isFull,
  onPick,
  onClose,
}: {
  team: CheckInTeam;
  busyUid: string | null;
  isFull: boolean;
  onPick: (p: CheckInParticipant) => void;
  onClose: () => void;
}) {
  const [participants, setParticipants] = useState<CheckInParticipant[] | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch the roster once when the search opens; filter locally afterwards.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchParticipants();
      if (!cancelled) {
        setParticipants(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const memberIds = useMemo(
    () => new Set(team.members.map((m) => m.uid)),
    [team.members]
  );

  const results = useMemo(() => {
    if (!participants) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return participants
      .filter((p) => !memberIds.has(p.uid))
      .filter((p) =>
        `${p.name} ${p.email} ${p.uid}`.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [participants, query, memberIds]);

  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-white/70">Add a member</p>
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white/80"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isFull && (
        <p className="mb-2 text-xs text-amber-300/80">
          Team is full — remove someone first.
        </p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading || isFull}
          placeholder={loading ? "Loading participants…" : "Search name or email…"}
          className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-sm text-white placeholder:text-white/30 focus:border-[#874ffe]/60 focus:outline-none disabled:opacity-60"
        />
      </div>

      {!loading && query.trim() && results.length === 0 && (
        <p className="mt-2 text-xs text-white/40">No matching participants.</p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {results.map((p) => (
            <li key={p.uid}>
              <button
                type="button"
                onClick={() => onPick(p)}
                disabled={isFull || busyUid === p.uid}
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-white/10 disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white/90">{p.name}</p>
                  <p className="truncate text-xs text-white/50">{p.email}</p>
                </div>
                {p.checkedIn && (
                  <span className="shrink-0 text-xs text-emerald-300/80">
                    checked in
                  </span>
                )}
                {busyUid === p.uid ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/50" />
                ) : (
                  <UserPlus className="h-4 w-4 shrink-0 text-white/40" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
