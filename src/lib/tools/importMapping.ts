/**
 * Turns result sheets exported from test platforms, ERPs or Google Forms into the
 * analyser's shape: one ID column, then one column per chapter, optional MAX row.
 *
 *  - Finds the real header row (skips title rows such as "Unit Test 3 — Results").
 *  - Picks the best student-identifier column (roll no > enrolment > admission > id);
 *    uses names only if nothing else exists — and suggests roll numbers for privacy.
 *  - Drops columns that aren't chapters: serial numbers, names, contact details,
 *    totals, ranks, percentiles, grades, timestamps…
 *  - Combines question-wise marks into chapters when a "Chapter" row maps each
 *    question column to its chapter (sums marks and maximums per chapter).
 *
 * Pure function; every decision is explained in `notes` so the teacher can check it.
 */
import { ABSENT, MAX_ROW } from "./classAnalysis";

export type MappingResult = { rows: string[][]; notes: string[]; changed: boolean };

const ID_PATTERNS: Array<[RegExp, number]> = [
  [/^roll\s*(no\.?|number|#)?$/i, 1],
  [/^(enrol(l)?ment|enrl)\s*(no\.?|number|id)?$/i, 2],
  [/^admission\s*(no\.?|number|id)?$/i, 3],
  [/^(student|candidate|learner)\s*(id|code|no\.?|number)$/i, 4],
  [/^reg(istration)?\.?\s*(no\.?|number|id)?$/i, 5],
  [/^(id|uid)$/i, 6],
];
const NAME = /^(student'?s?\s*)?(full\s*)?name(\s*of\s*(the\s*)?student)?$|^(candidate|student)$/i;
const SERIAL = /^(s\.?\s*no\.?|sr\.?\s*no\.?|sl\.?\s*no\.?|serial(\s*no\.?)?|#|no\.?)$/i;
const NON_TOPIC =
  /^(father'?s?.*|mother'?s?.*|guardian.*|parent.*|phone|mobile|mob\.?\s*no\.?|contact.*|whats\s*app.*|e-?mail.*|dob|date\s*of\s*birth|gender|sex|batch|section|class|stream|course|centre|center|branch|total|total\s*marks|grand\s*total|marks\s*obtained|obtained|net\s*score|score|total\s*score|percentage|percent|%|rank|air|rank\s*\(air\)|percentile|result|grade|division|remarks?|status|attendance|timestamp|time\s*taken|time|date|submitted.*|duration|attempted|unattempted|not\s*attempted|correct|wrong|incorrect|right|accuracy|negative.*|positive.*|bonus|max\s*marks|total\s*questions)$/i;
const CHAPTER_ROW = /^(chapter|chapters|topic|topics|unit|units|mapping|chapter\s*mapping)\s*:?$/i;
const QUESTION = /^q(ues(tion)?)?\.?\s*-?\s*\d+[a-z]?$/i;

const nonEmpty = (r: string[]) => r.some((c) => (c ?? "").trim() !== "");

function idScore(h: string): number | null {
  for (const [re, score] of ID_PATTERNS) if (re.test(h.trim())) return score;
  return null;
}

function num(v: string): number | null {
  const t = v.trim().replace(/,/g, ".");
  if (!/^[+]?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

export function normaliseExport(input: string[][]): MappingResult {
  const notes: string[] = [];
  let rows = input.map((r) => r.map((c) => (c ?? "").trim()));
  rows = rows.filter(nonEmpty);
  if (rows.length < 2) return { rows, notes, changed: false };

  // 1. Header row: within the top 5 rows, the first with an ID/name column and 2+ filled cells;
  //    otherwise the first row with 2+ filled cells (title rows have just one).
  const filled = (r: string[]) => r.filter((c) => c).length;
  let headerIdx = rows.findIndex((r, i) => i < 5 && filled(r) >= 2 && r.some((c) => idScore(c) !== null || NAME.test(c)));
  if (headerIdx < 0) headerIdx = rows.findIndex((r, i) => i < 5 && filled(r) >= 2);
  if (headerIdx < 0) headerIdx = 0;
  if (headerIdx > 0) notes.push(`Skipped ${headerIdx} title row${headerIdx === 1 ? "" : "s"} above the table.`);
  rows = rows.slice(headerIdx);
  const header = rows[0]!;
  const width = Math.max(...rows.map((r) => r.length));
  const col = (r: string[], i: number) => r[i] ?? "";

  // 2. Identifier column.
  let idCol = -1;
  let best = Infinity;
  header.forEach((h, i) => {
    const s = idScore(h);
    if (s !== null && s < best) {
      best = s;
      idCol = i;
    }
  });
  const nameCol = header.findIndex((h) => NAME.test(h.trim()));
  if (idCol < 0 && nameCol >= 0) {
    idCol = nameCol;
    notes.push(`Using “${header[nameCol]}” to identify students. Roll numbers are better for privacy — names then never appear in reports.`);
  }

  // 3. Optional chapter-mapping row directly under the header (question-wise exports).
  const mapIdx = rows.findIndex((r, i) => i > 0 && i <= 3 && CHAPTER_ROW.test(col(r, idCol >= 0 ? idCol : 0)));

  // 4. Which columns are chapters?
  const keep: number[] = [];
  const dropped: string[] = [];
  for (let i = 0; i < width; i++) {
    if (i === idCol) continue;
    const h = col(header, i);
    if (!h && mapIdx < 0) continue;
    if (i === nameCol || SERIAL.test(h) || NON_TOPIC.test(h) || idScore(h) !== null) {
      if (h) dropped.push(h);
      continue;
    }
    keep.push(i);
  }
  if (idCol < 0) {
    // No recognisable identifier: assume the first kept column is the identifier (classic template).
    idCol = keep.shift() ?? 0;
  }
  if (dropped.length) notes.push(`Ignored columns that aren't chapters: ${dropped.slice(0, 8).join(", ")}${dropped.length > 8 ? "…" : ""}.`);
  if (idCol !== 0 && header[idCol]) notes.push(`Using “${header[idCol]}” as the student column.`);

  let out: string[][];
  if (mapIdx > 0) {
    // Group question columns by chapter and sum.
    const mapRow = rows[mapIdx]!;
    const groups = new Map<string, number[]>();
    for (const i of keep) {
      const chapter = col(mapRow, i);
      if (!chapter) continue;
      groups.set(chapter, [...(groups.get(chapter) ?? []), i]);
    }
    const chapters = [...groups.keys()];
    out = [[col(header, idCol) || "Student", ...chapters]];
    for (let r = 1; r < rows.length; r++) {
      if (r === mapIdx) continue;
      const row = rows[r]!;
      const cells = chapters.map((ch) => {
        const idx = groups.get(ch)!;
        const values = idx.map((i) => col(row, i));
        if (values.every((v) => ABSENT.has(v.toLowerCase()))) return "AB";
        let sum = 0;
        for (const v of values) {
          if (ABSENT.has(v.toLowerCase())) continue;
          const n = num(v);
          if (n === null) return v; // let the parser report the odd value precisely
          sum += n;
        }
        return String(Math.round(sum * 100) / 100);
      });
      out.push([col(row, idCol), ...cells]);
    }
    notes.push(`Combined ${keep.length} question columns into ${chapters.length} chapter${chapters.length === 1 ? "" : "s"} using the “${col(mapRow, idCol >= 0 ? idCol : 0)}” row.`);
  } else {
    out = rows.map((r) => [col(r, idCol), ...keep.map((i) => col(r, i))]);
    const questionLike = keep.filter((i) => QUESTION.test(col(header, i))).length;
    if (questionLike >= 5) {
      notes.push(
        "These look like question-wise marks (Q1, Q2…). For a chapter plan, add a row under the header whose first cell is “Chapter” and put each question's chapter in it — Heramb will add the questions up per chapter.",
      );
    }
  }

  // Keep a MAX row (if any) right under the header, as the analyser expects.
  const maxAt = out.findIndex((r, i) => i > 0 && MAX_ROW.test((r[0] ?? "").trim()));
  if (maxAt > 1) {
    const [maxRow] = out.splice(maxAt, 1);
    out.splice(1, 0, maxRow!);
    notes.push("Moved the maximum-marks row under the header.");
  }

  const changed = JSON.stringify(out) !== JSON.stringify(input.filter(nonEmpty));
  return { rows: out.filter(nonEmpty), notes, changed };
}
