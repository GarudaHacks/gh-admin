"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllTables,
  fetchAllFormations,
  fetchAllUsers,
  fetchAllApplications,
  createTablesBulk,
  assignFormationToTable,
  removeFormationFromTable,
  moveFormationBetweenTables,
  deleteTable,
} from "@/lib/firebaseUtils";
import { FirestoreTable, TeamFormation, FirestoreUser } from "@/lib/types";

// Distinct seat colors, one per formation within a table (cycled if needed).
// Multiple colors in one table => teams from different formations are sharing it.
const SEAT_COLORS = [
  "#60a5fa", // blue
  "#f472b6", // pink
  "#34d399", // green
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#fb923c", // orange
  "#22d3ee", // cyan
  "#f87171", // red
];

const UNSPECIFIED = "(no location)";
const MAX_BULK = 200; // guard against accidentally creating thousands of tables

// --- Sorting (assign modal) ------------------------------------------------

type SortKey = "overnight" | "age" | "male";
type SortDir = "asc" | "desc";
const SORT_KEYS: SortKey[] = ["overnight", "age", "male"];
const SORT_LABELS: Record<SortKey, string> = {
  overnight: "Overnight",
  age: "Avg age",
  male: "Male / PNS",
};
const SORT_HINTS: Record<SortKey, string> = {
  overnight: "Members staying overnight",
  age: "Average member age",
  male: "Members who are Male or would rather not say",
};

// Per-formation stats used for sorting + display in the assign modal.
interface FormationStats {
  memberCount: number;
  overnightCount: number;
  ageAvg: number | null;
  maleCount: number;
}

// --- Table render model ----------------------------------------------------

interface Seat {
  formationId: string;
  memberUid: string;
  memberName: string;
  colorIndex: number;
}

interface AssignedFormation {
  id: string;
  formation: TeamFormation | null;
  colorIndex: number;
  memberCount: number;
}

interface TableView {
  table: FirestoreTable;
  assigned: AssignedFormation[];
  seats: Seat[];
  filled: number; // total seated members
  isMixed: boolean; // more than one formation at the table
  overCapacity: boolean; // more members than seats
}

// --- Helpers ---------------------------------------------------------------

// Age in whole years from a date-of-birth string; null if unparseable/absurd.
function computeAge(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 0 || age > 120) return null;
  return age;
}

// Whether a gender answer counts toward the "Male / prefer-not-to-say" bucket.
function isMalePns(gender?: string): boolean {
  const g = (gender || "").toLowerCase();
  return g === "male" || g.includes("rather not");
}

