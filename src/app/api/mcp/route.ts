import { NextResponse } from "next/server";
import { CORS, handleMcpPost } from "@/lib/assistant/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Remote MCP endpoint for ChatGPT apps, Grok custom connectors and Claude (Streamable HTTP). */
export async function POST(req: Request) {
  return handleMcpPost(req);
}

// Stateless server: no server-initiated stream and no sessions to end.
export function GET() {
  return NextResponse.json({ error: "Use POST (MCP Streamable HTTP)." }, { status: 405, headers: { Allow: "POST" } });
}
export function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}
