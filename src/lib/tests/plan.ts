/**
 * Test planning helpers (v0.13), all pure and dependency-free:
 *  - marking presets in the style of common Indian exams,
 *  - an automatic blueprint from chapters + a difficulty mix,
 *  - batch seating: which roll number gets which set, and how many copies to print,
 *  - item analysis: which questions were too hard/easy, and which answer keys look wrong.
 */
import { DIFFICULTIES, type Difficulty, type Question } from "./question";
import { toMaster, type BlueprintRow, type Paper } from "./paper";

/* ── Marking presets ──────────────────────────────────────────────────── */

export type MarkingPreset = { id: string; label: string; correct: number; wrong: number; minutesPerQuestion: number };

/**
 * "Style" presets: the marking scheme only. Exam bodies change question counts and timings,
 * so the paper's length stays the teacher's choice and the UI says to check the current notice.
 */
export const MARKING_PRESETS: MarkingPreset[] = [
  { id: "jee-neet", label: "JEE Main / NEET style (+4, −1)", correct: 4, wrong: 1, minutesPerQuestion: 1.2 },
  { id: "cuet", label: "CUET style (+5, −1)", correct: 5, wrong: 1, minutesPerQuestion: 1.2 },
  { id: "ca-foundation", label: "CA Foundation MCQ style (+1, −0.25)", correct: 1, wrong: 0.25, minutesPerQuestion: 1.5 },
  { id: "board", label: "School / board MCQ (+1, no negative)", correct: 1, wrong: 0, minutesPerQuestion: 1 },
];

/* ── Difficulty mix → automatic blueprint ─────────────────────────────── */

export type DifficultyMix = { id: string; label: string; share: Record<Difficulty, number> };

export const DIFFICULTY_MIXES: DifficultyMix[] = [
  { id: "balanced", label: "Balanced (30% easy · 50% medium · 20% hard)", share: { easy: 0.3, medium: 0.5, hard: 0.2 } },
  { id: "practice", label: "Practice / new chapter (50 · 40 · 10)", share: { easy: 0.5, medium: 0.4, hard: 0.1 } },
  { id: "exam", label: "Exam level (20 · 50 · 30)", share: { easy: 0.2, medium: 0.5, hard: 0.3 } },
  { id: "challenge", label: "Challenge / toppers (10 · 40 · 50)", share: { easy: 0.1, medium: 0.4, hard: 0.5 } },
];

/** Splits `total` into integer parts proportional to `weights` (largest remainder; sums exactly). */
export function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (Math.max(0, w) / sum) * total);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((s, x) => s + x, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0 && k < order.length; k++, left--) out[order[k]![1]]! += 1;
  return out;
}

/**
 * Builds blueprint rows for `total` questions spread evenly over `chapters` and split by the
 * difficulty mix. When a chapter lacks questions at a level, the gap is filled from other levels
 * of the same chapter, then from other chapters, so the paper reaches `total` whenever the bank can.
 */
