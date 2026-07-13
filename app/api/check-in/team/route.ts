import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { editTeamMember, type TeamEditError } from "@/lib/checkinTeam";

export const runtime = "nodejs";

const REASONS: Record<TeamEditError, { status: number; reason: string }> = {
  not_found: { status: 404, reason: "Team not found." },
  team_full: { status: 400, reason: "Team is full (max 4 members)." },
  already_member: { status: 400, reason: "Already on this team." },
  not_member: { status: 400, reason: "Not on this team." },
};

/**
 * Adds or removes a member on a team in the `formations` collection, used by the
 * check-in "Confirm Team" step. Body: { teamId, uid, action, leadUid }.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { ok: false, reason: authResult.error.reason },
      { status: authResult.error.status }
    );
  }

  let body: {
    teamId?: unknown;
    uid?: unknown;
    action?: unknown;
    leadUid?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Malformed request." },
      { status: 400 }
    );
  }

  const { teamId, uid, action, leadUid } = body;
  if (
    typeof teamId !== "string" ||
    typeof uid !== "string" ||
    (action !== "add" && action !== "remove")
  ) {
    return NextResponse.json(
      { ok: false, reason: "Missing or invalid teamId / uid / action." },
      { status: 400 }
    );
  }

  const result = await editTeamMember(
    teamId,
    uid,
    action,
    authResult.admin.email,
    typeof leadUid === "string" ? leadUid : uid
  );

  if (typeof result === "string") {
    const { status, reason } = REASONS[result];
    return NextResponse.json({ ok: false, reason }, { status });
  }

  return NextResponse.json({ ok: true, team: result });
}
