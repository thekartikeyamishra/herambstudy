/**
 * DEVELOPER TOOLS ONLY — not part of production builds (".dev.ts" extension).
 * GET: submissions in the in-memory store, the dev inbox and environment status.
 * POST {"action":"reset"}: clear them (and rate limits).
 */
import { NextResponse } from "next/server";
import { devToolsEnabled } from "@/config/devtools";
import { devReset, devSnapshot } from "@/lib/server/devState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404 });
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function GET() {
  if (!devToolsEnabled()) return notFound();
  return NextResponse.json(devSnapshot(), { headers });
}

export async function POST(req: Request) {
  if (!devToolsEnabled()) return notFound();
  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== "reset") return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400, headers });
  devReset();
  return NextResponse.json({ ok: true }, { headers });
}
