// DEVELOPMENT ONLY — this file is excluded from production builds (see pageExtensions in next.config.ts).
import { NextResponse } from "next/server";
import { devToolsEnabled } from "@/lib/dev/env";
import { devResetMemory } from "@/lib/server/backend";
import { clearDevOutbox } from "@/lib/server/email";
import { isAllowedOrigin } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!devToolsEnabled()) return new NextResponse(null, { status: 404 });
  if (!isAllowedOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const what = new URL(req.url).searchParams.get("what") ?? "all";
  if (what === "all" || what === "memory") devResetMemory();
  if (what === "all" || what === "outbox") clearDevOutbox();
  return NextResponse.json({ ok: true, reset: what });
}
