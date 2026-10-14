#!/usr/bin/env node
/**
 * Live smoke test against a running server — edge cases for every API, plus the
 * production-safety check that developer routes do not exist.
 *
 *   npm run dev            (in one terminal)      then   npm run smoke
 *   npm run build; npm start                      then   npm run smoke:prod
 *
 * Options: --base=http://localhost:3000   --production (expect dev routes to be 404)
 * Exit code 1 if any check fails.
 */
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const BASE = arg("base", "http://localhost:3000").replace(/\/+$/, "");
const PRODUCTION = process.argv.includes("--production");
const ORIGIN = BASE;
const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
let ipN = 0;

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
  } catch (err) {
    results.push({ name, ok: false, detail: err instanceof Error ? err.message : String(err) });
  }
}
function expectStatus(res, allowed) {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!list.includes(res.status)) throw new Error(`expected ${list.join(" or ")}, got ${res.status}`);
  return `HTTP ${res.status}`;
}
const post = (path, body, { origin = ORIGIN, type = "application/json", raw } = {}) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      ...(type ? { "Content-Type": type } : {}),
      ...(origin ? { Origin: origin } : {}),
      // A different fake client address per request keeps rate limits from interfering between checks.
      "X-Forwarded-For": `203.0.113.${(ipN++ % 250) + 1}`,
    },
    body: raw ?? JSON.stringify(body),
  });

const invite = (over = {}) => ({
  email: `smoke-${unique}@example.com`,
  role: "teacher",
  country: "IN",
  useCase: "track_progress",
  privacyAcknowledged: true,
  marketingConsent: true,
  startedAt: Date.now() - 30_000,
  ...over,
});
const pilot = (over = {}) => ({
  contactName: "Smoke Test",
  role: "owner",
  email: `pilot-${unique}@example.com`,
  institutionType: "school",
  instituteName: "Smoke Test School",
  city: "Lucknow",
  country: "IN",
  studentCount: "under_50",
  exams: ["boards"],
  testFrequency: "weekly",
  startWindow: "exploring",
  privacyAcknowledged: true,
  startedAt: Date.now() - 30_000,
  ...over,
});

let storageOk = false;
await check("GET /api/health returns JSON", async () => {
  const res = await fetch(`${BASE}/api/health`);
  const body = await res.json();
  storageOk = body.storage !== "unavailable";
  return `${expectStatus(res, 200)} storage=${body.storage}`;
});
// With no storage configured, an honest 503 is the correct answer for valid submissions.
const saved = () => (storageOk ? 200 : 503);

