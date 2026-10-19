import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider, type AiProvider } from "@/lib/ai/providers";
import { isAllowedSheetHost, parseSheetLink } from "@/lib/tools/sheetLink";
import { getBackend, instanceLimiter } from "./backend";
import { clientIp, fail, hashKey, isAllowedOrigin, readJsonBody } from "./http";

/**
 * Import endpoints. Marks pass through these handlers in memory only: nothing is
 * stored, cached or logged (only sizes and outcomes are logged).
 */

const TEN_MIN = 10 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
export const MAX_SHEET_BYTES = 1_000_000;
export const MAX_IMPORT_FILE_BYTES = 4 * 1024 * 1024;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/* ── Google Sheet ─────────────────────────────────────────────────────── */

type Fetcher = typeof fetch;
const g = globalThis as typeof globalThis & { __herambSheetFetch?: Fetcher; __herambExtractProvider?: AiProvider | null };

/** Test hooks. */
export function __setSheetFetchForTests(f: Fetcher | undefined) {
  g.__herambSheetFetch = f;
}
export function __setExtractProviderForTests(p: AiProvider | null | undefined) {
  g.__herambExtractProvider = p;
}

async function readLimited(res: Response, max: number): Promise<string | null> {
  if (!res.body) return (await res.text()).slice(0, max + 1);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) {
    all.set(c, o);
    o += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(all);
}

export async function handleSheetImport(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "This request was blocked for security reasons.");
  const burst = await instanceLimiter().hit(hashKey("sheet", "ip", clientIp(req)), 30, TEN_MIN);
  if (!burst.allowed) return fail(429, "rate_limited", "Too many imports. Please wait a few minutes.", { retryAfterSec: burst.retryAfterSec });
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = z.object({ url: z.string().max(600) }).safeParse(body.data);
  const link = parsed.success ? parseSheetLink(parsed.data.url) : null;
  if (!link) return fail(422, "invalid_input", "Please paste a Google Sheets link (it starts with https://docs.google.com/spreadsheets/).");

  const doFetch = g.__herambSheetFetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    let url = link.csvUrl;
    let res: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      res = await doFetch(url, { redirect: "manual", signal: controller.signal, headers: { Accept: "text/csv,text/plain;q=0.9,*/*;q=0.1" } });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) break;
        const next = new URL(loc, url);
        if (next.protocol !== "https:" || !isAllowedSheetHost(next.hostname)) {
          return fail(422, "invalid_input", "This sheet isn't shared publicly. In Google Sheets: Share → General access → “Anyone with the link” (Viewer), then try again.");
        }
        // A redirect to the sign-in page means the sheet is private.
        if (next.hostname === "accounts.google.com" || /ServiceLogin|signin/i.test(next.pathname)) {
          return fail(422, "invalid_input", "This sheet isn't shared publicly. In Google Sheets: Share → General access → “Anyone with the link” (Viewer), then try again.");
        }
        url = next.toString();
        continue;
      }
      break;
    }
    if (!res || res.status === 401 || res.status === 403 || res.status === 404) {
      return fail(422, "invalid_input", "We couldn't open this sheet. Check the link, and that it's shared as “Anyone with the link — Viewer”.");
    }
    if (!res.ok) return fail(502, "service_unavailable", "Google Sheets didn't respond properly. Please try again in a minute.");
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (type.includes("text/html")) {
      return fail(422, "invalid_input", "This sheet isn't shared publicly. In Google Sheets: Share → General access → “Anyone with the link” (Viewer), then try again.");
    }
    const text = await readLimited(res, MAX_SHEET_BYTES);
    if (text === null) return fail(413, "payload_too_large", "That sheet is larger than 1 MB. Keep one test per tab, or link the specific tab.");
    if (!text.trim()) return fail(422, "invalid_input", "That sheet tab is empty. Link the tab that has the marks (open it, then copy the link).");
    console.info("[import] sheet ok", { bytes: text.length });
    return json({ ok: true, text, kind: link.kind });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.warn("[import] sheet failed:", aborted ? "timeout" : err instanceof Error ? err.name : "unknown");
    return fail(504, "service_unavailable", aborted ? "Google Sheets took too long. Please try again." : "We couldn't reach Google Sheets. Please try again.");
  } finally {
    clearTimeout(timer);
  }
}

/* ── Photo / PDF of a marksheet (AI vision) ───────────────────────────── */

export const EXTRACT_SYSTEM = "You convert photos and PDFs of student marksheets into CSV. Reply with CSV only — no commentary, no code fences.";
export const EXTRACT_PROMPT = [
  "Read the marks table in this document and output it as CSV.",
  "Rules:",
  "1. First row is the header. The first column is the student identifier exactly as printed — prefer the roll number / ID column; use names only if there is no roll number.",
  "2. Then one column per chapter, topic, section or subject marks column. Leave out totals, ranks, percentages, grades, signatures and remarks.",
  "3. If maximum marks per column are printed, put them in a second row whose first cell is MAX.",
  "4. Write AB for absent. If a value is unreadable, leave the cell empty — never guess a number.",
  "5. Copy numbers exactly as written. Quote any cell that contains a comma.",
  "6. If there is no marks table, reply with exactly: NO_TABLE",
].join("\n");

