#!/usr/bin/env node
/**
 * Stale-file guard (runs before every build as "prebuild").
 *
 * Updating the repository by copying a release zip over it ADDS and REPLACES files but never
 * DELETES ones a newer release removed. Those leftovers are still type-checked by `next build`
 * and can break a deployment (e.g. an old developer route importing a function that no longer
 * exists). This script compares the code files in the repository with
 * scripts/release-manifest.json and:
 *   - FAILS if an unlisted TypeScript/JavaScript file would be compiled or type-checked,
 *     printing the exact commands to remove it;
 *   - only WARNS about other unlisted files.
 *
 * Added a file on purpose? Run `npm run release:manifest` and commit the updated manifest.
 * Emergency override (not recommended): ALLOW_UNLISTED_FILES=true.
 *
 *   node scripts/check-release-files.mjs           check (default)
 *   node scripts/check-release-files.mjs --write   regenerate the manifest from the current tree
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const manifestPath = join(root, "scripts", "release-manifest.json");

// Folders whose code files the build can pick up (tsconfig includes **/*.ts and **/*.tsx).
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", "video", "out", "coverage", "test-results", "playwright-report", "blob-report", ".firebase", "exports"]);
const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const IGNORE_FILES = new Set(["next-env.d.ts"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (CODE.test(name) && !IGNORE_FILES.has(name) && !name.endsWith(".tsbuildinfo")) {
      out.push(relative(root, full).split(sep).join("/"));
    }
  }
  return out;
}

const files = walk(root).sort();

if (process.argv.includes("--write")) {
  writeFileSync(manifestPath, JSON.stringify({ note: "Code files shipped in this release. Regenerate with: npm run release:manifest", files }, null, 2) + "\n");
  console.log(`[release-files] Manifest written: ${files.length} code files.`);
  process.exit(0);
}

if (!existsSync(manifestPath)) {
  console.warn("[release-files] No scripts/release-manifest.json — skipping the stale-file check.");
  process.exit(0);
}

const listed = new Set(JSON.parse(readFileSync(manifestPath, "utf8")).files ?? []);
const unlisted = files.filter((f) => !listed.has(f));
const missing = [...listed].filter((f) => !files.includes(f));

if (missing.length) {
  console.warn(`[release-files] ${missing.length} file(s) from the release are missing (incomplete copy?):`);
  for (const f of missing.slice(0, 20)) console.warn(`  - ${f}`);
}

if (!unlisted.length) {
  console.log(`[release-files] OK — ${files.length} code files, no leftovers from older releases.`);
  process.exit(0);
}

const autoFix = process.argv.includes("--fix") || process.env.VERCEL === "1" || process.env.CI === "true" || process.env.CI === "1";

if (autoFix) {
  console.warn(`\n[release-files] Removing ${unlisted.length} leftover code file(s) from older releases before building:`);
  for (const f of unlisted) {
    rmSync(join(root, f), { force: true });
    console.warn(`  - removed ${f}`);
  }
  console.warn(
    process.argv.includes("--fix")
      ? "\n[release-files] Done. Now commit so GitHub drops them too:  git add -A  then  git commit -m \"Remove old files\""
      : "\n[release-files] This build continues. To clean GitHub as well, run `npm run clean:stale` on your computer and commit.\n",
  );
  process.exit(0);
}

console.error(`\n[release-files] Found ${unlisted.length} code file(s) that are NOT part of this release:`);
for (const f of unlisted) console.error(`  - ${f}`);
console.error(
  [
    "",
    "These are leftovers from an older version (pasting a new release over the folder never",
    "deletes files that a newer release removed). They can break the build.",
    "",
    "Fix (from the project folder, e.g. E:\\heramb-study):",
    "  npm run clean:stale",
    "  git add -A",
    '  git commit -m "Remove old files"',
    "",
    "Added one of them on purpose? Run `npm run release:manifest` and commit the manifest instead.",
    "",
  ].join("\n"),
);
process.exit(1);
