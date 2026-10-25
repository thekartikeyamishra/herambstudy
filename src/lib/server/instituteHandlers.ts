import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { codeFromRandom, CODE_PATTERN, foundingCap, isValidCode, normaliseCode, seatLabel } from "@/lib/institute/code";
import { dayKey, eventBatchSchema, sanitiseEvents, valueFeedbackSchema } from "@/lib/institute/events";
import { isPro, limitHistory } from "@/lib/institute/plan";
import { computeMetrics, type InstituteMetrics } from "@/lib/institute/metrics";
import { benchmarkMinOthers, chapterKey, computeBenchmark, shareSummarySchema, summaryId, type CityBenchmark } from "@/lib/institute/summary";
import { nextFollowUpDate } from "@/lib/institute/testDay";
import { fieldErrors, instituteJoinSchema, PRIVACY_NOTICE_VERSION } from "@/lib/validation/schemas";
import { getProvider } from "@/lib/ai/providers";
import { siteConfig } from "@/config/site";
import { isOwner, passwordMatches, sessionCookie, signSession, ownerPassword } from "./adminAuth";
import { getBackend, instanceLimiter } from "./backend";
import { actionUrl, deliver, emailConfig, runAfterResponse, signToken, verifyToken } from "./email";
import { clientIp, fail, hashKey, isAllowedOrigin, readJsonBody, submittedTooFast } from "./http";
import { instituteOwnerAlert, instituteWelcome, weeklyDigest } from "./instituteEmail";
import type { Backend, InstituteRecord, InstituteStore } from "./types";

const TEN_MIN = 10 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const noStore = { "Cache-Control": "no-store" };

const UNAVAILABLE =
  "We can't register institutes right now because our storage service isn't available. Nothing was saved — please try again later.";

function json(body: unknown, status = 200, headers: Record<string, string> = noStore) {
  return NextResponse.json(body, { status, headers });
}

async function burst(req: Request, scope: string, max: number, windowMs = TEN_MIN) {
  const r = await instanceLimiter().hit(hashKey(scope, "ip", clientIp(req)), max, windowMs);
  return r.allowed ? null : fail(429, "rate_limited", "Too many requests. Please wait a few minutes and try again.", { retryAfterSec: r.retryAfterSec });
}

const makeCode = () => {
  const bytes = randomBytes(64);
  let i = 0;
  return codeFromRandom(() => {
    if (i >= bytes.length) return randomBytes(1)[0]!;
    return bytes[i++]!;
  });
};

const today = () => dayKey(new Date());
const addDaysIso = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Institute info that is safe to show to anyone holding the code (no contact details). */
function publicInstitute(r: InstituteRecord, cap: number) {
  return {
    code: r.code,
    name: r.name,
    city: r.city,
    institutionType: r.institutionType,
    seat: r.foundingSeat,
    seatLabel: seatLabel(r.foundingSeat, cap),
    cap,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    weeklyDigest: r.weeklyDigest.granted && !r.weeklyDigest.withdrawnAt,
  };
}

async function metricsFor(store: InstituteStore, r: InstituteRecord): Promise<InstituteMetrics> {
  const usage = await store.usage(r.code);
  return computeMetrics({
    institute: { createdAt: r.createdAt.toISOString(), activatedAt: r.activatedAt ? dayKey(r.activatedAt) : null },
    days: usage.days,
    devices: usage.devices,
    feedback: usage.feedback,
    today: today(),
  });
}

/* ── POST /api/institutes — register a founding institute ─────────────── */

/**
 * Sign-ups per network per 10 minutes (RATE_LIMIT_JOIN_PER_IP, default 10). High enough for a
 * meetup where several heads join on one Wi-Fi; honeypot + timing checks stop scripts.
 */
function joinLimit(): number {
  const v = Number(process.env.RATE_LIMIT_JOIN_PER_IP);
  return Number.isInteger(v) && v > 0 && v <= 1000 ? v : 10;
}

