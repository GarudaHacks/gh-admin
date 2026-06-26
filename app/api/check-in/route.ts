import { NextRequest, NextResponse } from "next/server";
import { validateAndCheckIn } from "@/lib/checkin";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { ok: false, reason: authResult.error.reason },
      { status: authResult.error.status }
    );
  }

  let code: unknown;
  try {
    ({ code } = await req.json());
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Malformed request." },
      { status: 400 }
    );
  }

  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { ok: false, reason: "Missing scan value." },
      { status: 400 }
    );
  }

  const result = await validateAndCheckIn(code, authResult.admin);
  return NextResponse.json(result);
}
