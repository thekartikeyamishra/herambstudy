/**
 * Personal student report links.
 *
 * The report lives entirely in the URL fragment (`/r#<payload>`). Browsers never send
 * the fragment to a server, so the student's marks are not stored on, or seen by,
 * Heramb's servers. Anyone holding the link can read it, so teachers should share
 * each link only with that student (or parent).
 */
import { z } from "zod";
import { isRealIsoDate } from "@/lib/dates";
import { CODE_PATTERN } from "@/lib/institute/code";
import type { ClassAnalysis, Dataset } from "./classAnalysis";

export const REPORT_VERSION = 1;

/**
 * Report links are shown on heramb.study, so their text must not carry web addresses
 * (someone could craft a link saying "pay fees at …") or hidden direction-override
 * characters that make text display differently from what it is.
 */
export const URL_LIKE = /(https?:\/\/|www\.)|\b[a-z0-9-]{2,}\.(com|in|net|org|io|ly|xyz|me|co|info|link|app|site|online|top|click|study)\b/i;
const UNSAFE_CHARS = /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/;
export function isSafeReportText(v: string): boolean {
  return !URL_LIKE.test(v) && !UNSAFE_CHARS.test(v);
}
const text = (max: number, min = 0) =>
  z.string().min(min).max(max).refine(isSafeReportText, "Web addresses and hidden characters aren't allowed");
const pct = z.number().int().min(0).max(100).nullable();

/** Compact wire format (short keys keep links small). */
export const reportSchema = z.object({
  v: z.literal(REPORT_VERSION),
  i: text(80), // institute / sender name, as typed by the sender (not verified)
  t: text(80), // test name
  d: z.string().refine((v) => isRealIsoDate(v)), // test date
  s: text(80, 1), // student id (roll number or name)
  n: z.array(text(80, 1)).min(1).max(40), // topic names
  p: z.array(pct).max(40), // student's percent per topic (null = absent)
  a: z.array(pct).max(40), // class average per topic
  // Optional institute code (founding programme). Lets anonymous "report opened / saved /
  // helped" counts reach the right institute. Older links without it stay valid.
  c: z.string().regex(CODE_PATTERN).optional(),
  // Optional report language ("hi" = Hindi). Absent = English, so older links are unchanged.
  l: z.literal("hi").optional(),
}).refine((r) => r.p.length === r.n.length && r.a.length === r.n.length, "Lengths must match");

export type StudentReport = z.infer<typeof reportSchema>;

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function encodeReport(r: StudentReport): string {
  return toBase64Url(JSON.stringify(r));
}

/**
 * Longest fragment we accept. The largest valid report (40 topic names of 80 Hindi
 * characters, 3 bytes each in UTF-8) encodes to ~15,000 characters, so this leaves
 * headroom while still refusing absurd input. Browsers and WhatsApp handle links this long.
 */
export const MAX_FRAGMENT_CHARS = 20_000;

export function decodeReport(fragment: string): StudentReport | null {
  const raw = fragment.replace(/^#/, "").trim();
  if (!raw || raw.length > MAX_FRAGMENT_CHARS || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const parsed = reportSchema.safeParse(JSON.parse(fromBase64Url(raw)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** One report per student from an analysed class test. */
export function buildReports(
  data: Dataset,
  analysis: ClassAnalysis,
  meta: { institute: string; test: string; date: string; code?: string | null; lang?: "en" | "hi" },
): StudentReport[] {
  const n = data.topics.map((t) => t.name.slice(0, 80));
  const a = analysis.topics.map((t) => (t.attempted > 0 ? t.average : null));
  return analysis.students.map((s) => ({
    v: REPORT_VERSION,
    i: meta.institute.trim().slice(0, 80),
    t: meta.test.trim().slice(0, 80),
    d: meta.date,
    s: s.id.slice(0, 80),
    n,
    p: s.percents.map((x) => (x === null || x === undefined ? null : x)),
    a,
    ...(meta.code ? { c: meta.code } : {}),
    ...(meta.lang === "hi" ? { l: "hi" as const } : {}),
  }));
}

export function reportUrl(origin: string, r: StudentReport): string {
  return `${origin.replace(/\/+$/, "")}/r#${encodeReport(r)}`;
}

/** Stable id for de-duplicating saved reports (FNV-1a over the canonical payload). */
export function reportId(r: StudentReport): string {
  const s = JSON.stringify([r.i, r.t, r.d, r.s, r.n, r.p]);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** Focus topics: below 50%, weakest first (max 3). */
export function focusTopics(r: StudentReport): string[] {
  return r.n
    .map((name, i) => ({ name, p: r.p[i] }))
    .filter((x): x is { name: string; p: number } => typeof x.p === "number" && x.p < 50)
    .sort((x, y) => x.p - y.p)
    .slice(0, 3)
    .map((x) => x.name);
}

/** WhatsApp-ready text: one line per student with their personal link. */
export function linksAsMessageList(origin: string, reports: StudentReport[], testName: string, lang: "en" | "hi" = "en"): string {
  return reports
    .map((r) => (lang === "hi" ? `${r.s} — आपकी ${testName || "टेस्ट"} रिपोर्ट: ${reportUrl(origin, r)}` : `${r.s} — your ${testName || "test"} report: ${reportUrl(origin, r)}`))
    .join("\n");
}

export function linksAsCsv(origin: string, reports: StudentReport[]): string {
  const cell = (v: string) => {
    let s = v;
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return ["Student,Report link", ...reports.map((r) => `${cell(r.s)},${cell(reportUrl(origin, r))}`)].join("\n");
}