export default function TablesPage() {
  const { user } = useAuth();
  const editor = user?.email ?? "system";

  const [tables, setTables] = useState<FirestoreTable[]>([]);
  const [formationMap, setFormationMap] = useState<Map<string, TeamFormation>>(
    new Map()
  );
  const [formationsList, setFormationsList] = useState<TeamFormation[]>([]);
  const [userMap, setUserMap] = useState<Map<string, FirestoreUser>>(new Map());
  // uid -> whether they answered "yes" to staying overnight (from applications).
  const [overnightByUid, setOvernightByUid] = useState<Map<string, boolean>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-table modal (supports a numbered range).
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [newCapacity, setNewCapacity] = useState("6");
  const [newFrom, setNewFrom] = useState("1");
  const [newTo, setNewTo] = useState("1");
  const [creating, setCreating] = useState(false);

  // Assign-team modal (the table we're assigning to) + its sort criteria.
  const [assignTable, setAssignTable] = useState<FirestoreTable | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignBusyId, setAssignBusyId] = useState<string | null>(null);
  const [sortCriteria, setSortCriteria] = useState<
    { key: SortKey; dir: SortDir }[]
  >([]);

  // Move-team modal (moving one formation off a table onto another).
  const [moveSource, setMoveSource] = useState<{
    table: FirestoreTable;
    formationId: string;
  } | null>(null);
  const [moveSearch, setMoveSearch] = useState("");
  const [moveBusy, setMoveBusy] = useState(false);

  // Remove-formation + delete-table busy state.
  const [removeBusy, setRemoveBusy] = useState<string | null>(null);
  const [confirmDeleteTable, setConfirmDeleteTable] =
    useState<FirestoreTable | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tablesData, formations, users, applications] = await Promise.all([
        fetchAllTables(),
        fetchAllFormations().catch(() => [] as TeamFormation[]),
        fetchAllUsers().catch(() => [] as FirestoreUser[]),
        fetchAllApplications().catch(() => []),
      ]);

      const fMap = new Map<string, TeamFormation>();
      formations.forEach((f) => fMap.set(f.id, f));
      const uMap = new Map<string, FirestoreUser>();
      users.forEach((u) => uMap.set(u.id, u));
      const oMap = new Map<string, boolean>();
      applications.forEach((a) =>
        oMap.set(a.id, /^yes/i.test(a.overnightPlan || ""))
      );

      setTables(tablesData);
      setFormationMap(fMap);
      setFormationsList(formations);
      setUserMap(uMap);
      setOvernightByUid(oMap);
    } catch (err) {
      console.error("Error loading tables:", err);
      setError("Failed to load tables. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const memberName = (uid: string): string => {
    const u = userMap.get(uid);
    const name = u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "";
    return name || uid;
  };

  // Total seated members currently at a table.
  const filledOf = (table: FirestoreTable): number =>
    table.formations.reduce(
      (sum, fid) => sum + (formationMap.get(fid)?.members.length ?? 0),
      0
    );

  // Per-formation stats (overnight / age / gender), computed once per data load.
  const formationStats = useMemo(() => {
    const map = new Map<string, FormationStats>();
    for (const f of formationsList) {
      let overnightCount = 0;
      let maleCount = 0;
      let ageSum = 0;
      let ageN = 0;
      for (const uid of f.members) {
        if (overnightByUid.get(uid)) overnightCount++;
        const u = userMap.get(uid);
        if (u) {
          if (isMalePns(u.genderIdentity)) maleCount++;
          const age = computeAge(u.dateOfBirth);
          if (age != null) {
            ageSum += age;
            ageN++;
          }
        }
      }
      map.set(f.id, {
        memberCount: f.members.length,
        overnightCount,
        ageAvg: ageN > 0 ? ageSum / ageN : null,
        maleCount,
      });
    }
    return map;
  }, [formationsList, userMap, overnightByUid]);

  // Which table (if any) a formation is currently seated at.
  const formationTableOf = useMemo(() => {
    const map = new Map<string, FirestoreTable>();
    for (const t of tables) {
      for (const fid of t.formations) if (!map.has(fid)) map.set(fid, t);
    }
    return map;
  }, [tables]);

  // Build the render model for one table (seats colored per formation).
  const buildView = useMemo(() => {
    return (table: FirestoreTable): TableView => {
      const assigned: AssignedFormation[] = table.formations.map((fid, idx) => {
        const formation = formationMap.get(fid) ?? null;
        return {
          id: fid,
          formation,
          colorIndex: idx,
          memberCount: formation?.members.length ?? 0,
        };
      });

      const seats: Seat[] = [];
      assigned.forEach(({ id, formation, colorIndex }) => {
        (formation?.members ?? []).forEach((uid) => {
          seats.push({
            formationId: id,
            memberUid: uid,
            memberName: memberName(uid),
            colorIndex,
          });
        });
      });

      return {
        table,
        assigned,
        seats,
        filled: seats.length,
        isMixed: table.formations.length > 1,
        overCapacity: seats.length > table.capacity,
      };
    };
    // memberName depends on userMap; formationMap covers formation data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationMap, userMap]);

  // Group tables by location for the room layout.
  const grouped = useMemo(() => {
    const map = new Map<string, FirestoreTable[]>();
    for (const t of tables) {
      const key = t.location?.trim() || UNSPECIFIED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    const entries = [...map.entries()].map(
      ([loc, list]) =>
        [loc, [...list].sort((a, b) => a.tableNumber - b.tableNumber)] as const
    );
    entries.sort(([a], [b]) => {
      if (a === UNSPECIFIED) return 1;
      if (b === UNSPECIFIED) return -1;
      return a.localeCompare(b);
    });
    return entries;
  }, [tables]);

  const existingLocations = useMemo(
    () =>
      [...new Set(tables.map((t) => t.location?.trim()).filter(Boolean))].sort(),
    [tables]
  );

  const nextTableNumber = useMemo(
    () => (tables.reduce((max, t) => Math.max(max, t.tableNumber), 0) || 0) + 1,
    [tables]
  );

  // --- Mutations -----------------------------------------------------------

  const updateLocalTable = (id: string, patch: Partial<FirestoreTable>) =>
    setTables((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, ...patch, updatedAt: new Date(), updatedBy: editor }
          : t
      )
    );

  const openAddModal = () => {
    setNewLocation("");
    setNewCapacity("6");
    setNewFrom(String(nextTableNumber));
    setNewTo(String(nextTableNumber));
    setShowAddModal(true);
  };

  const bulkCount = useMemo(() => {
    const from = parseInt(newFrom, 10);
    const to = parseInt(newTo, 10);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
    return to - from + 1;
  }, [newFrom, newTo]);

  const handleCreateTables = async () => {
    const location = newLocation.trim();
    const capacity = parseInt(newCapacity, 10);
    const from = parseInt(newFrom, 10);
    const to = parseInt(newTo, 10);
    if (!location || !Number.isFinite(capacity) || capacity < 1) {
      toast.error("Enter a location and a capacity of at least 1");
      return;
    }
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
      toast.error("Enter a valid table-number range");
      return;
    }
    if (bulkCount > MAX_BULK) {
      toast.error(`That's ${bulkCount} tables — max ${MAX_BULK} at once`);
      return;
    }
    if (creating) return;

    const items = [];
    for (let n = from; n <= to; n++) {
      items.push({ location, capacity, tableNumber: n });
    }
    try {
      setCreating(true);
      const created = await createTablesBulk(items, editor);
      setTables((prev) => [...prev, ...created]);
      setShowAddModal(false);
      toast.success(
        created.length === 1
          ? `Added table ${created[0].tableNumber}`
          : `Added ${created.length} tables (${from}–${to})`
      );
    } catch (err) {
      console.error("Error creating tables:", err);
      toast.error("Failed to create tables");
    } finally {
      setCreating(false);
    }
  };

  const handleAssign = async (formation: TeamFormation) => {
    if (!assignTable || assignBusyId) return;
    const tableId = assignTable.id;
    try {
      setAssignBusyId(formation.id);
      const ok = await assignFormationToTable(tableId, formation.id, editor);
      if (!ok) {
        toast.error("Failed to assign team");
        return;
      }
      const addId = (fs: string[]) =>
        fs.includes(formation.id) ? fs : [...fs, formation.id];
      updateLocalTable(tableId, { formations: addId(assignTable.formations) });
      setAssignTable((prev) =>
        prev && prev.id === tableId
          ? { ...prev, formations: addId(prev.formations) }
          : prev
      );
      toast.success(`Assigned ${formation.teamName || formation.id}`);
    } catch (err) {
      console.error("Error assigning team:", err);
      toast.error("Failed to assign team");
    } finally {
      setAssignBusyId(null);
    }
  };

  const handleRemoveFormation = async (
    table: FirestoreTable,
    formationId: string
  ) => {
    const key = `${table.id}:${formationId}`;
    if (removeBusy) return;
    try {
      setRemoveBusy(key);
      const ok = await removeFormationFromTable(table.id, formationId, editor);
      if (!ok) {
        toast.error("Failed to remove team");
        return;
      }
      const dropId = (fs: string[]) => fs.filter((f) => f !== formationId);
      updateLocalTable(table.id, { formations: dropId(table.formations) });
      setAssignTable((prev) =>
        prev && prev.id === table.id
          ? { ...prev, formations: dropId(prev.formations) }
          : prev
      );
    } catch (err) {
      console.error("Error removing team:", err);
      toast.error("Failed to remove team");
    } finally {
      setRemoveBusy(null);
    }
  };

  const handleMove = async (target: FirestoreTable) => {
    if (!moveSource || moveBusy) return;
    const { table: from, formationId } = moveSource;
    try {
      setMoveBusy(true);
      const ok = await moveFormationBetweenTables(
        from.id,
        target.id,
        formationId,
        editor
      );
      if (!ok) {
        toast.error("Failed to move team");
        return;
      }
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === from.id) {
            return {
              ...t,
              formations: t.formations.filter((f) => f !== formationId),
              updatedAt: new Date(),
              updatedBy: editor,
            };
          }
          if (t.id === target.id) {
            return {
              ...t,
              formations: t.formations.includes(formationId)
                ? t.formations
                : [...t.formations, formationId],
              updatedAt: new Date(),
              updatedBy: editor,
            };
          }
          return t;
        })
      );
      const f = formationMap.get(formationId);
      toast.success(
        `Moved ${f?.teamName || "team"} to Table ${target.tableNumber}`
      );
      setMoveSource(null);
      setMoveSearch("");
    } catch (err) {
      console.error("Error moving team:", err);
      toast.error("Failed to move team");
    } finally {
      setMoveBusy(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!confirmDeleteTable || deleting) return;
    const { id, tableNumber } = confirmDeleteTable;
    try {
      setDeleting(true);
      const ok = await deleteTable(id);
      if (!ok) {
        toast.error("Failed to delete table");
        return;
      }
      setTables((prev) => prev.filter((t) => t.id !== id));
      setConfirmDeleteTable(null);
      toast.success(`Deleted table ${tableNumber}`);
    } catch (err) {
      console.error("Error deleting table:", err);
      toast.error("Failed to delete table");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSort = (key: SortKey) =>
    setSortCriteria((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (!existing) return [...prev, { key, dir: "desc" }];
      if (existing.dir === "desc")
        return prev.map((c) => (c.key === key ? { ...c, dir: "asc" } : c));
      // was ascending -> turn this criterion off
      return prev.filter((c) => c.key !== key);
    });

  // Numeric value of a formation for a given sort key (missing -> -Infinity,
  // which sorts such teams last when descending).
  const sortValue = (formationId: string, key: SortKey): number => {
    const s = formationStats.get(formationId);
    if (!s) return -Infinity;
    if (key === "overnight") return s.overnightCount;
    if (key === "male") return s.maleCount;
    return s.ageAvg ?? -Infinity; // "age"
  };

  // Candidates for the assign modal: formations matching the query, not already
  // at this table, ordered by the active multi-sort (alphabetical fallback).
  const assignCandidates = useMemo(() => {
    if (!assignTable) return [];
    const q = assignSearch.trim().toLowerCase();
    const current = new Set(assignTable.formations);
    const list = formationsList
      .filter((f) => !current.has(f.id))
      .filter(
        (f) => !q || `${f.teamName ?? ""} ${f.id}`.toLowerCase().includes(q)
      );

    if (sortCriteria.length === 0) return list.slice(0, 60);

    // Stable sort: formationsList is alphabetical, so ties keep that order.
    return [...list]
      .sort((a, b) => {
        for (const { key, dir } of sortCriteria) {
          const av = sortValue(a.id, key);
          const bv = sortValue(b.id, key);
          if (av !== bv) return dir === "desc" ? bv - av : av - bv;
        }
        return 0;
      })
      .slice(0, 60);
    // sortValue closes over formationStats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignTable, assignSearch, formationsList, sortCriteria, formationStats]);

  // Tables the moving formation could go to: not the source, not already holding
  // it, and with enough free seats for the whole team.
  const moveTargets = useMemo(() => {
    if (!moveSource) return [];
    const need = formationMap.get(moveSource.formationId)?.members.length ?? 0;
    const q = moveSearch.trim().toLowerCase();
    return tables
      .filter((t) => t.id !== moveSource.table.id)
      .filter((t) => !t.formations.includes(moveSource.formationId))
      .filter((t) => t.capacity - filledOf(t) >= need)
      .filter(
        (t) =>
          !q ||
          `table ${t.tableNumber} ${t.location ?? ""}`
            .toLowerCase()
            .includes(q)
      )
      .sort(
        (a, b) =>
          (a.location || "").localeCompare(b.location || "") ||
          a.tableNumber - b.tableNumber
      );
    // filledOf closes over formationMap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSource, tables, moveSearch, formationMap]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Table Assignments"
          subtitle="Seat teams at venue tables, grouped by location."
        />
        <LoadingSpinner text="Loading tables..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Table Assignments"
          subtitle="Seat teams at venue tables, grouped by location."
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

  const movingFormation = moveSource
    ? formationMap.get(moveSource.formationId)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Table Assignments"
        subtitle="Each square is a seat; its color is the team seated there. A table showing more than one color holds teams from different formations. Click a table to assign a team."
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-white/60">
          {tables.length} table{tables.length === 1 ? "" : "s"} across{" "}
          {grouped.length} location{grouped.length === 1 ? "" : "s"}
        </p>
        <button onClick={openAddModal} className="btn-primary text-sm">
          + Add tables
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="card p-10 text-center text-white/60">
          No tables yet. Click <span className="text-white">+ Add tables</span>{" "}
          to create some.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([location, list]) => (
            <section key={location} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <h2 className="text-lg font-semibold text-white">{location}</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/70 border border-white/20">
                  {list.length} table{list.length === 1 ? "" : "s"}
                </span>
              </div>
              {/* Room layout: tables flow across the row and wrap. */}
              <div className="flex flex-wrap gap-4">
                {list.map((table) => (
                  <TableCard
                    key={table.id}
                    view={buildView(table)}
                    onAssign={() => {
                      setAssignSearch("");
                      setAssignTable(table);
                    }}
                    onRemoveFormation={(fid) => handleRemoveFormation(table, fid)}
                    onMoveFormation={(fid) => {
                      setMoveSearch("");
                      setMoveSource({ table, formationId: fid });
                    }}
                    onDelete={() => setConfirmDeleteTable(table)}
                    removeBusy={removeBusy}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add-tables modal (numbered range) */}
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
              <h3 className="text-lg font-semibold text-white">Add tables</h3>
              <p className="text-sm text-white/60 mt-1">
                Creates a numbered range of empty tables, all with the same
                location and capacity.
              </p>
            </div>

            <label className="block">
              <span className="text-xs text-white/50">Location</span>
              <input
                autoFocus
                list="table-locations"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="input w-full mt-1"
                placeholder="e.g. Main Hall"
              />
              <datalist id="table-locations">
                {existingLocations.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="text-xs text-white/50">Capacity (seats)</span>
              <input
                type="number"
                min={1}
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="input w-full mt-1"
              />
            </label>

            <div className="flex gap-3">
              <label className="flex-1">
                <span className="text-xs text-white/50">Table number from</span>
                <input
                  type="number"
                  min={0}
                  value={newFrom}
                  onChange={(e) => setNewFrom(e.target.value)}
                  className="input w-full mt-1"
                />
              </label>
              <label className="flex-1">
                <span className="text-xs text-white/50">to</span>
                <input
                  type="number"
                  min={0}
                  value={newTo}
                  onChange={(e) => setNewTo(e.target.value)}
                  className="input w-full mt-1"
                />
              </label>
            </div>

            <p className="text-xs text-white/50">
              {bulkCount > 0
                ? `Will create ${bulkCount} table${
                    bulkCount === 1 ? "" : "s"
                  } (numbered ${newFrom}–${newTo}).`
                : "Enter a valid range (from ≤ to)."}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTables}
                disabled={creating || !newLocation.trim() || bulkCount < 1}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating
                  ? "Creating…"
                  : `Create ${bulkCount || ""} table${
                      bulkCount === 1 ? "" : "s"
                    }`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign-team modal */}
      {assignTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !assignBusyId && setAssignTable(null)}
        >
          <div
            className="modal-panel p-6 w-full max-w-lg flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-white">
                Assign team — Table {assignTable.tableNumber}
              </h3>
              <p className="text-sm text-white/60 mt-1">
                {assignTable.location?.trim() || UNSPECIFIED} ·{" "}
                {assignTable.formations.length} team
                {assignTable.formations.length === 1 ? "" : "s"} seated
              </p>
            </div>

            {/* Currently seated teams (removable). */}
            {assignTable.formations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {assignTable.formations.map((fid, idx) => {
                  const f = formationMap.get(fid);
                  const key = `${assignTable.id}:${fid}`;
                  return (
                    <span
                      key={fid}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-white/5 border border-white/15 text-white/80"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{
                          backgroundColor: SEAT_COLORS[idx % SEAT_COLORS.length],
                        }}
                      />
                      {f?.teamName || (
                        <span className="italic text-red-300">
                          missing ({fid.slice(0, 6)}…)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFormation(assignTable, fid)}
                        disabled={removeBusy === key}
                        className="text-white/50 hover:text-red-300 disabled:opacity-50"
                        title="Remove from table"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Multi-sort controls */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className="text-xs text-white/50 mr-1">Sort:</span>
              {SORT_KEYS.map((key) => {
                const idx = sortCriteria.findIndex((c) => c.key === key);
                const active = idx >= 0;
                const dir = active ? sortCriteria[idx].dir : null;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSort(key)}
                    title={`${SORT_HINTS[key]} — click to cycle desc → asc → off`}
                    className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                      active
                        ? "bg-primary/20 text-accent-accessible border-primary/40"
                        : "bg-white/5 text-white/70 border-white/15 hover:bg-white/10"
                    }`}
                  >
                    {active && (
                      <span className="mr-1 opacity-70">{idx + 1}</span>
                    )}
                    {SORT_LABELS[key]}
                    {active ? (dir === "desc" ? " ↓" : " ↑") : ""}
                  </button>
                );
              })}
              {sortCriteria.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSortCriteria([])}
                  className="text-xs text-white/50 hover:text-white/80 ml-1"
                >
                  clear
                </button>
              )}
            </div>

            <input
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              className="input w-full mb-3"
              placeholder="Search teams by name or id…"
            />
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
              {assignCandidates.length === 0 ? (
                <p className="text-center text-white/50 text-sm py-8">
                  {assignSearch
                    ? "No matching teams."
                    : "All teams are assigned or none exist."}
                </p>
              ) : (
                assignCandidates.map((f) => {
                  const elsewhere = formationTableOf.get(f.id);
                  const atOther = elsewhere && elsewhere.id !== assignTable.id;
                  const s = formationStats.get(f.id);
                  return (
                    <button
                      key={f.id}
                      disabled={!!assignBusyId}
                      onClick={() => handleAssign(f)}
                      className="w-full text-left p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-between gap-3 disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          {f.teamName || "(unnamed team)"}
                        </p>
                        <p className="text-xs text-white/50 truncate">
                          {f.members.length} member
                          {f.members.length === 1 ? "" : "s"}
                          {s && (
                            <>
                              {" · "}🌙 {s.overnightCount}
                              {" · "}Ø{" "}
                              {s.ageAvg != null ? s.ageAvg.toFixed(1) : "—"}
                              {" · "}♂ {s.maleCount}
                            </>
                          )}
                        </p>
                      </div>
                      {atOther && (
                        <span className="shrink-0 text-xs text-amber-300/90 whitespace-nowrap">
                          at Table {elsewhere!.tableNumber}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-white/40">
                🌙 overnight · Ø avg age · ♂ male/PNS
              </span>
              <button
                onClick={() => setAssignTable(null)}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move-team modal */}
      {moveSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !moveBusy && setMoveSource(null)}
        >
          <div
            className="modal-panel p-6 w-full max-w-lg flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-white">Move team</h3>
              <p className="text-sm text-white/60 mt-1">
                Moving{" "}
                <span className="text-white/90">
                  {movingFormation?.teamName || "team"}
                </span>{" "}
                ({movingFormation?.members.length ?? 0} member
                {(movingFormation?.members.length ?? 0) === 1 ? "" : "s"}) off
                Table {moveSource.table.tableNumber}. Pick a table with room.
              </p>
            </div>
            <input
              autoFocus
              value={moveSearch}
              onChange={(e) => setMoveSearch(e.target.value)}
              className="input w-full mb-3"
              placeholder="Search tables by number or location…"
            />
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
              {moveTargets.length === 0 ? (
                <p className="text-center text-white/50 text-sm py-8">
                  No tables with enough free seats
                  {moveSearch ? " match your search" : ""}.
                </p>
              ) : (
                moveTargets.map((t) => {
                  const free = t.capacity - filledOf(t);
                  return (
                    <button
                      key={t.id}
                      disabled={moveBusy}
                      onClick={() => handleMove(t)}
                      className="w-full text-left p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-between gap-3 disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          Table {t.tableNumber}
                        </p>
                        <p className="text-xs text-white/40 truncate">
                          {t.location?.trim() || UNSPECIFIED}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-emerald-300/90 whitespace-nowrap">
                        {free} free seat{free === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => setMoveSource(null)}
                disabled={moveBusy}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete-table confirmation */}
      {confirmDeleteTable && (
        <ConfirmDialog
          title={`Delete table ${confirmDeleteTable.tableNumber}?`}
          description={
            confirmDeleteTable.formations.length > 0
              ? `This table has ${confirmDeleteTable.formations.length} team(s) seated. Deleting removes the table only — the formations themselves are not affected. This cannot be undone.`
              : "This cannot be undone."
          }
          confirmLabel={deleting ? "Deleting…" : "Delete table"}
          loading={deleting}
          onConfirm={handleDeleteTable}
          onCancel={() => setConfirmDeleteTable(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function TableCard({
  view,
  onAssign,
  onRemoveFormation,
  onMoveFormation,
  onDelete,
  removeBusy,
}: {
  view: TableView;
  onAssign: () => void;
  onRemoveFormation: (formationId: string) => void;
  onMoveFormation: (formationId: string) => void;
  onDelete: () => void;
  removeBusy: string | null;
}) {
  const { table, assigned, seats, filled, isMixed, overCapacity } = view;
  const totalSquares = Math.max(table.capacity, filled);
  const cols = Math.max(1, Math.ceil(Math.sqrt(totalSquares)));

  return (
    <div
      className={`w-56 rounded-lg border bg-white/[0.03] p-3 flex flex-col gap-2 ${
        overCapacity ? "border-red-500/50" : "border-white/15"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-white text-sm">
          Table {table.tableNumber}
        </span>
        <div className="flex items-center gap-1">
          {isMixed && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40"
              title="This table holds teams from more than one formation"
            >
              ⚠ mixed
            </span>
          )}
          {overCapacity && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/40"
              title={`${filled} members seated, only ${table.capacity} seats`}
            >
              over
            </span>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="text-white/40 hover:text-red-300 text-sm px-1"
            title="Delete table"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Seat grid — click to assign a team. */}
      <button
        type="button"
        onClick={onAssign}
        title="Click to assign a team"
        className="rounded-md border border-white/10 bg-black/20 p-2 hover:bg-white/5 transition-colors"
      >
        <div
          className="grid gap-1 justify-center"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: totalSquares }).map((_, i) => {
            if (i < filled) {
              const seat = seats[i];
              const over = i >= table.capacity;
              const teamName =
                assigned.find((a) => a.id === seat.formationId)?.formation
                  ?.teamName || seat.formationId;
              return (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-sm ${
                    over ? "ring-2 ring-red-400" : ""
                  }`}
                  style={{
                    backgroundColor:
                      SEAT_COLORS[seat.colorIndex % SEAT_COLORS.length],
                  }}
                  title={`${seat.memberName} — ${teamName}`}
                />
              );
            }
            return (
              <div
                key={i}
                className="w-5 h-5 rounded-sm border border-white/15 bg-transparent"
                title="Empty seat"
              />
            );
          })}
        </div>
      </button>

      {/* Seat count */}
      <p className="text-xs text-white/50 text-center">
        {filled}/{table.capacity} seats filled
      </p>

      {/* Over-capacity warning + call to action */}
      {overCapacity && (
        <p className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
          ⚠ Over capacity by {filled - table.capacity}. Move a team to a table
          with room.
        </p>
      )}

      {/* Assigned teams */}
      {assigned.length === 0 ? (
        <button
          type="button"
          onClick={onAssign}
          className="text-xs text-accent-accessible hover:underline"
        >
          + Assign a team
        </button>
      ) : (
        <ul className="space-y-1">
          {assigned.map((a) => {
            const key = `${table.id}:${a.id}`;
            return (
              <li
                key={a.id}
                className="flex items-center gap-1.5 text-xs text-white/80"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{
                    backgroundColor: SEAT_COLORS[a.colorIndex % SEAT_COLORS.length],
                  }}
                />
                <span className="truncate flex-1">
                  {a.formation?.teamName || (
                    <span className="italic text-red-300">
                      missing ({a.id.slice(0, 6)}…)
                    </span>
                  )}
                </span>
                <span className="text-white/40">{a.memberCount}</span>
                <button
                  type="button"
                  onClick={() => onMoveFormation(a.id)}
                  className="text-white/40 hover:text-accent-accessible"
                  title="Move to another table"
                >
                  ↗
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFormation(a.id)}
                  disabled={removeBusy === key}
                  className="text-white/40 hover:text-red-300 disabled:opacity-50"
                  title="Remove from table"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
