// DEVELOPMENT ONLY — excluded from production builds.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { devToolsEnabled } from "@/lib/dev/env";
import { FIXTURES_DIR, safeFixturePath } from "@/lib/dev/fixtures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  tsv: "text/tab-separated-values; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  json: "application/json; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (!devToolsEnabled()) return new NextResponse(null, { status: 404 });
  const { path } = await ctx.params;
  const rel = safeFixturePath(path.join("/"));
  if (!rel) return new NextResponse("Bad path", { status: 400 });
  try {
    const data = readFileSync(join(FIXTURES_DIR, rel));
    const ext = rel.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(data, {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${rel.split("/").pop()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
