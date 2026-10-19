import { handleInstituteStats } from "@/lib/server/instituteHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleInstituteStats(req);
}
