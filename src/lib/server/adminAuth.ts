import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Owner dashboard session — production-safe, no accounts needed.
 *
 * - Enabled only when OWNER_DASHBOARD_PASSWORD is set (≥ 12 characters).
 * - A correct password sets an HttpOnly, SameSite=Strict cookie holding
 *   "<expiry>.<HMAC(expiry)>". The HMAC key is derived from the password, so changing
 *   the password signs everyone out.
 * - No password, no dashboard: every admin endpoint answers 404.
 */
export const OWNER_COOKIE = "heramb_owner";
export const OWNER_SESSION_SECONDS = 12 * 60 * 60;

type Env = Record<string, string | undefined>;

export function ownerPassword(env: Env = process.env): string | null {
  const p = env.OWNER_DASHBOARD_PASSWORD ?? "";
  return p.length >= 12 ? p : null;
}

function key(password: string, env: Env): Buffer {
  return createHash("sha256").update(`owner-session|${password}|${env.RATE_LIMIT_SALT ?? ""}`).digest();
}

export function passwordMatches(candidate: string, env: Env = process.env): boolean {
  const p = ownerPassword(env);
  if (!p || typeof candidate !== "string") return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(p).digest();
  return timingSafeEqual(a, b);
}

export function signSession(now = Date.now(), env: Env = process.env): string | null {
  const p = ownerPassword(env);
  if (!p) return null;
  const exp = Math.floor(now / 1000) + OWNER_SESSION_SECONDS;
  const mac = createHmac("sha256", key(p, env)).update(String(exp)).digest("base64url");
  return `${exp}.${mac}`;
}

export function verifySession(value: string | null | undefined, now = Date.now(), env: Env = process.env): boolean {
  const p = ownerPassword(env);
  if (!p || !value) return false;
  const m = /^(\d{9,11})\.([A-Za-z0-9_-]{20,100})$/.exec(value);
  if (!m) return false;
  const exp = Number(m[1]);
  if (exp * 1000 < now) return false;
  const expected = Buffer.from(createHmac("sha256", key(p, env)).update(m[1]!).digest("base64url"));
  const given = Buffer.from(m[2]!);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function sessionCookie(value: string, maxAge = OWNER_SESSION_SECONDS): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${OWNER_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function isOwner(req: Request): boolean {
  return verifySession(readCookie(req, OWNER_COOKIE));
}
