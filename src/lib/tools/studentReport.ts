/**
 * Personal student report links.
 *
 * The report lives entirely in the URL fragment (`/r#<payload>`). Browsers never send
 * the fragment to a server, so the student's marks are not stored on, or seen by,
 * Heramb's servers. Anyone holding the link can read it, so teachers should share
 * each link only with that student (or parent).
 */
import { z } from "zod";
import type { ClassAnalysis, Dataset } from "./classAnalysis";

export const REPORT_VERSION = 1;

const text = (max: number) => z.string().max(max);
const pct = z.number().int().min(0).max(100).nullable();

/** Compact wire format (short keys keep links small). */
export const reportSchema = z.object({
  v: z.literal(REPORT_VERSION),
  i: text(80), // institute / sender name, as typed by the sender (not verified)
  t: text(80), // test name
  d: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // test date
  s: text(80).min(1), // student id (roll number or name)
  n: z.array(text(80).min(1)).min(1).max(40), // topic names
  p: z.array(pct).max(40), // student's percent per topic (null = absent)
  a: z.array(pct).max(40), // class average per topic
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

export function decodeReport(fragment: string): StudentReport | null {
  // Chat apps sometimes glue punctuation or spaces onto the end of a copied link.
  const raw = fragment.replace(/^#/, "").trim().replace(/(%[0-9A-Fa-f]{2}|[^A-Za-z0-9_-])+$/, "");
  if (!raw || raw.length > 12_000 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
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
  meta: { institute: string; test: string; date: string },
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
export function linksAsMessageList(origin: string, reports: StudentReport[], testName: string): string {
  return reports.map((r) => `${r.s} — your ${testName || "test"} report: ${reportUrl(origin, r)}`).join("\n");
}

export function linksAsCsv(origin: string, reports: StudentReport[]): string {
  const cell = (v: string) => {
    let s = v;
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return ["Student,Report link", ...reports.map((r) => `${cell(r.s)},${cell(reportUrl(origin, r))}`)].join("\n");
}
