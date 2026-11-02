/**
 * Question bank + papers, kept on this device (like the class tracker). Validated on every load,
 * so a damaged or hand-edited store never crashes the page; export/import moves it between devices.
 */
import { z } from "zod";
import { MAX_BANK, questionSchema, type Question } from "@/lib/tests/question";
import type { Paper } from "@/lib/tests/paper";

export const TEST_STORE_KEY = "heramb.testbank.v1";
export const MAX_PAPERS = 60;

const paperSchema = z.object({
  id: z.string().min(4).max(40),
  name: z.string().max(80),
  institute: z.string().max(80),
  durationMin: z.number().int().min(0).max(600),
  marking: z.object({ correct: z.number().min(0).max(100), wrong: z.number().min(0).max(100) }),
  questions: z.array(questionSchema).min(1).max(200),
  sets: z.array(z.enum(["A", "B", "C", "D"])).min(1).max(4),
  seed: z.number().int(),
  createdAt: z.string().max(40),
});

const storeSchema = z.object({ v: z.literal(1), questions: z.array(z.unknown()).max(MAX_BANK * 2), papers: z.array(z.unknown()).max(MAX_PAPERS * 2) });

export type TestStore = { v: 1; questions: Question[]; papers: Paper[] };
export const emptyStore = (): TestStore => ({ v: 1, questions: [], papers: [] });

/** Keeps every valid question/paper and drops broken ones (reported as `dropped`). */
export function parseStore(raw: unknown): { store: TestStore; dropped: number } {
  const s = storeSchema.safeParse(raw);
  if (!s.success) return { store: emptyStore(), dropped: 0 };
  let dropped = 0;
  const questions: Question[] = [];
  for (const q of s.data.questions) {
    const p = questionSchema.safeParse(q);
    if (p.success) questions.push(p.data);
    else dropped++;
  }
  const papers: Paper[] = [];
  for (const x of s.data.papers) {
    const p = paperSchema.safeParse(x);
    if (p.success) papers.push(p.data as Paper);
    else dropped++;
  }
  return { store: { v: 1, questions: questions.slice(0, MAX_BANK), papers: papers.slice(-MAX_PAPERS) }, dropped };
}

export function loadStore(): { store: TestStore; status: "ok" | "unavailable" | "damaged"; dropped: number } {
  try {
    const raw = localStorage.getItem(TEST_STORE_KEY);
    if (!raw) return { store: emptyStore(), status: "ok", dropped: 0 };
    const r = parseStore(JSON.parse(raw));
    return { ...r, status: r.dropped ? "damaged" : "ok" };
  } catch (err) {
    return { store: emptyStore(), status: err instanceof SyntaxError ? "damaged" : "unavailable", dropped: 0 };
  }
}

/** Returns an error message when saving isn't possible (private mode, storage full). */
export function saveStore(store: TestStore): string | null {
  try {
    localStorage.setItem(TEST_STORE_KEY, JSON.stringify({ v: 1, questions: store.questions.slice(0, MAX_BANK), papers: store.papers.slice(-MAX_PAPERS) }));
    return null;
  } catch {
    return "This browser isn't allowing saving (private mode or storage full). Export a backup, or delete old papers.";
  }
}

/** Adds questions, skipping exact duplicates (same text and options). */
export function mergeQuestions(existing: Question[], incoming: Question[]): { questions: Question[]; added: number; duplicates: number } {
  const key = (q: Question) => `${q.text.toLowerCase().replace(/\s+/g, " ")}|${q.options.map((o) => o.toLowerCase()).join("|")}`;
  const seen = new Set(existing.map(key));
  const out = [...existing];
  let added = 0;
  let duplicates = 0;
  for (const q of incoming) {
    if (seen.has(key(q))) {
      duplicates++;
      continue;
    }
    if (out.length >= MAX_BANK) break;
    seen.add(key(q));
    out.push(q);
    added++;
  }
  return { questions: out, added, duplicates };
}

/** Question ids used in the last few papers, so new papers prefer fresh questions. */
export function recentlyUsed(papers: Paper[], lastN = 3): Set<string> {
  return new Set(papers.slice(-lastN).flatMap((p) => p.questions.map((q) => q.id)));
}
