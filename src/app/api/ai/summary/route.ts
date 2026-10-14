import { handleAiSummary } from "@/lib/server/aiHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleAiSummary(req);
}
