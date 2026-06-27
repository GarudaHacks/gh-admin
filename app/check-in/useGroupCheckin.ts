"use client";

import { useRef, useState } from "react";
import type { CheckInResponse } from "@/lib/checkin-types";

export interface TeamMemberCheckin {
    name: string;
    email: string;
    status: string;
    /** The teammate had already been checked in before this scan. */
    alreadyCheckedIn: boolean;
    /** Admin has eyeballed this teammate's ID against their record. */
    verified: boolean;
}

type OkResult = Extract<CheckInResponse, { ok: true }>;

/**
 * Shared state for the group check-in: the roster of teammates scanned during
 * `doGroupCheckin`, then verified during `checkOtherMembers`. Lives in the page
 * so both steps read and write the same list. Deduped by email.
 */
export function useGroupCheckin() {
    const [members, setMembers] = useState<TeamMemberCheckin[]>([]);
    // Mirror so addFromResult can dedupe synchronously across rapid scans.
    const membersRef = useRef(members);
    membersRef.current = members;

    /** Adds a scanned teammate. Returns false if they were already in the roster. */
    const addFromResult = (r: OkResult): boolean => {
        const email = r.hacker.email;
        if (membersRef.current.some((m) => m.email === email)) return false;
        const member: TeamMemberCheckin = {
            name: `${r.hacker.firstName} ${r.hacker.lastName}`,
            email,
            status: r.hacker.status,
            alreadyCheckedIn: r.alreadyCheckedIn,
            verified: false,
        };
        membersRef.current = [...membersRef.current, member];
        setMembers(membersRef.current);
        return true;
    };

    const toggleVerified = (email: string) =>
        setMembers((prev) =>
            prev.map((m) =>
                m.email === email ? { ...m, verified: !m.verified } : m,
            ),
        );

    const remove = (email: string) =>
        setMembers((prev) => prev.filter((m) => m.email !== email));

    const reset = () => setMembers([]);

    return {
        members,
        count: members.length,
        allVerified: members.length > 0 && members.every((m) => m.verified),
        addFromResult,
        toggleVerified,
        remove,
        reset,
    };
}