export async function handleInstituteJoin(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "This request was blocked for security reasons.");
  const limited = await burst(req, "join", joinLimit() + 3);
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = instituteJoinSchema.safeParse(body.data);
  if (!parsed.success) return fail(422, "invalid_input", "Please check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  const input = parsed.data;
  if (input.website && input.website.length > 0) return fail(400, "spam_rejected", "This submission looked automated and was not saved.");
  if (submittedTooFast(input.startedAt)) return fail(429, "too_fast", "That was quick! Please check the details, then submit again.", { retryAfterSec: 3 });

  const backend = getBackend();
  if (backend.kind === "unavailable") {
    console.warn("[join] backend unavailable:", backend.reason);
    return fail(503, "service_unavailable", UNAVAILABLE, { retryAfterSec: 300 });
  }
  try {
    const shared = await backend.limiter.hit(hashKey("join", "ip", clientIp(req)), joinLimit(), TEN_MIN);
    if (!shared.allowed) return fail(429, "rate_limited", "Too many registrations from this network. Please wait a few minutes.", { retryAfterSec: shared.retryAfterSec });

    const now = new Date();
    const cap = foundingCap();
    const { code, seat } = await backend.institutes.create(
      {
        name: input.instituteName,
        city: input.city,
        institutionType: input.institutionType,
        contactName: input.contactName,
        role: input.role,
        phone: input.phone,
        email: input.email,
        weeklyDigest: { granted: input.weeklyDigest, recordedAt: now, withdrawnAt: null },
        source: input.source ?? null,
        testDay: input.testDay ?? null,
        createdAt: now,
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      },
      { cap, makeCode },
    );
    // First follow-up: the day after their next test (when fresh marks exist), else in 7 days.
    const firstFollowUp = input.testDay !== null && input.testDay !== undefined ? nextFollowUpDate(input.testDay, today()) : addDaysIso(today(), 7);
    await backend.institutes.update(code, { nextFollowUp: firstFollowUp });
    const record = await backend.institutes.get(code);
    if (record) {
      const cfg = emailConfig();
      runAfterResponse(async () => {
        if (record.email) await deliver(instituteWelcome(record, cap));
        if (cfg.ownerAlerts) await deliver(instituteOwnerAlert(cfg.ownerAlerts, record, cap));
      });
    }
    return json({ ok: true, code, seat, cap, seatLabel: seatLabel(seat, cap), name: input.instituteName }, 201);
  } catch (err) {
    console.error("[join] failed:", err instanceof Error ? err.message : "unknown");
    return fail(500, "internal_error", "Something went wrong and the institute wasn't registered. Please try again.");
  }
}

/* ── POST /api/events — anonymous usage counts ──────────────────────────── */

export async function handleUsageEvents(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "Blocked.");
  const limited = await burst(req, "events", 300);
  if (limited) return limited;
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = eventBatchSchema.safeParse(body.data);
  if (!parsed.success) return fail(422, "invalid_input", "Unexpected event format.");
  const batch = parsed.data;
  const events = sanitiseEvents(batch.role, batch.events);
  if (!events.length) return json({ ok: true, stored: false }, 202);
  // Counts without an institute code aren't stored at all: public totals only ever reflect
  // activity attributed to a registered institute.
  if (!batch.code) return json({ ok: true, stored: false }, 202);

  {
    const perCode = await instanceLimiter().hit(hashKey("events", "code", batch.code), 600, TEN_MIN);
    if (!perCode.allowed) return json({ ok: true, stored: false }, 202);
  }

  const backend = getBackend();
  if (backend.kind === "unavailable") return json({ ok: true, stored: false }, 202);
  try {
    await backend.institutes.recordUsage({
      code: batch.code,
      deviceKey: hashKey("device", batch.device).slice(0, 32),
      role: batch.role,
      events,
      day: today(),
      at: new Date(),
    });
    return json({ ok: true, stored: true }, 202);
  } catch (err) {
    console.error("[events] failed:", err instanceof Error ? err.message : "unknown");
    return json({ ok: true, stored: false }, 202);
  }
}

/* ── POST /api/institutes/stats — the institute's own dashboard ─────────── */

const codeBody = z.object({ code: z.string().max(40) }).strip();

