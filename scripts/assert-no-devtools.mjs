#!/usr/bin/env node
/**
 * Runs automatically after `npm run build` (npm "postbuild").
 * Fails the build if developer routes (/dev, /api/dev/*) are present in a build where
 * developer tools must be off — i.e. any production deployment.
 * Mirrors src/config/devtools.ts (kept in sync by tests/unit/devtools.test.ts).
 */
import { existsSync, readFileSync } from "node:fs";

const PRODUCTION_ORIGINS = ["https://heramb.study", "https://www.heramb.study"];

export function devToolsAllowed(env = process.env) {
  if (env.NODE_ENV === "development") return true;
  if (env.HERAMB_DEV_TOOLS !== "true") return false;
  if (env.VERCEL_ENV === "production") return false;
  const site = (env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "").toLowerCase();
  return !PRODUCTION_ORIGINS.includes(site);
}

export function devRoutesIn(manifest) {
  return Object.values(manifest).filter((route) => route === "/dev" || route.startsWith("/dev/") || route.startsWith("/api/dev"));
}

function main() {
  const file = ".next/app-path-routes-manifest.json";
  if (!existsSync(file)) {
    console.error(`[assert-no-devtools] ${file} not found — run after "next build".`);
    process.exit(1);
  }
  const found = devRoutesIn(JSON.parse(readFileSync(file, "utf8")));
  // Build-time NODE_ENV is always "production" for `next build`.
  const allowed = devToolsAllowed({ ...process.env, NODE_ENV: "production" });
  if (found.length && !allowed) {
    console.error(`[assert-no-devtools] FAILED: developer routes are in a production build: ${found.join(", ")}`);
    process.exit(1);
  }
  console.log(found.length ? `[assert-no-devtools] developer routes included (preview build with HERAMB_DEV_TOOLS=true): ${found.join(", ")}` : "[assert-no-devtools] OK — no developer routes in this build.");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
