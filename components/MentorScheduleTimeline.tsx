'use client';

import { deleteMentorshipAppointment } from '@/lib/firebaseUtils';
import { getTimeZoneLabel } from '@/lib/helpers';
import { MentorshipAppointment } from '@/lib/types';
import { Check, Clock, Copy, Loader2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface MentorScheduleTimelineProps {
  appointments: MentorshipAppointment[];
  /** When provided, each slot gets a delete button; called after a successful delete. */
  onDeleted?: (id: string) => void;
  /** Read-only, denser layout — used for the preview beside the add-slot form. */
  compact?: boolean;
}

type StatusFilter = 'all' | 'booked' | 'free';

const isBooked = (a: MentorshipAppointment) => Boolean(a.hackerId || a.isBooked);

function timeLabel(epochSecond: number) {
  return new Date(epochSecond * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function dayKey(epochSecond: number) {
  const d = new Date(epochSecond * 1000);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(epochSecond: number) {
  return new Date(epochSecond * 1000).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function StatusPill({ booked }: { booked: boolean }) {
  return booked ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-300">
      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
      Booked
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full border border-muted-foreground" />
      Available
    </span>
  );
}

function LocationPill({ location }: { location: string }) {
  const online = location === 'online';
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs ${
        online
          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
          : 'border-sky-500/40 bg-sky-500/15 text-sky-300'
      }`}
    >
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

export default function MentorScheduleTimeline({
  appointments,
  onDeleted,
  compact = false,
}: MentorScheduleTimelineProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [pendingDelete, setPendingDelete] = useState<MentorshipAppointment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timeZone = getTimeZoneLabel();

  const copyId = async (id?: string) => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard can be blocked (e.g. insecure context) — the id is still visible to copy manually.
    }
  };

  const totals = useMemo(() => {
    const booked = appointments.filter(isBooked).length;
    return { total: appointments.length, booked, free: appointments.length - booked };
  }, [appointments]);

  const days = useMemo(() => {
    const filtered = appointments
      .filter((a) => {
        if (filter === 'booked') return isBooked(a);
        if (filter === 'free') return !isBooked(a);
        return true;
      })
      .slice()
      .sort((a, b) => a.startTime - b.startTime);

    const grouped = new Map<string, MentorshipAppointment[]>();
    for (const a of filtered) {
      const key = dayKey(a.startTime);
      const list = grouped.get(key);
      if (list) list.push(a);
      else grouped.set(key, [a]);
    }
    return Array.from(grouped.values());
  }, [appointments, filter]);

  const todayKey = dayKey(Date.now() / 1000);

  const handleDelete = async () => {
    if (!pendingDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteMentorshipAppointment(pendingDelete.id);
      onDeleted?.(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment');
    } finally {
      setIsDeleting(false);
    }
  };

  const FilterChip = ({ value, label }: { value: StatusFilter; label: string }) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        filter === value
          ? 'border-primary bg-primary/15 text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-primary/60'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Summary + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            <span className="font-semibold text-primary-foreground">{totals.total}</span> slots
          </span>
          <span className="flex items-center gap-1.5 text-green-300">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            {totals.booked} booked
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full border border-muted-foreground" />
            {totals.free} free
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FilterChip value="all" label="All" />
          <FilterChip value="booked" label="Booked" />
          <FilterChip value="free" label="Free" />
        </div>
      </div>

      {/* Timezone notice */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock size={13} />
        <span>
          All times shown in <span className="font-medium text-primary-foreground">{timeZone}</span>
        </span>
      </div>

      {/* Timeline */}
      {days.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No {filter !== 'all' ? filter : ''} slots to show.
        </div>
      ) : (
        <div
          className={`flex flex-col gap-6 ${
            compact ? 'max-h-[70vh] overflow-y-auto pr-1' : ''
          }`}
        >
          {days.map((slots) => {
            const key = dayKey(slots[0].startTime);
            const dayBooked = slots.filter(isBooked).length;
            return (
              <section key={key} className="flex flex-col gap-2">
                {/* Day header */}
                <div className="flex items-center gap-2 border-b border-border pb-1">
                  <h3 className="text-sm font-semibold text-primary-foreground">
                    {dayLabel(slots[0].startTime)}
                  </h3>
                  {key === todayKey && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      Today
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {dayBooked} booked · {slots.length - dayBooked} free
                  </span>
                </div>

                {/* Slots rail */}
                <ol className="flex flex-col">
                  {slots.map((slot, i) => {
                    const prev = slots[i - 1];
                    const gapMin =
                      prev && slot.startTime > prev.endTime
                        ? Math.round((slot.startTime - prev.endTime) / 60)
                        : 0;
                    const durationMin = Math.round((slot.endTime - slot.startTime) / 60);
                    const booked = isBooked(slot);

                    return (
                      <li key={slot.id ?? slot.startTime}>
                        {gapMin > 0 && (
                          <div className="flex">
                            <div className="w-16 shrink-0" />
                            <div className="border-l border-dashed border-border pl-4">
                              <span className="block py-1 text-[11px] italic text-muted-foreground">
                                {gapMin} min gap
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="flex">
                          {/* Time gutter */}
                          <div className="w-16 shrink-0 pt-2.5 text-right text-xs tabular-nums text-muted-foreground">
                            {timeLabel(slot.startTime)}
                          </div>
                          {/* Rail + block */}
                          <div className="relative border-l border-border pb-2 pl-4">
                            <span
                              className={`absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full ring-2 ring-background ${
                                booked ? 'bg-green-400' : 'bg-muted-foreground'
                              }`}
                            />
                            <div className="rounded-lg border border-border bg-card p-2.5">
                              <div className="flex items-center gap-2">
                                <StatusPill booked={booked} />
                                <LocationPill location={slot.location} />
                                <span className="ml-auto flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {timeLabel(slot.startTime)}–{timeLabel(slot.endTime)} ·{' '}
                                    {durationMin}m
                                  </span>
                                  {onDeleted && (
                                    <button
                                      onClick={() => setPendingDelete(slot)}
                                      className="rounded-full p-1 text-red-400 hover:bg-red-500/15"
                                      aria-label="Delete slot"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </span>
                              </div>
                              {!compact && booked && slot.hackerDescription && (
                                <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-primary-foreground">
                                    Inquiry:{' '}
                                  </span>
                                  {slot.hackerDescription}
                                </p>
                              )}
                              {slot.id && (
                                <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-[11px] text-muted-foreground">
                                  <span className="shrink-0">ID</span>
                                  <code className="truncate font-mono text-primary-foreground" title={slot.id}>
                                    {slot.id}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => copyId(slot.id)}
                                    className="ml-auto flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 hover:bg-zinc-50/10"
                                    aria-label="Copy slot ID"
                                  >
                                    {copiedId === slot.id ? (
                                      <>
                                        <Check size={12} /> Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} /> Copy
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-zinc-800 p-6">
            <h2 className="mb-2 text-lg font-semibold">Confirm Deletion</h2>
            <p className="mb-2 text-sm text-muted-foreground">
              Delete the slot on{' '}
              <span className="font-medium text-primary-foreground">
                {dayLabel(pendingDelete.startTime)}, {timeLabel(pendingDelete.startTime)}
              </span>
              ? This action cannot be undone.
            </p>
            {isBooked(pendingDelete) && (
              <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                This slot is already booked by a hacker.
              </p>
            )}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-60"
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="animate-spin" size={16} />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
