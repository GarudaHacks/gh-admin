import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { listConfirmedParticipants } from "@/lib/checkinTeam";

export const runtime = "nodejs";

/**
 * Returns all confirmed-RSVP participants for the check-in "add member" search.
 * The client fetches this once per session and filters locally.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { ok: false, reason: authResult.error.reason },
      { status: authResult.error.status }
    );
  }

  try {
    const participants = await listConfirmedParticipants();
    return NextResponse.json({ ok: true, participants });
  } catch (error) {
    console.error("Failed to list participants:", error);
    return NextResponse.json(
      { ok: false, reason: "Failed to load participants." },
      { status: 500 }
    );
  }
}