export async function handleInstituteStats(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "Blocked.");
  const limited = await burst(req, "stats", 60);
  if (limited) return limited;
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = codeBody.safeParse(body.data);
  const code = parsed.success ? normaliseCode(parsed.data.code) : null;
  if (!code) return fail(422, "invalid_input", "That doesn't look like an institute code (it looks like HRB-XXXX-XXXX).");

  const backend = getBackend();
  if (backend.kind === "unavailable") return fail(503, "service_unavailable", "The dashboard isn't available right now. Please try again later.");
  const record = await backend.institutes.get(code);
  if (!record) return fail(404, "invalid_input", "We couldn't find an institute with that code. Check it and try again.");
  const [metrics, allSummaries] = await Promise.all([metricsFor(backend.institutes, record), backend.institutes.summaries(code, 200).catch(() => [])]);
  const pro = isPro(record.proUntil, today());
  const summaries = limitHistory(allSummaries, pro);
  // City benchmark for the chapters this institute has shared (other institutes only, k ≥ 4).
  let benchmark: CityBenchmark = {};
  try {
    const keys = [...new Set(summaries.flatMap((x) => x.topics.map((t) => chapterKey(t.n))))];
    if (keys.length) benchmark = computeBenchmark(await backend.institutes.benchmarks(record.city, keys), code, today(), benchmarkMinOthers());
  } catch (err) {
    console.warn("[stats] benchmark unavailable:", err instanceof Error ? err.message : "unknown");
  }
  return json({ ok: true, institute: publicInstitute(record, foundingCap()), metrics, summaries, benchmark, plan: { pro, until: record.proUntil ?? null } });
}

/* ── POST /api/institutes/feedback — "What did this help with?" ─────────── */

export async function handleValueFeedback(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "Blocked.");
  const limited = await burst(req, "feedback", 10, HOUR);
  if (limited) return limited;
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = valueFeedbackSchema.safeParse(body.data);
  if (!parsed.success) return fail(422, "invalid_input", "Please check your answers.", { fieldErrors: fieldErrors(parsed.error) });
  const backend = getBackend();
  if (backend.kind === "unavailable") return fail(503, "service_unavailable", "Feedback can't be saved right now. Please try again later.");
  const record = await backend.institutes.get(parsed.data.code);
  if (!record) return fail(404, "invalid_input", "Institute not found.");
  await backend.institutes.addFeedback(parsed.data.code, {
    at: new Date().toISOString(),
    minutes: parsed.data.minutes,
    helped: parsed.data.helped,
    note: parsed.data.note,
  });
  return json({ ok: true, message: "Thank you — this shapes what we build next." });
}

/* ── POST /api/institutes/summaries — a teacher shares a class summary with the head ── */

export async function handleShareSummary(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "Blocked.");
  const limited = await burst(req, "summary", 40, HOUR);
  if (limited) return limited;
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = shareSummarySchema.safeParse(body.data);
  if (!parsed.success) return fail(422, "invalid_input", "Please check the batch name, test name and date.", { fieldErrors: fieldErrors(parsed.error) });
  const backend = getBackend();
  if (backend.kind === "unavailable") return fail(503, "service_unavailable", "Sharing isn't available right now. Please try again later.");
  const record = await backend.institutes.get(parsed.data.code);
  if (!record) return fail(404, "invalid_input", "Institute not found. Reconnect with your institute code.");
  const s = parsed.data.summary;
  await backend.institutes.addSummary(parsed.data.code, { ...s, id: summaryId(s), at: new Date().toISOString() });
  return json({ ok: true, message: "Shared with your institute dashboard." });
}

/* ── GET /api/stats/public — real, aggregate numbers for the homepage ───── */

export function publicStatsMin(env: Record<string, string | undefined> = process.env): number {
  const v = Number(env.PUBLIC_STATS_MIN);
  return Number.isInteger(v) && v >= 0 ? v : 3;
}

