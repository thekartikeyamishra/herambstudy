/**
 * Developer tooling switch.
 *
 * Dev tools exist only when NODE_ENV is not "production". `next build` always sets
 * NODE_ENV=production (including Vercel/App Hosting previews), so nothing here can be
 * switched on in a deployed site by an environment variable. Dev-only routes are
 * additionally excluded from production builds via `pageExtensions` in next.config.ts.
 */
export function devToolsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production";
}
