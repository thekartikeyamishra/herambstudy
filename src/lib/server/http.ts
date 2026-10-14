import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "invalid_input"
  | "spam_rejected"
  | "too_fast"
  | "rate_limited"
  | "forbidden_origin"
  | "payload_too_large"
  | "unsupported_media_type"
  | "service_unavailable"
  | "internal_error";

export type ApiSuccess = { ok: true; message: string };
export type ApiFailure = {
  ok: false;
  error: { code: ApiErrorCode; message: string; fieldErrors?: Record<string, string> };
};
export type ApiResponse = ApiSuccess | ApiFailure;

export const MAX_BODY_BYTES = 16 * 1024;

export function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: { fieldErrors?: Record<string, string>; retryAfterSec?: number } = {},
) {
  const body: ApiFailure = { ok: false, error: { code, message, ...(extra.fieldErrors ? { fieldErrors: extra.fieldErrors } : {}) } };
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (extra.retryAfterSec) headers["Retry-After"] = String(extra.retryAfterSec);
  return NextResponse.json(body, { status, headers });
}

export function succeed(message: string, status = 200) {
  const body: ApiSuccess = { ok: true, message };
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * CSRF / cross-site protection for JSON endpoints.
 * Browsers always send Origin on cross-origin POSTs; we require it to match the host.
 * Missing Origin is tolerated only outside production (curl, tests).
 */
export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && originHost === host) return true;
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).host === originHost;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Client IP for rate limiting. Which X-Forwarded-For entry is trustworthy depends on the host:
 *  - Vercel (default, "first"): Vercel overwrites the header, so the first entry is the client.
 *  - Google Cloud load balancers / Firebase App Hosting ("gcp"): the LB *appends*
 *    "<client>, <lb>", so earlier entries can be forged; use the second-to-last entry.
 * Set CLIENT_IP_MODE=gcp on Firebase App Hosting / Cloud Run.
 */
export function clientIp(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const parts = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length) {
    if (process.env.CLIENT_IP_MODE === "gcp") return parts.length >= 2 ? parts[parts.length - 2]! : parts[0]!;
    return parts[0]!;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Salted SHA-256 so raw IPs and emails are never used as storage keys. */
export function hashKey(...parts: string[]): string {
  const salt = process.env.RATE_LIMIT_SALT || process.env.FIREBASE_PROJECT_ID || "heramb-dev-salt";
  return createHash("sha256").update([salt, ...parts].join("|")).digest("hex");
}

/** Deterministic request id for an email — the basis of duplicate handling. */
export function requestIdForEmail(normalizedEmail: string): string {
  return createHash("sha256").update(`invite|${normalizedEmail}`).digest("hex").slice(0, 32);
}

type BodyResult = { ok: true; data: unknown } | { ok: false; response: NextResponse };

/** Reads a JSON body with content-type and size limits. */
export async function readJsonBody(req: Request): Promise<BodyResult> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return { ok: false, response: fail(415, "unsupported_media_type", "Please send JSON.") };
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    return { ok: false, response: fail(413, "payload_too_large", "That submission is too large.") };
  }
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return { ok: false, response: fail(413, "payload_too_large", "That submission is too large.") };
  }
  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: fail(422, "invalid_input", "We couldn't read that submission.") };
  }
}

/** Minimum time between first render and submit; filters naive bots. */
export const MIN_FILL_MS = 2500;

/**
 * True when the form was submitted implausibly fast, or the timing field is missing
 * (every genuine form on this site sends it; omitting it was a way to skip this check).
 */
export function submittedTooFast(startedAt: number | undefined, now = Date.now()): boolean {
  if (typeof startedAt !== "number") return true;
  const elapsed = now - startedAt;
  return elapsed >= 0 && elapsed < MIN_FILL_MS;
}
