/**
 * A student's own report history, kept in their browser only.
 * Each report link their teacher sends can be saved here, building a personal
 * record across tests — the habit loop that brings students back after every test.
 */
import { z } from "zod";
import { reportId, reportSchema, type StudentReport } from "@/lib/tools/studentReport";

export const STUDENT_KEY = "heramb.student.v1";
export const MAX_SAVED_REPORTS = 200;

const savedSchema = z.object({
  version: z.literal(1),
  reports: z.array(z.object({ id: z.string().max(20), savedAt: z.string().max(40), report: reportSchema })).max(MAX_SAVED_REPORTS),
});
export type StudentHistory = z.infer<typeof savedSchema>;

const empty = (): StudentHistory => ({ version: 1, reports: [] });

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadHistory(s: Storage | null = storage()): { ok: boolean; history: StudentHistory } {
  if (!s) return { ok: false, history: empty() };
  try {
    const raw = s.getItem(STUDENT_KEY);
    if (!raw) return { ok: true, history: empty() };
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { ok: true, history: parsed.data } : { ok: true, history: empty() };
  } catch {
    return { ok: false, history: empty() };
  }
}

export type SaveOutcome = "saved" | "already_saved" | "unavailable" | "full";

export function saveReport(r: StudentReport, s: Storage | null = storage()): SaveOutcome {
  if (!s) return "unavailable";
  const { history } = loadHistory(s);
  const id = reportId(r);
  if (history.reports.some((x) => x.id === id)) return "already_saved";
  if (history.reports.length >= MAX_SAVED_REPORTS) return "full";
  const next: StudentHistory = { version: 1, reports: [...history.reports, { id, savedAt: new Date().toISOString(), report: r }] };
  try {
    s.setItem(STUDENT_KEY, JSON.stringify(next));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function isSaved(r: StudentReport, s: Storage | null = storage()): boolean {
  const id = reportId(r);
  return loadHistory(s).history.reports.some((x) => x.id === id);
}

export function removeReport(id: string, s: Storage | null = storage()): boolean {
  if (!s) return false;
  const { history } = loadHistory(s);
  try {
    s.setItem(STUDENT_KEY, JSON.stringify({ ...history, reports: history.reports.filter((x) => x.id !== id) }));
    return true;
  } catch {
    return false;
  }
}

export type TopicHistory = { topic: string; points: Array<{ test: string; date: string; pct: number }> };

/** Per-topic history across saved reports (case-insensitive topic match), oldest first. */
export function topicHistory(history: StudentHistory): TopicHistory[] {
  const sorted = [...history.reports].sort((a, b) => a.report.d.localeCompare(b.report.d));
  const map = new Map<string, TopicHistory>();
  for (const { report } of sorted) {
    report.n.forEach((name, i) => {
      const p = report.p[i];
      if (typeof p !== "number") return;
      const key = name.trim().toLowerCase();
      const entry = map.get(key) ?? { topic: name, points: [] };
      entry.points.push({ test: report.t, date: report.d, pct: p });
      map.set(key, entry);
    });
  }
  return [...map.values()].sort((a, b) => a.topic.localeCompare(b.topic));
}