await check("invite: valid request", async () => expectStatus(await post("/api/invite", invite()), saved()));
await check("invite: duplicate gets the identical response (no email enumeration)", async () => {
  const a = await (await post("/api/invite", invite())).json();
  const b = await (await post("/api/invite", invite({ email: `  SMOKE-${unique}@EXAMPLE.com ` }))).json();
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error("responses differ");
  return "identical";
});
await check("invite: missing timing field is rejected", async () => expectStatus(await post("/api/invite", invite({ startedAt: undefined })), 429));
await check("invite: submitted in 0.5 s is rejected", async () => expectStatus(await post("/api/invite", invite({ startedAt: Date.now() - 500 })), 429));
await check("invite: honeypot filled is rejected", async () => expectStatus(await post("/api/invite", invite({ website: "http://spam.example" })), 400));
await check("invite: foreign Origin is blocked", async () => expectStatus(await post("/api/invite", invite(), { origin: "https://evil.example" }), 403));
if (PRODUCTION) await check("invite: missing Origin is blocked in production", async () => expectStatus(await post("/api/invite", invite(), { origin: null }), 403));
await check("invite: non-JSON is refused", async () => expectStatus(await post("/api/invite", null, { type: "text/plain", raw: "email=a@b.co" }), 415));
await check("invite: 20 KB body is refused", async () => expectStatus(await post("/api/invite", invite({ name: "x".repeat(20_000) })), 413));
await check("invite: broken JSON is refused", async () => expectStatus(await post("/api/invite", null, { raw: "{not json" }), 422));
await check("invite: invalid email names the field", async () => {
  const res = await post("/api/invite", invite({ email: "nope" }));
  const body = await res.json();
  if (!body.error?.fieldErrors?.email) throw new Error("no email field error");
  return expectStatus(res, 422);
});
await check("invite: line break in name is refused", async () => expectStatus(await post("/api/invite", invite({ email: `nl-${unique}@example.com`, name: "Ravi\r\nBcc: x@y.z" })), 422));
await check("invite: GET is not allowed (no way to read the list)", async () => expectStatus(await fetch(`${BASE}/api/invite`), 405));
await check("pilot: valid application", async () => expectStatus(await post("/api/pilot", pilot()), saved()));
await check("pilot: missing institution type", async () => expectStatus(await post("/api/pilot", pilot({ institutionType: undefined })), 422));
await check("pilot: line break in city is refused", async () => expectStatus(await post("/api/pilot", pilot({ city: "Lucknow\nSubject: hi" })), 422));
await check("contact: valid message", async () =>
  expectStatus(await post("/api/contact", { name: "Smoke", email: `c-${unique}@example.com`, topic: "general", message: "Smoke test message, please ignore.", privacyAcknowledged: true, startedAt: Date.now() - 30_000 }), saved()),
);
await check("email confirm: forged token is refused", async () => expectStatus(await post("/api/email/confirm", { id: "a".repeat(32), t: "x".repeat(43) }), [400, 503]));
await check("email unsubscribe: one-click without the RFC 8058 body is refused", async () =>
  expectStatus(await post(`/api/email/unsubscribe?id=${"a".repeat(32)}&t=${"x".repeat(43)}`, null, { type: "application/x-www-form-urlencoded", origin: null, raw: "hello" }), 415),
);
await check("AI summary: malformed input is refused (no model call)", async () => expectStatus(await post("/api/ai/summary", { students: "lots" }), 422));
await check("security headers on /", async () => {
  const res = await fetch(`${BASE}/`);
  const h = res.headers;
  for (const name of ["content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy"]) {
    if (!h.get(name)) throw new Error(`missing ${name}`);
  }
  if (h.get("x-powered-by")) throw new Error("x-powered-by present");
  if (PRODUCTION && !h.get("strict-transport-security")) throw new Error("missing HSTS in production");
  return "present";
});
await check("a student report page loads without exposing data to the server", async () => expectStatus(await fetch(`${BASE}/r`), 200));

// ── Developer routes: must exist in dev, must NOT exist in production ──────
const devPaths = [
  ["GET", "/dev"],
  ["GET", "/dev/crash"],
  ["GET", "/api/dev/fixtures/README.md"],
  ["POST", "/api/dev/reset?what=nothing"], // "nothing" = existence check only; must not wipe test data
  ["POST", "/api/dev/links"],
];
for (const [method, path] of devPaths) {
  await check(`${PRODUCTION ? "production: does NOT exist" : "dev: exists"} — ${method} ${path}`, async () => {
    const res = method === "GET" ? await fetch(`${BASE}${path}`) : await post(path, { email: "a@b.co" });
    if (PRODUCTION) return expectStatus(res, 404);
    if (path === "/dev/crash") return expectStatus(res, 500); // intentional crash
    if (res.status === 404) throw new Error("dev route missing in development");
    return `HTTP ${res.status}`;
  });
}
await check("fixture download can't escape the fixtures folder", async () => {
  const res = await fetch(`${BASE}/api/dev/fixtures/..%2F..%2Fpackage.json`);
  if (res.status === 200) throw new Error("traversal returned a file!");
  return `HTTP ${res.status}`;
});

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  — ${r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} passed against ${BASE}${PRODUCTION ? " (production mode)" : ""}`);
process.exit(failed.length ? 1 : 0);
