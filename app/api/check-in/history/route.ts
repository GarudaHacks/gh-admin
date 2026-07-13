import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { listCheckInHistory } from "@/lib/checkinTeam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the check-in history (all checked-in users, newest first) for the
 * history view. Photo URLs are the stored private URLs; the client signs them.
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
    const history = await listCheckInHistory();
    return NextResponse.json({ ok: true, history });
  } catch (error) {
    console.error("Failed to load check-in history:", error);
    return NextResponse.json(
      { ok: false, reason: "Failed to load check-in history." },
      { status: 500 }
    );
  }
}