export function autoBlueprint(bank: Question[], chapters: string[], total: number, mix: Record<Difficulty, number>): { rows: BlueprintRow[]; shortBy: number } {
  const chs = [...new Set(chapters.map((c) => c.trim()).filter(Boolean))];
  const avail = new Map<string, Record<Difficulty, number>>();
  for (const ch of chs) avail.set(ch, { easy: 0, medium: 0, hard: 0 });
  for (const q of bank) {
    const ch = chs.find((c) => c.toLowerCase() === q.chapter.toLowerCase());
    if (ch) avail.get(ch)![q.difficulty] += 1;
  }
  const capacity = chs.map((c) => DIFFICULTIES.reduce((s, d) => s + avail.get(c)![d], 0));
  const want = Math.max(0, Math.floor(total));
  // Even split over chapters, capped by what each chapter has; spill the remainder to chapters with room.
  const perChapter = apportion(want, chs.map(() => 1)).map((n, i) => Math.min(n, capacity[i]!));
  let spill = want - perChapter.reduce((s, x) => s + x, 0);
  while (spill > 0) {
    let moved = false;
    for (let k = 0; k < chs.length && spill > 0; k++) {
      if (perChapter[k]! < capacity[k]!) {
        perChapter[k]! += 1;
        spill--;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const rows: BlueprintRow[] = [];
  chs.forEach((ch, i) => {
    const a = avail.get(ch)!;
    const split = apportion(perChapter[i]!, DIFFICULTIES.map((d) => mix[d]));
    const take: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
    let extra = 0;
    DIFFICULTIES.forEach((d, j) => {
      take[d] = Math.min(split[j]!, a[d]);
      extra += split[j]! - take[d];
    });
    // Nearest level first: missing hard → medium → easy; missing easy → medium → hard.
    const fallback: Record<Difficulty, Difficulty[]> = { easy: ["medium", "hard"], medium: ["easy", "hard"], hard: ["medium", "easy"] };
    for (const d of DIFFICULTIES) {
      for (const f of fallback[d]) {
        while (extra > 0 && take[f] < a[f]) {
          take[f] += 1;
          extra--;
        }
      }
    }
    for (const d of DIFFICULTIES) if (take[d] > 0) rows.push({ chapter: ch, difficulty: d, count: take[d] });
  });
  const got = rows.reduce((s, r) => s + r.count, 0);
  return { rows, shortBy: Math.max(0, want - got) };
}

/* ── Batches and seating ──────────────────────────────────────────────── */

export type BatchInput = { name: string; students: number; rollPrefix: string };
export type BatchSeating = { name: string; seats: Array<{ roll: string; set: string }>; copies: Record<string, number> };
export const MAX_BATCHES = 20;
export const MAX_STUDENTS_PER_BATCH = 500;

/** "11 JEE A, 42" or "11 JEE A, 42, A-" per line → batches. Bad lines are reported, never guessed. */
export function parseBatches(text: string): { batches: BatchInput[]; errors: string[] } {
  const batches: BatchInput[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const parts = line.split(/[,\t]/).map((p) => p.trim());
    const name = (parts[0] ?? "").slice(0, 40);
    const students = Number(parts[1]);
    if (!name || !Number.isInteger(students) || students < 1 || students > MAX_STUDENTS_PER_BATCH) {
      errors.push(`Line ${i + 1}: write it as “Batch name, number of students” (1–${MAX_STUDENTS_PER_BATCH}).`);
      return;
    }
    const prefix = (parts[2] ?? "R").replace(/[^A-Za-z0-9/_-]/g, "").slice(0, 12) || "R";
    if (batches.length < MAX_BATCHES) batches.push({ name, students, rollPrefix: prefix });
  });
  if (text.split(/\r?\n/).filter((l) => l.trim()).length > MAX_BATCHES) errors.push(`Only the first ${MAX_BATCHES} batches are used.`);
  return { batches, errors };
}

/**
 * Seats run in roll order; sets rotate A, B, C, D so no two neighbours (side or front-back in
 * rows of any width not divisible by the set count) share a set. Each batch starts on a different
 * set so the same roll number in two batches doesn't always get set A. Copies include 5% spare.
 */
export function seatingPlan(sets: string[], batches: BatchInput[]): BatchSeating[] {
  const s = sets.length ? sets : ["A"];
  return batches.map((b, bi) => {
    const width = String(b.students).length < 2 ? 2 : String(b.students).length;
    const seats = Array.from({ length: b.students }, (_, i) => ({ roll: `${b.rollPrefix}${String(i + 1).padStart(width, "0")}`, set: s[(i + bi) % s.length]! }));
    const copies: Record<string, number> = {};
    for (const set of s) {
      const n = seats.filter((x) => x.set === set).length;
      copies[set] = n ? n + Math.ceil(n * 0.05) : 0;
    }
    return { name: b.name, seats, copies };
  });
}

/* ── Item analysis ────────────────────────────────────────────────────── */

export type ItemFlag = "too-hard" | "too-easy" | "check-key" | "often-skipped";
export type ItemStat = {
  q: number; // master (set A) question number, 1-based
  chapter: string;
  difficulty: Difficulty;
  attempted: number;
  correct: number;
  pctCorrect: number; // of all students
  picks: Record<string, number>; // master letters A–E
  key: string; // e.g. "B" or "A/C"
  topWrong: string | null;
  flags: ItemFlag[];
};

const LETTERS = "ABCDE";

/**
 * Per-question statistics across all students (answers converted to master order first).
 * "check-key" fires when a single wrong option is picked by more students than the key and by at
 * least 30% of those who attempted — the classic sign of a typo in the answer key.
 */
export function itemAnalysis(paper: Paper, entries: Array<{ set: string; answers: string[] }>): ItemStat[] {
  const masters = entries.map((e) => toMaster(paper, e.set, e.answers));
  const n = masters.length;
  return paper.questions.map((q, i) => {
    const picks: Record<string, number> = {};
    for (let k = 0; k < q.options.length; k++) picks[LETTERS[k]!] = 0;
    let attempted = 0;
    let correct = 0;
    const keyLetters = q.answer.map((a) => LETTERS[a]!);
    for (const m of masters) {
      const a = m[i] ?? "";
      if (!a) continue;
      attempted++;
      picks[a] = (picks[a] ?? 0) + 1;
      if (keyLetters.includes(a)) correct++;
    }
    const wrong = Object.entries(picks).filter(([l]) => !keyLetters.includes(l)).sort((a, b) => b[1] - a[1]);
    const topWrong = wrong[0] && wrong[0][1] > 0 ? wrong[0][0] : null;
    const pctCorrect = n ? Math.round((correct / n) * 100) : 0;
    const flags: ItemFlag[] = [];
    if (n >= 5) {
      const topWrongCount = wrong[0]?.[1] ?? 0;
      if (attempted && topWrongCount > correct && topWrongCount >= 0.3 * attempted) flags.push("check-key");
      if (pctCorrect < 30) flags.push("too-hard");
      if (pctCorrect >= 90) flags.push("too-easy");
      if (n - attempted >= 0.4 * n) flags.push("often-skipped");
    }
    return { q: i + 1, chapter: q.chapter, difficulty: q.difficulty, attempted, correct, pctCorrect, picks, key: keyLetters.join("/"), topWrong, flags };
  });
}

export const FLAG_TEXT: Record<ItemFlag, string> = {
  "check-key": "Check the answer key",
  "too-hard": "Too hard for this batch",
  "too-easy": "Too easy",
  "often-skipped": "Often skipped",
};

/**
 * Suggests a better difficulty tag from real results (needs 10+ students): under 30% correct
 * reads as hard, 30–69% as medium, 70%+ as easy. The teacher applies it; nothing changes silently.
 */
export function suggestedDifficulty(stat: ItemStat, students: number): Difficulty | null {
  if (students < 10) return null;
  const d: Difficulty = stat.pctCorrect < 30 ? "hard" : stat.pctCorrect < 70 ? "medium" : "easy";
  return d === stat.difficulty ? null : d;
}
