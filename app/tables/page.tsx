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
  createTable,
  assignFormationToTable,
  removeFormationFromTable,
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

// A single seat = one member of one formation seated at a table.
interface Seat {
  formationId: string;
  memberUid: string;
  memberName: string;
  colorIndex: number;
}

// A formation seated at a table (or a dangling id whose formation is gone).
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

export default function TablesPage() {
  const { user } = useAuth();
  const editor = user?.email ?? "system";

  const [tables, setTables] = useState<FirestoreTable[]>([]);
  const [formationMap, setFormationMap] = useState<Map<string, TeamFormation>>(
    new Map()
  );
  const [formationsList, setFormationsList] = useState<TeamFormation[]>([]);
  const [userMap, setUserMap] = useState<Map<string, FirestoreUser>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-table modal.
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [newCapacity, setNewCapacity] = useState("6");
  const [newTableNumber, setNewTableNumber] = useState("1");
  const [creating, setCreating] = useState(false);

  // Assign-team modal (the table we're assigning to).
  const [assignTable, setAssignTable] = useState<FirestoreTable | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignBusyId, setAssignBusyId] = useState<string | null>(null);

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
      const [tablesData, formations, users] = await Promise.all([
        fetchAllTables(),
        fetchAllFormations().catch(() => [] as TeamFormation[]),
        fetchAllUsers().catch(() => [] as FirestoreUser[]),
      ]);

      const fMap = new Map<string, TeamFormation>();
      formations.forEach((f) => fMap.set(f.id, f));
      const uMap = new Map<string, FirestoreUser>();
      users.forEach((u) => uMap.set(u.id, u));

      setTables(tablesData);
      setFormationMap(fMap);
      setFormationsList(formations);
      setUserMap(uMap);
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

  // Which table (if any) a formation is currently seated at — used to warn when
  // assigning a team that's already placed somewhere else.
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
    // Sort each group by table number; sort locations alphabetically, unspecified last.
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
    setNewTableNumber(String(nextTableNumber));
    setShowAddModal(true);
  };

  const handleCreateTable = async () => {
    const location = newLocation.trim();
    const capacity = parseInt(newCapacity, 10);
    const tableNumber = parseInt(newTableNumber, 10);
    if (!location || !Number.isFinite(capacity) || capacity < 1 || creating) {
      toast.error("Enter a location and a capacity of at least 1");
      return;
    }
    try {
      setCreating(true);
      const created = await createTable(
        {
          location,
          capacity,
          tableNumber: Number.isFinite(tableNumber)
            ? tableNumber
            : nextTableNumber,
        },
        editor
      );
      setTables((prev) => [...prev, created]);
      setShowAddModal(false);
      toast.success(`Added table ${created.tableNumber}`);
    } catch (err) {
      console.error("Error creating table:", err);
      toast.error("Failed to create table");
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
      // Keep the modal's table reference in sync so the seated list updates live.
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

  // Candidates for the assign modal: formations matching the query, not already
  // seated at this table.
  const assignCandidates = useMemo(() => {
    if (!assignTable) return [];
    const q = assignSearch.trim().toLowerCase();
    const current = new Set(assignTable.formations);
    return formationsList
      .filter((f) => !current.has(f.id))
      .filter((f) => !q || `${f.teamName ?? ""} ${f.id}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [assignTable, assignSearch, formationsList]);

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
          + Add table
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="card p-10 text-center text-white/60">
          No tables yet. Click <span className="text-white">+ Add table</span> to
          create one.
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
                    onDelete={() => setConfirmDeleteTable(table)}
                    removeBusy={removeBusy}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add-table modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !creating && setShowAddModal(false)}
        >
          <div
            className="card p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-semibold text-white">Add table</h3>
              <p className="text-sm text-white/60 mt-1">
                Creates an empty table. Assign teams to it afterwards.
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

            <div className="flex gap-3">
              <label className="flex-1">
                <span className="text-xs text-white/50">Capacity (seats)</span>
                <input
                  type="number"
                  min={1}
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="input w-full mt-1"
                />
              </label>
              <label className="flex-1">
                <span className="text-xs text-white/50">Table number</span>
                <input
                  type="number"
                  min={0}
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="input w-full mt-1"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                disabled={creating || !newLocation.trim()}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating…" : "Create table"}
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
            className="card p-6 w-full max-w-lg flex flex-col max-h-[80vh]"
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

            <input
              autoFocus
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
                        <p className="text-xs text-white/40 font-mono truncate">
                          {f.id}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs text-white/60">
                          {f.members.length} member
                          {f.members.length === 1 ? "" : "s"}
                        </span>
                        {atOther && (
                          <p className="text-xs text-amber-300/90 whitespace-nowrap">
                            at Table {elsewhere!.tableNumber}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end mt-3">
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
  onDelete,
  removeBusy,
}: {
  view: TableView;
  onAssign: () => void;
  onRemoveFormation: (formationId: string) => void;
  onDelete: () => void;
  removeBusy: string | null;
}) {
  const { table, assigned, seats, filled, isMixed, overCapacity } = view;
  const totalSquares = Math.max(table.capacity, filled);
  const cols = Math.max(1, Math.ceil(Math.sqrt(totalSquares)));

  return (
    <div className="w-56 rounded-lg border border-white/15 bg-white/[0.03] p-3 flex flex-col gap-2">
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
