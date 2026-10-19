import { NextResponse } from "next/server";
import { getBackend } from "@/lib/server/backend";
import pkg from "../../../../package.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports only coarse status — never configuration values or secrets. */
export async function GET() {
  const backend = getBackend();
  return NextResponse.json(
    {
      ok: true,
      storage: backend.kind === "unavailable" ? "unavailable" : backend.kind,
      // Lets you confirm which release and Git commit is live (both are public anyway).
      version: pkg.version,
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
