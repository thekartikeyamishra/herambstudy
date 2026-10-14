// DEVELOPMENT ONLY — excluded from production builds.
import { NextResponse } from "next/server";
import { devToolsEnabled } from "@/lib/dev/env";
import { signToken } from "@/lib/server/email";
import { isAllowedOrigin, requestIdForEmail } from "@/lib/server/http";
import { emailSchema, normalizeEmail } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Signed confirm / unsubscribe links for an invite request, to test email flows without a mailbox. */
export async function POST(req: Request) {
  if (!devToolsEnabled()) return new NextResponse(null, { status: 404 });
  if (!isAllowedOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const parsed = emailSchema.safeParse(body.email);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter a valid email." }, { status: 422 });
  const id = requestIdForEmail(normalizeEmail(parsed.data));
  const confirm = signToken("confirm", id);
  const unsubscribe = signToken("unsubscribe", id);
  if (!confirm || !unsubscribe) {
    return NextResponse.json({ ok: false, message: "Set EMAIL_TOKEN_SECRET (32+ characters) in .env.development.local, then restart." }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    confirm: `/email/confirm?id=${id}&t=${confirm}`,
    unsubscribe: `/email/unsubscribe?id=${id}&t=${unsubscribe}`,
    tampered: `/email/confirm?id=${id}&t=${confirm.slice(0, -2)}xx`,
  });
}
