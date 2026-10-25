/**
 * Test paper map: turns question-wise marks (or right/wrong answers from OMR and online
 * tests) into chapter-wise marks, so teachers never re-mark sheets by chapter.
 *
 *   Map (one line per chapter, typed once per paper):
 *     1-10: Kinematics
 *     11-20, 25: Laws of motion
 *     21 22 23 24 Work energy
 *
 *   Table: first column = roll number, then one column per question (Q1, Q2… or 1, 2…).
 *   Cells are either marks per question, or answers: C/W/U, R/W, ✓/✗, 1/0 (blank = not attempted).
 *
 * Pure and dependency-free: same result on every device; every decision is explained in `notes`.
 */
import { ABSENT, MAX_ROW } from "./classAnalysis";

export type PaperScheme =
  | { kind: "marks"; maxPerQuestion: number } // cells hold marks; MAX row wins if present
  | { kind: "answers"; correct: number; wrong: number } // cells hold C/W/U; wrong is a penalty (e.g. 1 → −1)
  // Cells hold the option the student marked (A/B/C/D or 1–4), compared with an answer key —
  // typed by the teacher, or a row in the sheet whose first cell is "KEY" / "Answer key".
  | { kind: "responses"; correct: number; wrong: number; key?: string };

/** "ABCD BCDA", "A,B,C,D", "a b c d" → ["A","B","C","D",…]. Options are A–E or 1–5; "*" = bonus (everyone correct). */
export function parseAnswerKey(text: string): string[] {
  const t = text.toUpperCase().replace(/[^A-E1-5*,;\s]/g, "");
  // Groups like "ABCDA BCDAB" are read letter by letter; separators are optional.
  return t
    .split(/[,;\s]+/)
    .filter(Boolean)
    .flatMap((tok) => [...tok])
    .filter((p) => /^([A-E]|[1-5]|\*)$/.test(p));
}
const KEY_ROW = /^(answer\s*)?key$/i;

export type PaperMapLine = { chapter: string; questions: number[] };
export type PaperMapParse = { lines: PaperMapLine[]; errors: string[] };
export type PaperMapResult = { rows: string[][] | null; notes: string[]; errors: string[] };

export const MAX_QUESTIONS = 300;
const NUM_SPEC = /^\s*((?:q?\s*\d{1,3}\s*(?:(?:-|–|to)\s*q?\s*\d{1,3})?\s*[,;/\s]\s*)*q?\s*\d{1,3}\s*(?:(?:-|–|to)\s*q?\s*\d{1,3})?)\s*[:=\-–|]?\s*(.+?)\s*$/i;

/** Parses the teacher's map. Chapter names must not start with a digit. */
export function parsePaperMap(text: string): PaperMapParse {
  const lines: PaperMapLine[] = [];
  const errors: string[] = [];
  const owner = new Map<number, string>();
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const m = NUM_SPEC.exec(line);
      const chapter = m?.[2]?.replace(/^[:=\-–|\s]+/, "").trim() ?? "";
      if (!m || !chapter || /^\d/.test(chapter)) {
        errors.push(`Line ${i + 1} (“${line.slice(0, 40)}”): write it like “1-10: Kinematics”.`);
        return;
      }
      const qs: number[] = [];
      for (const part of m[1]!.replace(/\s*(?:-|–|\bto\b)\s*/gi, "-").split(/[,;/]|\s+(?=q?\s*\d)/i).map((p) => p.trim()).filter(Boolean)) {
        const r = /^q?\s*(\d{1,3})\s*(?:(?:-|–|to)\s*q?\s*(\d{1,3}))?$/i.exec(part);
        if (!r) continue;
        const a = Number(r[1]);
        const b = r[2] ? Number(r[2]) : a;
        if (a < 1 || b < a || b > MAX_QUESTIONS) {
          errors.push(`Line ${i + 1}: “${part}” isn't a valid question range.`);
          continue;
        }
        for (let q = a; q <= b; q++) qs.push(q);
      }
      if (!qs.length) {
        errors.push(`Line ${i + 1}: no question numbers found.`);
        return;
      }
      const name = chapter.slice(0, 80);
      for (const q of qs) {
        const prev = owner.get(q);
        if (prev && prev !== name) errors.push(`Question ${q} is in both “${prev}” and “${name}”.`);
        owner.set(q, name);
      }
      const existing = lines.find((l) => l.chapter.toLowerCase() === name.toLowerCase());
      if (existing) existing.questions.push(...qs.filter((q) => !existing.questions.includes(q)));
      else lines.push({ chapter: name, questions: [...new Set(qs)] });
    });
  return { lines, errors };
}

