#!/usr/bin/env node
/**
 * Production smoke test — run against a PRODUCTION build (`npm run build && npm start`)
 * or the live site:  npm run smoke:prod -- http://localhost:3000
 *                    npm run smoke:prod -- https://heramb.study
 * Proves developer tools are absent and the main pages, APIs and SEO files respond.
 */
const base = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");
const checks = [
  // Developer tools must not exist.
  ["/dev", 404],
  ["/dev/crash", 404],
  ["/api/dev/state", 404],
  // Public pages and files.
  ["/", 200],
  ["/resources/class-test-analyser", 200],
  ["/tracker", 200],
  ["/pilot", 200],
  ["/r", 200],
  ["/me", 200],
  ["/sitemap.xml", 200],
  ["/robots.txt", 200],
  ["/manifest.webmanifest", 200],
  ["/api/health", 200],
  ["/api/invite", 405],
];

let failed = 0;
for (const [path, want] of checks) {
  let got;
  try {
    got = (await fetch(base + path, { redirect: "manual" })).status;
  } catch (err) {
    got = `error (${err.cause?.code ?? err.message})`;
  }
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${path.padEnd(34)} expected ${want}, got ${got}`);
}

// No developer link or text anywhere in the home page or the sitemap.
for (const path of ["/", "/sitemap.xml"]) {
  const text = await (await fetch(base + path)).text().catch(() => "");
  const leaked = /Developer console|\/dev["'<\s]|api\/dev/.test(text);
  if (leaked) failed++;
  console.log(`${leaked ? "FAIL" : "PASS"}  ${path.padEnd(34)} contains no developer links`);
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll production smoke checks passed.");
process.exit(failed ? 1 : 0);
