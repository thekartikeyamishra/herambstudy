import { NextResponse } from "next/server";
import { getBackend } from "@/lib/server/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports only coarse status — never configuration values or secrets. */
export async function GET() {
  const backend = getBackend();
  return NextResponse.json(
    { ok: true, storage: backend.kind === "unavailable" ? "unavailable" : backend.kind },
    { headers: { "Cache-Control": "no-store" } },
  );
}
