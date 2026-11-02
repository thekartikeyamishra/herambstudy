/**
 * Doubt log: teachers note each doubt students raise in class (chapter + optional note), in one
 * tap. Over weeks this shows which chapters confuse students *before* the test, and feeds the test
 * builder. Pure functions; storage lives in lib/client/doubtStore.ts. No AI and no server.
 */
import { z } from "zod";

export const MAX_DOUBTS = 3000;

export const doubtSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{4,40}$/),
    at: z.string().regex(/^\d{4}-\d{2}-\d{2}T/).max(40),
    batch: z.string().trim().max(40).default(""),
    chapter: z.string().trim().min(1).max(80),
    note: z.string().trim().max(200).default(""),
  })
  .strict();

export type Doubt = z.infer<typeof doubtSchema>;

/** Monday 00:00 (local) of the week containing `d`. */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - day);
  return x;
}

export type Heatmap = {
  weeks: Array<{ start: Date; label: string }>;
  rows: Array<{ chapter: string; counts: number[]; total: number; trend: "rising" | "falling" | "steady" }>;
  max: number;
};

/**
 * Chapters × the last `weeks` weeks (oldest first). Chapter names are merged case-insensitively;
 * the most recent spelling is shown. Rows sorted by total, busiest first.
 */
export function heatmap(doubts: Doubt[], opts: { weeks?: number; now?: Date; batch?: string } = {}): Heatmap {
  const n = Math.max(1, Math.min(12, opts.weeks ?? 6));
  const now = opts.now ?? new Date();
  const thisWeek = weekStart(now).getTime();
  const DAY = 86_400_000;
  const weeks = Array.from({ length: n }, (_, i) => {
    const start = new Date(thisWeek - (n - 1 - i) * 7 * DAY);
    return { start, label: start.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) };
  });
  const first = weeks[0]!.start.getTime();
  const byChapter = new Map<string, { chapter: string; counts: number[] }>();
  const sorted = [...doubts].sort((a, b) => a.at.localeCompare(b.at));
  for (const d of sorted) {
    if (opts.batch && opts.batch !== "*" && d.batch !== opts.batch) continue;
    const t = new Date(d.at).getTime();
    if (!Number.isFinite(t) || t < first) continue;
    // Weeks are 7 days apart except across DST changes (none in India); round to be safe.
    const w = Math.min(n - 1, Math.floor((weekStart(new Date(t)).getTime() - first) / (7 * DAY) + 0.01));
    const key = d.chapter.toLowerCase();
    const row = byChapter.get(key) ?? { chapter: d.chapter, counts: Array<number>(n).fill(0) };
    row.chapter = d.chapter;
    row.counts[w]! += 1;
    byChapter.set(key, row);
  }
  const rows = [...byChapter.values()]
    .map((r) => {
      const total = r.counts.reduce((s, x) => s + x, 0);
      const half = Math.floor(n / 2);
      const early = r.counts.slice(0, n - half).reduce((s, x) => s + x, 0) / Math.max(1, n - half);
      const late = r.counts.slice(n - half).reduce((s, x) => s + x, 0) / Math.max(1, half);
      const trend: "rising" | "falling" | "steady" = late >= early + 1 ? "rising" : early >= late + 1 ? "falling" : "steady";
      return { ...r, total, trend };
    })
    .sort((a, b) => b.total - a.total || a.chapter.localeCompare(b.chapter));
  return { weeks, rows, max: Math.max(1, ...rows.flatMap((r) => r.counts)) };
}

/** The chapters with the most doubts in the last `days` days (for "make a test on these"). */
export function topChapters(doubts: Doubt[], opts: { days?: number; limit?: number; now?: Date; batch?: string } = {}): Array<{ chapter: string; count: number }> {
  const since = (opts.now ?? new Date()).getTime() - (opts.days ?? 14) * 86_400_000;
  const m = new Map<string, { chapter: string; count: number }>();
  for (const d of doubts) {
    if (opts.batch && opts.batch !== "*" && d.batch !== opts.batch) continue;
    if (new Date(d.at).getTime() < since) continue;
    const k = d.chapter.toLowerCase();
    const e = m.get(k) ?? { chapter: d.chapter, count: 0 };
    e.count += 1;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.chapter.localeCompare(b.chapter)).slice(0, opts.limit ?? 5);
}

/** Link into the test builder with these chapters pre-selected. */
export const retestHref = (chapters: string[]) => `/test-builder#retest=${encodeURIComponent(chapters.slice(0, 10).join("|"))}`;

/** CSV (formula-safe) for Excel or sharing with the head. */
export function doubtsCsv(doubts: Doubt[]): string {
  const cell = (v: string) => {
    let x = v;
    if (/^[=+\-@\t\r]/.test(x)) x = `'${x}`;
    return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
  };
  return [["Date", "Time", "Batch", "Chapter", "Note"], ...doubts.map((d) => [d.at.slice(0, 10), d.at.slice(11, 16), d.batch, d.chapter, d.note])]
    .map((r) => r.map(cell).join(","))
    .join("\n");
}