const CORRECT = new Set(["c", "r", "t", "y", "✓", "✔", "correct", "right", "true", "yes"]);
const WRONG = new Set(["w", "x", "f", "n", "0", "✗", "✘", "×", "wrong", "incorrect", "false", "no"]);
const UNATTEMPTED = new Set(["u", "na", "n/a", "-", "—", "–", "s", "skip", "skipped", "unattempted", "not attempted"]);

/** Number of the question a header cell names: "Q12", "Q.12", "Question 12", "12" → 12. */
export function questionNumber(header: string): number | null {
  const m = /^\s*(?:q(?:ues(?:tion)?)?\.?\s*(?:no\.?)?\s*-?\s*)?(\d{1,3})\s*[a-z]?\s*$/i.exec(header);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= MAX_QUESTIONS ? n : null;
}

function num(v: string): number | null {
  const t = v.trim().replace(/,/g, ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Applies a paper map to a parsed table (header row first). Returns chapter-wise rows ready
 * for the analyser (ID, chapters…, with a MAX row), or errors explaining what to fix.
 */
export function applyPaperMap(input: string[][], map: PaperMapLine[], scheme: PaperScheme): PaperMapResult {
  const notes: string[] = [];
  const errors: string[] = [];
  const rows = input.map((r) => r.map((c) => (c ?? "").trim())).filter((r) => r.some(Boolean));
  if (rows.length < 2) return { rows: null, notes, errors: ["Paste the question-wise table first (a header row and at least one student)."] };
  if (!map.length) return { rows: null, notes, errors: ["Add the paper map: which questions belong to which chapter."] };

  const header = rows[0]!;
  // Question columns: by header number; otherwise columns 2…n are Q1…Qn.
  const colOf = new Map<number, number>();
  header.forEach((h, i) => {
    if (i === 0) return;
    const q = questionNumber(h);
    if (q !== null && !colOf.has(q)) colOf.set(q, i);
  });
  if (colOf.size < Math.min(2, header.length - 1)) {
    colOf.clear();
    for (let i = 1; i < header.length; i++) colOf.set(i, i);
    notes.push(`The header has no question numbers, so columns 2–${header.length} are read as Q1–Q${header.length - 1}.`);
  }

  const mapped = map.map((l) => ({ ...l, cols: l.questions.map((q) => colOf.get(q)).filter((c): c is number => c !== undefined) }));
  const missing = map.flatMap((l) => l.questions.filter((q) => !colOf.has(q)));
  if (missing.length) notes.push(`Not in the table, so ignored: Q${[...new Set(missing)].slice(0, 12).join(", Q")}${missing.length > 12 ? "…" : ""}.`);
  const usedCols = new Set(mapped.flatMap((m) => m.cols));
  const unmapped = [...colOf.entries()].filter(([, c]) => !usedCols.has(c)).map(([q]) => q);
  if (unmapped.length) notes.push(`No chapter given, so left out: Q${unmapped.slice(0, 12).join(", Q")}${unmapped.length > 12 ? "…" : ""}.`);
  const chapters = mapped.filter((m) => m.cols.length);
  if (!chapters.length) return { rows: null, notes, errors: ["None of the mapped questions are in the table. Check the question numbers."] };

  // Optional MAX row (marks scheme only).
  const maxIdx = rows.findIndex((r, i) => i > 0 && MAX_ROW.test(r[0] ?? ""));
  // Answer key (responses scheme): typed key wins; otherwise a KEY row in the sheet.
  const keyIdx = rows.findIndex((r, i) => i > 0 && KEY_ROW.test(r[0] ?? ""));
  let keyFor: ((q: number, col: number) => string | null) | null = null;
  if (scheme.kind === "responses") {
    const typed = scheme.key ? parseAnswerKey(scheme.key) : [];
    if (typed.length) {
      keyFor = (q) => typed[q - 1] ?? null;
      notes.push(`Using the answer key you typed (${typed.length} answers).`);
    } else if (keyIdx > 0) {
      const keyRow = rows[keyIdx]!;
      keyFor = (_q, col) => {
        const k = (keyRow[col] ?? "").trim().toUpperCase();
        return k || null;
      };
      notes.push("Using the answer-key row from the sheet.");
    } else {
      return { rows: null, notes, errors: ["Add the answer key: type it (e.g. “ABCDA BCDAB…”), or include a row whose first cell is KEY."] };
    }
    const noKey = chapters.flatMap((c) => c.cols.map((col) => [...colOf.entries()].find(([, cc]) => cc === col)![0])).filter((q) => !keyFor!(q, colOf.get(q)!));
    if (noKey.length) return { rows: null, notes, errors: [`The answer key has no answer for Q${noKey.slice(0, 12).join(", Q")}${noKey.length > 12 ? "…" : ""}.`] };
  }
  const maxRow = maxIdx > 0 ? rows[maxIdx]! : null;
  const qMax = (col: number): number => {
    if (scheme.kind !== "marks") return scheme.correct;
    const v = maxRow ? num(maxRow[col] ?? "") : null;
    return v !== null && v > 0 ? v : scheme.maxPerQuestion;
  };

  const out: string[][] = [[header[0] || "Roll no", ...chapters.map((c) => c.chapter)], ["MAX", ...chapters.map((c) => String(round(c.cols.reduce((s, col) => s + qMax(col), 0))))]];
  const odd: string[] = [];
  for (let r = 1; r < rows.length; r++) {
    if (r === maxIdx || r === keyIdx) continue;
    const row = rows[r]!;
    const id = row[0] ?? "";
    if (!id) continue;
    const cells = chapters.map((c) => {
      const values = c.cols.map((col) => row[col] ?? "");
      if (values.every((v) => v === "" || ABSENT.has(v.toLowerCase()))) return "AB";
      let sum = 0;
      for (let k = 0; k < values.length; k++) {
        const raw = values[k]!;
        const v = raw.toLowerCase();
        if (scheme.kind === "responses") {
          const col = c.cols[k]!;
          const q = [...colOf.entries()].find(([, cc]) => cc === col)![0];
          const key = keyFor!(q, col)!;
          const ans = raw.trim().toUpperCase();
          if (ans === "" || UNATTEMPTED.has(v) || ABSENT.has(v)) continue;
          if (key === "*" || key.split("/").includes(ans)) sum += scheme.correct;
          else if (/^([A-E]|[1-5])$/.test(ans)) sum -= Math.abs(scheme.wrong);
          else if (odd.length < 5) odd.push(`${id}: “${raw}”`);
        } else if (scheme.kind === "answers") {
          if (CORRECT.has(v) || v === "1") sum += scheme.correct;
          else if (WRONG.has(v)) sum -= Math.abs(scheme.wrong);
          else if (v === "" || UNATTEMPTED.has(v) || ABSENT.has(v)) continue;
          else if (odd.length < 5) odd.push(`${id}: “${raw}”`);
        } else {
          if (v === "" || ABSENT.has(v)) continue;
          const n = num(raw);
          if (n === null) {
            if (odd.length < 5) odd.push(`${id}: “${raw}”`);
            continue;
          }
          sum += n;
        }
      }
      return String(round(sum));
    });
    out.push([id, ...cells]);
  }
  if (odd.length) {
    errors.push(
      scheme.kind === "responses"
        ? `Some answers aren't an option (A–E or 1–5) or blank — for example ${odd.join(", ")}.`
        : scheme.kind === "answers"
        ? `Some answers weren't C (correct), W (wrong) or blank — for example ${odd.join(", ")}. Fix them or switch to “marks per question”.`
        : `Some cells aren't numbers — for example ${odd.join(", ")}. If the sheet has C/W answers, choose “right / wrong answers”.`,
    );
    return { rows: null, notes, errors };
  }
  if (out.length < 3) return { rows: null, notes, errors: ["No student rows found under the header."] };
  notes.unshift(
    `Combined ${usedCols.size} question${usedCols.size === 1 ? "" : "s"} into ${chapters.length} chapter${chapters.length === 1 ? "" : "s"}${
      scheme.kind !== "marks" ? ` (+${scheme.correct} correct, −${Math.abs(scheme.wrong)} wrong, 0 not attempted)` : ""
    }.`,
  );
  if (scheme.kind !== "marks" && scheme.wrong) notes.push("Negative marking can make a chapter score below zero; it's shown as 0%.");
  return { rows: out, notes, errors };
}