export async function handlePublicStats() {
  const backend = getBackend();
  if (backend.kind === "unavailable") return json({ ok: true, show: false }, 200, { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" });
  try {
    const t = await backend.institutes.totals();
    const show = t.institutes >= publicStatsMin();
    return json(
      { ok: true, show, ...(show ? { totals: t, cap: foundingCap() } : {}) },
      200,
      { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    );
  } catch {
    return json({ ok: true, show: false }, 200);
  }
}

/* ── Owner dashboard ─────────────────────────────────────────────────────── */

const notFound = () => json({ ok: false, error: { code: "not_found", message: "Not found." } }, 404);

export async function handleAdminLogin(req: Request) {
  if (!ownerPassword()) return notFound();
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "Blocked.");
  const limited = await burst(req, "admin-login", 5, 15 * 60 * 1000);
  if (limited) return limited;
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const pw = z.object({ password: z.string().max(200) }).safeParse(body.data);
  if (!pw.success || !passwordMatches(pw.data.password)) return fail(401 as number, "invalid_input", "That password isn't right.");
  const value = signSession();
  if (!value) return notFound();
  return json({ ok: true }, 200, { ...noStore, "Set-Cookie": sessionCookie(value) });
}

export async function handleAdminLogout(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "Blocked.");
  return json({ ok: true }, 200, { ...noStore, "Set-Cookie": sessionCookie("", 0) });
}

function ownerBackend(req: Request): { ok: true; backend: Extract<Backend, { kind: "firestore" | "memory" }> } | { ok: false; response: NextResponse } {
  if (!ownerPassword()) return { ok: false, response: notFound() };
  if (!isOwner(req)) return { ok: false, response: json({ ok: false, error: { code: "unauthorised", message: "Please sign in." } }, 401) };
  const backend = getBackend();
  if (backend.kind === "unavailable") return { ok: false, response: fail(503, "service_unavailable", "Storage isn't configured.") };
  return { ok: true, backend };
}

export type ReadinessItem = { key: string; ok: boolean; label: string; fix: string; critical: boolean };

/** Go-live checklist for the owner — booleans only, never configuration values. */
export function launchReadiness(backend: Backend, env: Record<string, string | undefined> = process.env): ReadinessItem[] {
  const mail = emailConfig();
  const site = siteConfig.url;
  const price = Number(env.FOUNDING_PRICE_CAP_INR);
  return [
    { key: "storage", ok: backend.kind === "firestore", label: "Firestore storage connected", fix: "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in Vercel → Production, then redeploy.", critical: true },
    { key: "site", ok: site.startsWith("https://") && !site.includes("localhost"), label: "Public site address (NEXT_PUBLIC_SITE_URL) set", fix: "Set NEXT_PUBLIC_SITE_URL to your https address.", critical: true },
    {
      key: "address_match",
      // VERCEL_PROJECT_PRODUCTION_URL is the domain Vercel actually serves Production on.
      ok: !env.VERCEL_PROJECT_PRODUCTION_URL || new URL(site).hostname === env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
      label: "Site address matches the live domain",
      fix: `NEXT_PUBLIC_SITE_URL (${site}) differs from the domain Vercel serves (${env.VERCEL_PROJECT_PRODUCTION_URL ?? "?"}). Canonical tags, sitemap and links would point to the wrong site, so search engines index nothing. Connect that domain in Vercel → Domains, or set NEXT_PUBLIC_SITE_URL to the live address, then redeploy.`,
      critical: true,
    },
    { key: "domain", ok: /heramb\.study$/.test(new URL(site).hostname), label: "Own domain (heramb.study) in use", fix: "Connect heramb.study in Vercel → Domains and set NEXT_PUBLIC_SITE_URL=https://heramb.study. A vercel.app address looks temporary to institutes.", critical: false },
    { key: "email", ok: mail.sending, label: "Email sending on (welcome + weekly summary)", fix: "Set RESEND_API_KEY and EMAIL_FROM (verified domain).", critical: false },
    { key: "tokens", ok: mail.tokens, label: "Signed email links (stop / unsubscribe)", fix: "Set EMAIL_TOKEN_SECRET (32+ random characters).", critical: false },
    { key: "alerts", ok: Boolean(mail.ownerAlerts), label: "New-institute alerts to your inbox", fix: "Set OWNER_NOTIFICATION_EMAIL.", critical: false },
    { key: "cron", ok: (env.CRON_SECRET ?? "").length >= 16, label: "Monday summary schedule (CRON_SECRET)", fix: "Set CRON_SECRET (16+ characters).", critical: false },
    { key: "ai", ok: Boolean(getProvider()?.extract), label: "Photo / PDF marksheet reading", fix: "Optional: set AI_PROVIDER and AI_API_KEY (keep IMPORT_PHOTO_DAILY_LIMIT small).", critical: false },
    { key: "price", ok: Number.isInteger(price) && price > 0, label: "Founding price lock decided", fix: "Optional: set FOUNDING_PRICE_CAP_INR once you've decided the number.", critical: false },
    { key: "legal", ok: env.LEGAL_PAGES_REVIEWED === "true", label: "Privacy/terms placeholders filled", fix: "Replace every [placeholder] in /privacy and /terms (operator, region, retention), then set LEGAL_PAGES_REVIEWED=true.", critical: false },
  ];
}

export async function handleAdminList(req: Request) {
  const o = ownerBackend(req);
  if (!o.ok) return o.response;
  const store = o.backend.institutes;
  const cap = foundingCap();
  const records = await store.list();
  const rows = await Promise.all(
    records.map(async (r) => ({
      ...publicInstitute(r, cap),
      contactName: r.contactName,
      role: r.role,
      phone: r.phone,
      email: r.email,
      source: r.source,
      notes: r.notes,
      nextFollowUp: r.nextFollowUp,
      testDay: r.testDay ?? null,
      proUntil: r.proUntil ?? null,
      activatedAt: r.activatedAt?.toISOString() ?? null,
      lastActiveAt: r.lastActiveAt?.toISOString() ?? null,
      metrics: await metricsFor(store, r),
    })),
  );
  const totals = await store.totals();
  return json({ ok: true, cap, totals, institutes: rows, today: today(), readiness: launchReadiness(o.backend) });
}

const patchSchema = z
  .object({
    code: z.string().regex(CODE_PATTERN),
    status: z.enum(["active", "paused", "closed"]).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    nextFollowUp: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    testDay: z.number().int().min(0).max(6).nullable().optional(),
    proUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .strip();

export async function handleAdminPatch(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "Blocked.");
  const o = ownerBackend(req);
  if (!o.ok) return o.response;
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = patchSchema.safeParse(body.data);
  if (!parsed.success) return fail(422, "invalid_input", "Invalid update.");
  const { code, ...patch } = parsed.data;
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const ok = await o.backend.institutes.update(code, { ...clean, ...(clean.notes === "" ? { notes: null } : {}) });
  return ok ? json({ ok: true }) : fail(404, "invalid_input", "Institute not found.");
}

export async function handleAdminDelete(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "Blocked.");
  const o = ownerBackend(req);
  if (!o.ok) return o.response;
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = z.object({ code: z.string().regex(CODE_PATTERN), confirm: z.literal(true) }).safeParse(body.data);
  if (!parsed.success) return fail(422, "invalid_input", "Confirmation required.");
  const ok = await o.backend.institutes.remove(parsed.data.code);
  return ok ? json({ ok: true }) : fail(404, "invalid_input", "Institute not found.");
}

/* ── Weekly digest (Vercel Cron) ─────────────────────────────────────────── */

export async function handleDigestCron(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16 || req.headers.get("authorization") !== `Bearer ${secret}`) return notFound();
  const backend = getBackend();
  if (backend.kind === "unavailable") return json({ ok: false, sent: 0, reason: "storage unavailable" }, 503);
  const records = await backend.institutes.list();
  let sent = 0;
  let skipped = 0;
  for (const r of records) {
    if (!r.email || !r.weeklyDigest.granted || r.weeklyDigest.withdrawnAt || r.status !== "active") {
      skipped++;
      continue;
    }
    const stopUrl = actionUrl("digest", r.code);
    const token = signToken("digest", r.code);
    if (!stopUrl || !token) {
      skipped++;
      continue;
    }
    const oneClick = `${new URL(stopUrl).origin}/api/institutes/digest?id=${encodeURIComponent(r.code)}&t=${token}`;
    const m = await metricsFor(backend.institutes, r);
    if (await deliver(weeklyDigest(r, m, stopUrl, oneClick))) sent++;
  }
  return json({ ok: true, sent, skipped });
}

/** POST /api/institutes/digest — stop weekly emails (button on /email/digest, or RFC 8058 one-click). */
export async function handleDigestStop(req: Request) {
  const url = new URL(req.url);
  let id = url.searchParams.get("id");
  let t = url.searchParams.get("t");
  if (!id || !t) {
    if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "Blocked.");
    const body = await readJsonBody(req);
    if (!body.ok) return body.response;
    const parsed = z.object({ id: z.string().max(40), t: z.string().max(120) }).safeParse(body.data);
    if (!parsed.success) return fail(422, "invalid_input", "This link is incomplete.");
    ({ id, t } = parsed.data);
  }
  if (!isValidCode(id) || !verifyToken("digest", id, t)) return fail(422, "invalid_input", "This link is invalid or has expired.");
  const backend = getBackend();
  if (backend.kind === "unavailable") return fail(503, "service_unavailable", "Please try again later.");
  const ok = await backend.institutes.setDigest(id, false, new Date());
  if (!ok) return fail(404, "invalid_input", "Institute not found.");
  return json({ ok: true, message: "Done — weekly emails are stopped. Your institute and its dashboard are unchanged." });
}
