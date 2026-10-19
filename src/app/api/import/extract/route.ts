import { handleExtract, handleExtractCapabilities } from "@/lib/server/importHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return handleExtractCapabilities();
}

export async function POST(req: Request) {
  return handleExtract(req);
}
