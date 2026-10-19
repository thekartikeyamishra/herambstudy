import { handleSheetImport } from "@/lib/server/importHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleSheetImport(req);
}
