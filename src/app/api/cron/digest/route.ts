import { handleDigestCron } from "@/lib/server/instituteHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called by Vercel Cron (see vercel.json) with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  return handleDigestCron(req);
}
