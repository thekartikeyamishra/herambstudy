import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getProvider, type AiProvider } from "@/lib/ai/providers";
import { buildPrompt, parseModelOutput, PROMPT_VERSION, ruleBasedSummary, summaryInputSchema, type Summary } from "@/lib/ai/summary";
import { aiDailyAllowance } from "@/lib/entitlements";
import { getBackend, instanceLimiter } from "./backend";
import { clientIp, fail, hashKey, isAllowedOrigin, readJsonBody } from "./http";

const DAY = 24 * 60 * 60 * 1000;
const MAX_OUTPUT_TOKENS = 450;
const TIMEOUT_MS = 12_000;

/** Small per-instance LRU cache: identical class statistics → identical summary, no second model call. */
const CACHE_MAX = 500;
const CACHE_TTL = 7 * DAY;
const g = globalThis as typeof globalThis & { __herambAiCache?: Map<string, { at: number; value: Summary }>; __herambAiProvider?: AiProvider | null };
function cache() {
  g.__herambAiCache ??= new Map();
  return g.__herambAiCache;
}

/** Test hook. */
export function __setAiProviderForTests(p: AiProvider | null | undefined) {
  g.__herambAiProvider = p;
  g.__herambAiCache = new Map();
}

function provider(): AiProvider | null {
  return g.__herambAiProvider !== undefined ? g.__herambAiProvider : getProvider();
}

function globalDailyCap(): number {
  const v = Number(process.env.AI_GLOBAL_DAILY_LIMIT);
  return Number.isInteger(v) && v >= 0 ? v : 300;
}

function ok(summary: Summary) {
  return NextResponse.json({ ok: true, summary }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/ai/summary — always returns a usable summary:
 *   AI when configured, within quota and successful; otherwise the rule-based one
 *   (with a note explaining why). Only aggregate statistics are accepted.
 */
export async function handleAiSummary(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "This request was blocked for security reasons.");
  const local = await instanceLimiter().hit(hashKey("ai", "burst", clientIp(req)), 20, 10 * 60 * 1000);
  if (!local.allowed) return fail(429, "rate_limited", "Too many requests. Please wait a few minutes.", { retryAfterSec: local.retryAfterSec });

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = summaryInputSchema.safeParse(body.data);
  if (!parsed.success) return fail(422, "invalid_input", "The summary request wasn't in the expected format.");
  const input = parsed.data;
  const rules = ruleBasedSummary(input);

  const p = provider();
  if (!p) return ok(rules);

  const key = createHash("sha256").update(`${PROMPT_VERSION}|${p.id}|${p.model}|${JSON.stringify(input)}`).digest("hex");
  const hit = cache().get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    cache().delete(key);
    cache().set(key, hit); // refresh LRU position
    return ok(hit.value);
  }

  // Quotas: per visitor per day (plan allowance) and a global daily cap that bounds total spend.
  const backend = getBackend();
  const limiter = backend.kind === "unavailable" ? instanceLimiter() : backend.limiter;
  try {
    const allowance = aiDailyAllowance("free");
    const mine = allowance > 0 ? await limiter.hit(hashKey("ai", "day", clientIp(req)), allowance, DAY) : { allowed: false, retryAfterSec: 0 };
    if (!mine.allowed) return ok({ ...rules, note: "Daily AI summaries used up — here's the instant summary from your numbers instead." });
    const global = await limiter.hit("ai-global-daily", globalDailyCap(), DAY);
    if (!global.allowed) return ok({ ...rules, note: "AI summaries are busy today — here's the instant summary from your numbers instead." });
  } catch {
    return ok(rules);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { system, user } = buildPrompt(input);
    const result = await p.generate({ system, user, maxTokens: MAX_OUTPUT_TOKENS, signal: controller.signal });
    const text = parseModelOutput(result.text);
    if (!text) {
      console.warn("[ai] unparseable model output");
      return ok({ ...rules, note: "The AI reply couldn't be used — here's the instant summary instead." });
    }
    const summary: Summary = { ...text, source: "ai" };
    console.info("[ai] summary", { model: p.model, in: result.inputTokens, out: result.outputTokens });
    cache().set(key, { at: Date.now(), value: summary });
    if (cache().size > CACHE_MAX) {
      const oldest = cache().keys().next().value;
      if (oldest !== undefined) cache().delete(oldest);
    }
    return ok(summary);
  } catch (err) {
    console.error("[ai] provider error:", err instanceof Error ? err.message : "unknown");
    return ok({ ...rules, note: "AI is unavailable right now — here's the instant summary from your numbers instead." });
  } finally {
    clearTimeout(timer);
  }
}
