/**
 * Developer tools gate — the single place that decides whether the developer
 * console (/dev), dev APIs, the dev email inbox and the dev link-signing secret exist.
 *
 * Three independent layers keep them off the live site:
 *  1. BUILD: dev routes live in `*.dev.tsx` / `*.dev.ts` files. next.config.ts only
 *     treats that extension as a page when this function returns true at build time,
 *     so a production build does not contain the routes at all.
 *  2. RUNTIME: every dev route and dev behaviour calls this again and returns 404 /
 *     does nothing when false.
 *  3. POSTBUILD: scripts/assert-no-devtools.mjs fails the build if dev routes are
 *     present in a build that shouldn't have them.
 *
 * Enabled when:
 *  - running `next dev` (NODE_ENV=development), or
 *  - HERAMB_DEV_TOOLS=true on a NON-production deployment (e.g. a Vercel preview).
 * Never enabled on the production deployment or the production domain, even if the
 * flag is set there by mistake.
 */
export const PRODUCTION_ORIGINS = ["https://heramb.study", "https://www.heramb.study"] as const;

type Env = Record<string, string | undefined>;

export function devToolsEnabled(env: Env = process.env): boolean {
  if (env.NODE_ENV === "development") return true;
  if (env.HERAMB_DEV_TOOLS !== "true") return false;
  if (env.VERCEL_ENV === "production") return false;
  const site = (env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "").toLowerCase();
  if ((PRODUCTION_ORIGINS as readonly string[]).includes(site)) return false;
  return true;
}

/**
 * Fixed secret for signing confirm/unsubscribe links when developer tools are on and
 * no EMAIL_TOKEN_SECRET is configured. Unusable in production because devToolsEnabled()
 * is false there.
 */
export const DEV_EMAIL_TOKEN_SECRET = "heramb-dev-only-email-token-secret-never-use-in-production";
