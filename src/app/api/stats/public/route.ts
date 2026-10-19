import { handlePublicStats } from "@/lib/server/instituteHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handlePublicStats();
}
