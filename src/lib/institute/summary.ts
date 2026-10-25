/**
 * Class summaries a teacher CHOOSES to share with their institute head: chapter-level
 * aggregates only (class average, how many attempted, how many below 50%). Never student
 * names, roll numbers or individual marks — the schema has nowhere to put them.
 */
import { z } from "zod";
import { isRealIsoDate } from "@/lib/dates";
import { CODE_PATTERN } from "./code";
import { isSafeReportText } from "@/lib/tools/studentReport";
import type { ClassAnalysis } from "@/lib/tools/classAnalysis";

const safe = (max: number, min = 1) => z.string().trim().min(min).max(max).refine(isSafeReportText, "Web addresses and hidden characters aren't allowed");
const pct = z.number().int().min(0).max(100).nullable();

export const summaryTopicSchema = z.object({
  n: safe(80),
  avg: pct,
  att: z.number().int().min(0).max(500),
  below: z.number().int().min(0).max(500),
}).strict();

export const classSummarySchema = z.object({
  batch: safe(60),
  test: safe(80),
  date: z.string().refine((v) => isRealIsoDate(v), "Choose the test date"),
  students: z.number().int().min(1).max(500),
  average: pct,
  topics: z.array(summaryTopicSchema).min(1).max(40),
}).strict().refine((s) => s.topics.every((t) => t.below <= t.att && t.att <= s.students), "Counts don't add up");

export const shareSummarySchema = z.object({ code: z.string().regex(CODE_PATTERN), summary: classSummarySchema }).strip();

export type ClassSummary = z.infer<typeof classSummarySchema>;
export type StoredSummary = ClassSummary & { id: string; at: string };

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Builds the shareable aggregate from an analysis (pure). */
export function summariseClass(a: ClassAnalysis, meta: { batch: string; test: string; date: string }): ClassSummary {
  return {
    batch: meta.batch.trim().slice(0, 60),
    test: meta.test.trim().slice(0, 80),
    date: meta.date,
    students: a.students.length,
    average: a.classAverage === null ? null : clampPct(a.classAverage),
    topics: a.topics.slice(0, 40).map((t) => ({
      n: t.name.slice(0, 80),
      avg: t.attempted > 0 ? clampPct(t.average) : null,
      att: t.attempted,
      below: t.belowHalf.length,
    })),
  };
}

/** Same batch + date → same id. */
export function summaryId(s: Pick<ClassSummary, "batch" | "date">): string {
  // One shared test per batch per day: re-sharing (e.g. an automatic share, then the same
  // test with its proper name) replaces it instead of creating a duplicate.
  const t = `${s.batch.trim().toLowerCase()}|${s.date}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${s.date}-${h.toString(36)}`;
}

export type BatchView = {
  batch: string;
  latest: StoredSummary;
  tests: number;
  weakest: Array<{ n: string; avg: number; below: number; att: number; change: number | null }>;
  averageChange: number | null;
};

/** Groups summaries by batch: latest test, weakest chapters and change vs the batch's previous test. */
export function batchViews(summaries: StoredSummary[]): BatchView[] {
  const byBatch = new Map<string, StoredSummary[]>();
  for (const s of summaries) {
    const k = s.batch.trim().toLowerCase();
    byBatch.set(k, [...(byBatch.get(k) ?? []), s]);
  }
  const views: BatchView[] = [];
  for (const list of byBatch.values()) {
    const sorted = [...list].sort((a, b) => (a.date === b.date ? a.at.localeCompare(b.at) : a.date.localeCompare(b.date)));
    const latest = sorted.at(-1)!;
    const prev = sorted.length > 1 ? sorted.at(-2)! : null;
    const prevAvg = new Map(prev?.topics.map((t) => [t.n.toLowerCase(), t.avg]) ?? []);
    const weakest = latest.topics
      .filter((t): t is typeof t & { avg: number } => t.avg !== null)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)
      .map((t) => {
        const p = prevAvg.get(t.n.toLowerCase());
        return { n: t.n, avg: t.avg, below: t.below, att: t.att, change: typeof p === "number" ? t.avg - p : null };
      });
    views.push({
      batch: latest.batch,
      latest,
      tests: sorted.length,
      weakest,
      averageChange: prev && prev.average !== null && latest.average !== null ? latest.average - prev.average : null,
    });
  }
  return views.sort((a, b) => b.latest.date.localeCompare(a.latest.date));
}

/* ── City benchmark ─────────────────────────────────────────────────────── */

/** "Laws of Motion", "laws-of-motion " → "laws of motion" (keeps Hindi letters). */
export function chapterKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .trim()
    .slice(0, 80);
}

export const cityKey = (city: string) => chapterKey(city) || "unknown";

/** Minimum number of OTHER institutes before a city average is shown (privacy + meaning). */
export function benchmarkMinOthers(env: Record<string, string | undefined> = process.env): number {
  const v = Number(env.BENCHMARK_MIN_INSTITUTES);
  const total = Number.isInteger(v) && v >= 2 ? v : 5;
  return total - 1;
}

export type BenchmarkEntry = { avg: number; date: string };
/** Latest average per institute for one city + chapter. */
export type BenchmarkDoc = Record<string, BenchmarkEntry>;
export type CityBenchmark = Record<string, { avg: number; institutes: number }>;

/**
 * City average per chapter from OTHER institutes' latest results (last 120 days), shown only
 * when at least `minOthers` institutes contribute — so no single institute can be identified.
 */
export function computeBenchmark(docs: Map<string, BenchmarkDoc>, selfCode: string, today: string, minOthers: number): CityBenchmark {
  const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - 120 * 86_400_000).toISOString().slice(0, 10);
  const out: CityBenchmark = {};
  for (const [key, doc] of docs) {
    const others = Object.entries(doc).filter(([code, e]) => code !== selfCode && e && typeof e.avg === "number" && e.date >= cutoff);
    if (others.length < minOthers) continue;
    out[key] = { avg: Math.round(others.reduce((s, [, e]) => s + e.avg, 0) / others.length), institutes: others.length };
  }
  return out;
}