function extractAllowance(): number {
  const v = Number(process.env.IMPORT_PHOTO_DAILY_LIMIT);
  return Number.isInteger(v) && v >= 0 && v <= 1000 ? v : 10;
}

function globalDailyCap(): number {
  const v = Number(process.env.AI_GLOBAL_DAILY_LIMIT);
  return Number.isInteger(v) && v >= 0 ? v : 300;
}

/** Strips code fences / chatter and caps size. Returns null when the model found no table. */
export function cleanExtractedCsv(text: string): string | null {
  let t = text.trim();
  const fence = /```(?:csv|text)?\s*\n([\s\S]*?)```/i.exec(t);
  if (fence) t = fence[1]!.trim();
  if (!t || /^NO_TABLE\b/i.test(t)) return null;
  const lines = t.split(/\r?\n/).filter((l) => l.trim()).slice(0, 600);
  if (lines.length < 2) return null;
  return lines.join("\n");
}

export async function handleExtract(req: Request) {
  if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "This request was blocked for security reasons.");
  const provider = g.__herambExtractProvider !== undefined ? g.__herambExtractProvider : getProvider();
  if (!provider?.extract) {
    return json({ ok: false, error: { code: "not_configured", message: "Reading photos and PDFs isn't switched on yet. Please use Excel, CSV or a Google Sheet for now." } }, 501);
  }
  const burst = await instanceLimiter().hit(hashKey("extract", "burst", clientIp(req)), 8, TEN_MIN);
  if (!burst.allowed) return fail(429, "rate_limited", "Too many photo imports. Please wait a few minutes.", { retryAfterSec: burst.retryAfterSec });

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_IMPORT_FILE_BYTES + 64 * 1024) return fail(413, "payload_too_large", "That file is larger than 4 MB. Take a closer photo or split the PDF.");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(415, "unsupported_media_type", "Please upload the file as a form.");
  }
  if (form.get("consent") !== "yes") return fail(422, "invalid_input", "Please confirm the consent box first.");
  const file = form.get("file");
  if (!(file instanceof Blob)) return fail(422, "invalid_input", "Please choose a photo or PDF.");
  if (file.size === 0) return fail(422, "invalid_input", "That file is empty.");
  if (file.size > MAX_IMPORT_FILE_BYTES) return fail(413, "payload_too_large", "That file is larger than 4 MB. Take a closer photo or split the PDF.");
  const type = (file.type || "").toLowerCase();
  const allowed = provider.extractTypes ?? [];
  if (!allowed.includes(type)) {
    return fail(415, "unsupported_media_type", type === "application/pdf" ? "PDFs can't be read with the current setup. Please upload a photo or screenshot of the page." : "Please upload a JPG, PNG or WebP photo, or a PDF.");
  }

  // Quotas: per network per day, plus the shared global AI cap that bounds spend.
  const backend = getBackend();
  const limiter = backend.kind === "unavailable" ? instanceLimiter() : backend.limiter;
  try {
    const mine = await limiter.hit(hashKey("extract", "day", clientIp(req)), extractAllowance(), DAY);
    if (!mine.allowed) return fail(429, "rate_limited", "Today's photo imports are used up on this network. Please use Excel, CSV or a Google Sheet, or try again tomorrow.");
    const global = await limiter.hit("ai-global-daily", globalDailyCap(), DAY);
    if (!global.allowed) return fail(429, "rate_limited", "Photo reading is busy today. Please use Excel, CSV or a Google Sheet, or try again tomorrow.");
  } catch {
    return fail(503, "service_unavailable", "Photo reading is unavailable right now. Please try again later.");
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const result = await provider.extract({ system: EXTRACT_SYSTEM, prompt: EXTRACT_PROMPT, mediaType: type, base64, maxTokens: 4000, signal: controller.signal });
    const csv = cleanExtractedCsv(result.text);
    console.info("[import] extract", { model: provider.model, type, bytes: file.size, in: result.inputTokens, out: result.outputTokens, found: Boolean(csv) });
    if (!csv) return fail(422, "invalid_input", "We couldn't find a marks table in that file. Try a straighter, well-lit photo of just the table.");
    return json({ ok: true, text: csv });
  } catch (err) {
    console.error("[import] extract failed:", err instanceof Error ? err.message : "unknown");
    return fail(502, "service_unavailable", "Reading the file didn't work this time. Please try again, or use Excel / CSV.");
  } finally {
    clearTimeout(timer);
  }
}

/** GET /api/import/extract — tells the UI whether photo/PDF reading is available. */
export function handleExtractCapabilities() {
  const provider = g.__herambExtractProvider !== undefined ? g.__herambExtractProvider : getProvider();
  return json({ ok: true, available: Boolean(provider?.extract), types: provider?.extractTypes ?? [] });
}
