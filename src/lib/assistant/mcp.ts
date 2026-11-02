/**
 * Remote MCP server (Streamable HTTP, stateless, JSON responses) for ChatGPT apps, Grok custom
 * connectors and Claude. Endpoint: POST /api/mcp. No accounts, no auth: the tools are read-only
 * calculations on data the user pastes; nothing is stored.
 */
import { NextResponse } from "next/server";
import pkg from "../../../package.json";
import { absoluteUrl } from "@/config/site";
import { clientIp, hashKey } from "@/lib/server/http";
import { instanceLimiter } from "@/lib/server/backend";
import { runTool, TOOLS } from "./tools";

export const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
const MAX_BYTES = 512 * 1024;

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
type RpcResponse = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string } };

const INSTRUCTIONS = [
  "Heramb.study turns a teacher's class test marks into a chapter-wise teaching plan.",
  "Use analyse_class_test when the user shares marks per chapter; convert_question_marks_to_chapters when marks are per question or OMR answers; compare_follow_up_test to check whether reteaching worked.",
  "Prefer roll numbers over student names. Return the plan in the user's language; Hindi is welcome.",
  `Student report links, printable QR slips and the institute dashboard are on the website: ${absoluteUrl("/resources/class-test-analyser")}`,
].join(" ");

function result(id: RpcResponse["id"], value: unknown): RpcResponse {
  return { jsonrpc: "2.0", id, result: value };
}
function error(id: RpcResponse["id"], code: number, message: string): RpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/** Handles one JSON-RPC message. Returns null for notifications (no reply). */
export function handleRpc(msg: unknown): RpcResponse | null {
  if (!msg || typeof msg !== "object" || (msg as RpcRequest).jsonrpc !== "2.0" || typeof (msg as RpcRequest).method !== "string") {
    return error(null, -32600, "Invalid request");
  }
  const m = msg as RpcRequest;
  const isNotification = m.id === undefined;
  const id = m.id ?? null;

  switch (m.method) {
    case "initialize": {
      const asked = typeof m.params?.protocolVersion === "string" ? (m.params.protocolVersion as string) : "";
      const version = (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(asked) ? asked : MCP_PROTOCOL_VERSIONS[0];
      return result(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "heramb-study", title: "Heramb.study: class test analyser", version: pkg.version, websiteUrl: absoluteUrl("/") },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return isNotification ? null : result(id, {});
    case "tools/list":
      return result(id, { tools: TOOLS });
    case "tools/call": {
      const name = typeof m.params?.name === "string" ? m.params.name : "";
      const args = m.params?.arguments && typeof m.params.arguments === "object" ? (m.params.arguments as Record<string, unknown>) : {};
      if (!TOOLS.some((t) => t.name === name)) return error(id, -32602, `Unknown tool: ${name}`);
      const r = runTool(name, args);
      return result(
        id,
        r.ok ? { content: [{ type: "text", text: r.text }], structuredContent: r.structured, isError: false } : { content: [{ type: "text", text: r.text }], isError: true },
      );
    }
    default:
      if (isNotification) return null; // e.g. notifications/initialized
      return error(id, -32601, `Method not found: ${m.method}`);
  }
}

/** Public, read-only tools: any origin may call them (browser-based MCP clients need CORS). */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Authorization",
};
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...CORS };

export async function handleMcpPost(req: Request): Promise<Response> {
  // Assistants call from shared cloud IPs, so the per-IP limit is generous; the body cap bounds work.
  const limit = await instanceLimiter().hit(hashKey("mcp", "ip", clientIp(req)), 600, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json(error(null, -32000, "Too many requests. Please try again in a few minutes."), { status: 429, headers });
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) return NextResponse.json(error(null, -32000, "Request too large."), { status: 413, headers });
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) return NextResponse.json(error(null, -32000, "Request too large."), { status: 413, headers });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(error(null, -32700, "Parse error"), { status: 400, headers });
  }
  const started = Date.now();
  const replies = (Array.isArray(body) ? body : [body]).map(handleRpc).filter((r): r is RpcResponse => r !== null);
  const methods = (Array.isArray(body) ? body : [body]).map((b) => (b as RpcRequest)?.method).join(",");
  console.info("[mcp]", { methods, bytes: text.length, ms: Date.now() - started });
  if (!replies.length) return new Response(null, { status: 202, headers });
  return NextResponse.json(Array.isArray(body) ? replies : replies[0], { headers });
}
