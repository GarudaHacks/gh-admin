"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Circle, UserCheck, X, XCircle } from "lucide-react";
import QrScanner from "./QrScanner";
import { postCheckIn } from "./checkin-client";
import type { useGroupCheckin } from "./useGroupCheckin";

type Group = ReturnType<typeof useGroupCheckin>;

// Cooldown after each successful scan so the camera doesn't re-fire the same
// code while the admin moves to the next teammate's badge.
const SCAN_COOLDOWN_MS = 1200;

/**
 * Scans each teammate's QR in sequence, checking them in via the same API as
 * the lead hacker and accumulating them into the shared roster.
 */
export function GroupScanner({ group }: { group: Group }) {
    const busyRef = useRef(false);
    const [feedback, setFeedback] = useState<{
        kind: "ok" | "err";
        text: string;
    } | null>(null);

    const onScan = async (code: string) => {
        if (busyRef.current) return;
        busyRef.current = true;

        const data = await postCheckIn(code);
        if (!data.ok) {
            setFeedback({ kind: "err", text: data.reason });
        } else {
            const name = `${data.hacker.firstName} ${data.hacker.lastName}`;
            const added = group.addFromResult(data);
            setFeedback(
                added
                    ? { kind: "ok", text: `Added ${name}` }
                    : { kind: "err", text: `${name} is already on the list` },
            );
        }

        setTimeout(() => {
            busyRef.current = false;
        }, SCAN_COOLDOWN_MS);
    };

    return (
        <div>
            <QrScanner onScan={onScan} paused={false} />

            {feedback && (
                <p
                    className={`mt-3 flex items-center gap-2 text-sm ${
                        feedback.kind === "ok" ? "text-emerald-300" : "text-red-300"
                    }`}
                >
                    {feedback.kind === "ok" ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <XCircle className="h-4 w-4" />
                    )}
                    {feedback.text}
                </p>
            )}

            <p className="mt-3 text-xs text-white/40">
                {group.count === 0
                    ? "Scan each teammate's boarding pass."
                    : `${group.count} teammate${group.count === 1 ? "" : "s"} scanned`}
            </p>

            <GroupRoster group={group} mode="scan" className="mt-3" />
        </div>
    );
}

/**
 * Lists the scanned teammates. In "verify" mode each row has a toggle so the
 * admin can confirm they checked the teammate's ID.
 */
export function GroupRoster({
    group,
    mode,
    className = "",
}: {
    group: Group;
    mode: "scan" | "verify";
    className?: string;
}) {
    if (group.count === 0) {
        return (
            <p className={`text-sm text-white/40 ${className}`}>
                No teammates scanned yet.
            </p>
        );
    }

    return (
        <ul className={`space-y-2 ${className}`}>
            {group.members.map((m) => (
                <li
                    key={m.email}
                    className="flex items-center gap-3 rounded-lg bg-black/20 p-3"
                >
                    {mode === "verify" ? (
                        <button
                            type="button"
                            onClick={() => group.toggleVerified(m.email)}
                            className="shrink-0"
                            aria-label={m.verified ? "Mark unverified" : "Mark verified"}
                        >
                            {m.verified ? (
                                <UserCheck className="h-5 w-5 text-emerald-400" />
                            ) : (
                                <Circle className="h-5 w-5 text-white/30" />
                            )}
                        </button>
                    ) : (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    )}

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/90">
                            {m.name}
                        </p>
                        <p className="truncate text-xs text-white/50">{m.email}</p>
                    </div>

                    {m.alreadyCheckedIn && (
                        <span className="shrink-0 text-xs text-amber-300/80">
                            already in
                        </span>
                    )}

                    {mode === "scan" && (
                        <button
                            type="button"
                            onClick={() => group.remove(m.email)}
                            className="shrink-0 text-white/30 hover:text-red-300"
                            aria-label="Remove"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}
