import { NextResponse } from "next/server";
import { CORS } from "@/lib/assistant/mcp";
import { runTool, TOOLS } from "@/lib/assistant/tools";
import { clientIp, hashKey } from "@/lib/server/http";
import { instanceLimiter } from "@/lib/server/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 512 * 1024;
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...CORS };

/** REST form of the assistant tools, for custom GPT Actions (see /openapi.json). */
export async function POST(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!TOOLS.some((t) => t.name === name)) return NextResponse.json({ ok: false, error: "Unknown tool." }, { status: 404, headers });
  const limit = await instanceLimiter().hit(hashKey("toolsapi", "ip", clientIp(req)), 600, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok: false, error: "Too many requests. Please try again in a few minutes." }, { status: 429, headers });
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413, headers });
  let args: unknown;
  try {
    args = JSON.parse(text || "{}");
  } catch {
    return NextResponse.json({ ok: false, error: "Send a JSON body." }, { status: 400, headers });
  }
  if (!args || typeof args !== "object" || Array.isArray(args)) return NextResponse.json({ ok: false, error: "Send a JSON object." }, { status: 400, headers });
  const r = runTool(name, args as Record<string, unknown>);
  console.info("[tools-api]", { name, bytes: text.length, ok: r.ok });
  return r.ok
    ? NextResponse.json({ ok: true, answer: r.text, data: r.structured }, { headers })
    : NextResponse.json({ ok: false, error: r.text }, { status: 422, headers });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}
