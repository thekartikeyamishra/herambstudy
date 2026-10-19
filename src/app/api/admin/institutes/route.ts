import { handleAdminDelete, handleAdminList, handleAdminPatch } from "@/lib/server/instituteHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleAdminList(req);
}

export async function PATCH(req: Request) {
  return handleAdminPatch(req);
}

export async function DELETE(req: Request) {
  return handleAdminDelete(req);
}
