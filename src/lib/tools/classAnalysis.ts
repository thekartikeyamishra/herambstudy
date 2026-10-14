/**
 * Class Test Analyser — pure logic (no DOM), fully unit-tested.
 *
 * Input: a table pasted from Excel/Google Sheets or a CSV file.
 *   Row 1:  Student | Topic A | Topic B | …
 *   Row 2 (optional): MAX | 20 | 16 | …       (maximum marks per topic; default 100 = percentages)
 *   Rows 3+: <roll no or name> | marks | marks | …   (blank, "-", "AB" or "absent" = not attempted)
 */
import { statusFor, type MasteryStatus } from "@/content/sampleData";

export const LIMITS = { students: 500, topics: 40, cellChars: 80, bytes: 1_000_000 } as const;

/** Share of attempting students below 50% at which a topic should be retaught to the whole class. */
export const WHOLE_CLASS_THRESHOLD = 1 / 3;

export type ParseIssue = { row: number; column?: number; message: string };

export type Dataset = {
  topics: Array<{ name: string; max: number }>;
  students: Array<{ id: string; scores: Array<number | null> }>;
  /** True when no MAX row was given and values are treated as percentages. */
  assumedPercent: boolean;
};

const ABSENT = new Set(["", "-", "—", "ab", "abs", "absent", "na", "n/a", "x"]);

/** Labels for the optional maximum-marks row (Indian usage includes "M.M." and "Full marks"). */
export const MAX_ROW = /^(max|max\.?\s*marks|maximum(\s*marks)?|m\.?\s*m\.?|full\s*marks|f\.?\s*m\.?|out\s*of|total\s*marks|total)$/i;
/** Summary rows that teachers often leave at the bottom of a marks sheet. */
const SUMMARY_ROW = /^(total|grand\s*total|sum|average|avg\.?|class\s*average|mean|highest|lowest|min(imum)?|max(imum)?)$/i;
/** Header names that are identifiers, not topics (a second ID column would be analysed as marks). */
const ID_COLUMN = /^(roll(\s*no\.?|\s*number)?|name|student(\s*name)?|admission(\s*no\.?)?|adm\.?\s*no\.?|s\.?\s*no\.?|sr\.?\s*no\.?|serial(\s*no\.?)?|section|class|batch|father'?s?\s*name|enrol+ment(\s*no\.?)?|reg(istration)?\.?\s*no\.?|id)$/i;
/** Header names that are totals or results, not topics (they would double-count marks). */
const TOTAL_COLUMN = /^(total|grand\s*total|overall|percentage|percent|%|aggregate|rank|position|grade|result|marks\s*obtained|obtained|sum|average|avg\.?)$/i;

/** Rejects pasted or uploaded text above the size limit (protects the browser and saved data). */
export function checkTextSize(text: string): string | null {
  const bytes = new TextEncoder().encode(text).byteLength;
  return bytes > LIMITS.bytes
    ? `That's ${(bytes / 1_000_000).toFixed(1)} MB — the limit is 1 MB. Remove extra columns or split the class into smaller groups.`
    : null;
}

/** Splits delimited text into rows of cells. Handles quotes, CRLF and BOM. */
export function parseTable(text: string): string[][] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = clean.split("\n").find((l) => l.trim().length > 0) ?? "";
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"' && cell.trim() === "") {
      inQuotes = true;
      cell = "";
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.length > 0));
}

const NUMBER = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

/**
 * Strict number parsing: plain decimals only (a single decimal comma is allowed).
 * Rejects things Number() would silently accept, such as "0x10", "1e3" or "Infinity".
 * A trailing "%" is returned separately so it can be converted against the topic maximum.
 */
function toNumber(raw: string): { value: number; percent: boolean } | null | "invalid" {
  let v = raw.trim().replace(/\s+/g, "");
  if (ABSENT.has(v.toLowerCase())) return null;
  const percent = v.endsWith("%");
  if (percent) v = v.slice(0, -1);
  if ((v.match(/,/g) ?? []).length === 1 && !v.includes(".")) v = v.replace(",", ".");
  if (!NUMBER.test(v)) return "invalid";
  const n = Number(v);
  return Number.isFinite(n) ? { value: n, percent } : "invalid";
}

export function buildDataset(rows: string[][]): { dataset: Dataset | null; issues: ParseIssue[] } {
  const issues: ParseIssue[] = [];
  if (rows.length < 2) {
    return { dataset: null, issues: [{ row: 1, message: "Add a header row with topic names and at least one student row." }] };
  }

  const header = rows[0]!;
  const topicNames = header.slice(1).map((t) => t.slice(0, LIMITS.cellChars));
  if (topicNames.length === 0 || topicNames.every((t) => !t)) {
    return { dataset: null, issues: [{ row: 1, message: "The header row needs at least one topic name after the student column." }] };
  }
  if (topicNames.length > LIMITS.topics) {
    return { dataset: null, issues: [{ row: 1, message: `Please use at most ${LIMITS.topics} topics.` }] };
  }
  const seen = new Set<string>();
  topicNames.forEach((t, i) => {
    if (!t) issues.push({ row: 1, column: i + 2, message: "Topic name is empty." });
    const key = t.toLowerCase();
    if (t && seen.has(key)) issues.push({ row: 1, column: i + 2, message: `Topic "${t}" appears twice.` });
    seen.add(key);
    if (t && ID_COLUMN.test(t)) {
      issues.push({ row: 1, column: i + 2, message: `"${t}" looks like an ID column, not a topic. Keep one ID column (the first) and delete this one.` });
    } else if (t && TOTAL_COLUMN.test(t)) {
      issues.push({ row: 1, column: i + 2, message: `"${t}" looks like a total or result column, not a topic. Delete it — totals are worked out for you.` });
    }
  });

  let body = rows.slice(1);
  let maxes = topicNames.map(() => 100);
  let assumedPercent = true;
  if (body[0] && MAX_ROW.test(body[0][0] ?? "")) {
    assumedPercent = false;
    maxes = topicNames.map((_, i) => {
      const n = toNumber(body[0]![i + 1] ?? "");
      if (n === null || n === "invalid" || n.percent || n.value <= 0) {
        issues.push({ row: 2, column: i + 2, message: "Maximum marks must be a number above 0." });
        return 1;
      }
      return n.value;
    });
    body = body.slice(1);
  }

  if (body.length === 0) issues.push({ row: 2, message: "Add at least one student row." });
  if (body.length > LIMITS.students) {
    return { dataset: null, issues: [{ row: 1, message: `Please analyse at most ${LIMITS.students} students at a time.` }] };
  }

  const rowOffset = assumedPercent ? 2 : 3;
  const ids = new Set<string>();
  const students = body.map((r, idx) => {
    const rowNo = idx + rowOffset;
    const id = (r[0] ?? "").slice(0, LIMITS.cellChars);
    if (!id) issues.push({ row: rowNo, column: 1, message: "This row has no roll number or name. Every student needs one, so tests can be compared later." });
    else if (SUMMARY_ROW.test(id) || MAX_ROW.test(id)) {
      issues.push({ row: rowNo, column: 1, message: `"${id}" looks like a summary or maximum-marks row, not a student. A MAX row must come straight after the header; delete any total/average rows.` });
      return { id, scores: topicNames.map(() => null) }; // one clear message for this row, not one per cell
    }
    if (id && ids.has(id.toLowerCase())) issues.push({ row: rowNo, column: 1, message: `"${id}" appears more than once.` });
    ids.add(id.toLowerCase());
    if (r.length - 1 > topicNames.length) issues.push({ row: rowNo, message: "This row has more values than there are topics." });
    const scores = topicNames.map((_, i) => {
      const parsed = toNumber(r[i + 1] ?? "");
      if (parsed === "invalid") {
        issues.push({ row: rowNo, column: i + 2, message: `"${r[i + 1]}" isn't a number. Use a number (e.g. 14 or 7.5), "75%", or leave blank / "AB" if absent.` });
        return null;
      }
      if (parsed === null) return null;
      // "75%" means 75% of this topic's maximum (or simply 75 when values are percentages).
      const n = parsed.percent ? Math.round(((parsed.value / 100) * maxes[i]!) * 100) / 100 : parsed.value;
      if (parsed.percent && (parsed.value < 0 || parsed.value > 100)) {
        issues.push({ row: rowNo, column: i + 2, message: `${parsed.value}% isn't between 0% and 100%.` });
        return null;
      }
      {
        const max = maxes[i]!;
        if (n > max) {
          issues.push({
            row: rowNo,
            column: i + 2,
            message: assumedPercent
              ? `${n} is above 100. If these are marks, add a MAX row under the header (see the template).`
              : `${n} is above the maximum of ${max}.`,
          });
        } else if (n < -max) issues.push({ row: rowNo, column: i + 2, message: `${n} is below the lowest possible score.` });
      }
      return n;
    });
    return { id, scores };
  });

  if (issues.length) return { dataset: null, issues: issues.slice(0, 50) };
  return {
    dataset: { topics: topicNames.map((name, i) => ({ name, max: maxes[i]! })), students, assumedPercent },
    issues: [],
  };
}

export type TopicSummary = {
  name: string;
  attempted: number;
  average: number;
  status: MasteryStatus;
  belowHalf: string[];
  shareBelowHalf: number;
  action: "whole_class" | "small_group" | "maintain" | "no_data";
};

export type StudentSummary = {
  id: string;
  percents: Array<number | null>;
  overall: number | null;
  gaps: Array<{ topic: string; percent: number }>;
  needsAttention: boolean;
};

export type ClassAnalysis = {
  topics: TopicSummary[];
  students: StudentSummary[];
  classAverage: number | null;
  /** Topics ordered by urgency for the teaching plan. */
  plan: TopicSummary[];
};

const pct = (score: number, max: number) => Math.round((Math.max(score, 0) / max) * 100);

export function analyseClass(data: Dataset): ClassAnalysis {
  const students: StudentSummary[] = data.students.map((s) => {
    const percents = s.scores.map((v, i) => (v === null ? null : pct(v, data.topics[i]!.max)));
    const present = percents.filter((p): p is number => p !== null);
    const overall = present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : null;
    const gaps = percents
      .map((p, i) => ({ topic: data.topics[i]!.name, percent: p }))
      .filter((g): g is { topic: string; percent: number } => g.percent !== null && g.percent < 50)
      .sort((a, b) => a.percent - b.percent);
    return { id: s.id, percents, overall, gaps, needsAttention: present.length > 0 && gaps.length >= Math.ceil(present.length / 2) };
  });

  const topics: TopicSummary[] = data.topics.map((t, i) => {
    const values = students.map((s) => ({ id: s.id, p: s.percents[i] })).filter((x): x is { id: string; p: number } => x.p !== null && x.p !== undefined);
    if (!values.length) {
      return { name: t.name, attempted: 0, average: 0, status: "gap", belowHalf: [], shareBelowHalf: 0, action: "no_data" };
    }
    const average = Math.round(values.reduce((a, b) => a + b.p, 0) / values.length);
    const belowHalf = values.filter((v) => v.p < 50).sort((a, b) => a.p - b.p).map((v) => v.id);
    const shareBelowHalf = belowHalf.length / values.length;
    const action: TopicSummary["action"] =
      shareBelowHalf >= WHOLE_CLASS_THRESHOLD ? "whole_class" : belowHalf.length > 0 ? "small_group" : "maintain";
    return { name: t.name, attempted: values.length, average, status: statusFor(average), belowHalf, shareBelowHalf, action };
  });

  const rank = { whole_class: 0, small_group: 1, maintain: 2, no_data: 3 } as const;
  const plan = [...topics].sort((a, b) => rank[a.action] - rank[b.action] || b.shareBelowHalf - a.shareBelowHalf || a.average - b.average);
  const overalls = students.map((s) => s.overall).filter((o): o is number => o !== null);
  const classAverage = overalls.length ? Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length) : null;
  return { topics, students, classAverage, plan };
}

const csvCell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Reteach groups: one row per topic with the students below 50%. */
export function groupsToCsv(a: ClassAnalysis): string {
  const header = ["Topic", "Class average %", "Students below 50%", "Share below 50%", "Suggested action", "Students"];
  const label = { whole_class: "Reteach to whole class", small_group: "Small-group recap", maintain: "Maintain", no_data: "No data" };
  const lines = a.plan.map((t) =>
    [t.name, t.average, t.belowHalf.length, `${Math.round(t.shareBelowHalf * 100)}%`, label[t.action], t.belowHalf.join("; ")]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function templateCsv(): string {
  return ["Roll no,Topic 1,Topic 2,Topic 3", "MAX,20,20,20", "R01,14,9,AB", "R02,18,12,15"].join("\n");
}

/** Deterministic fictional sample (24 students × 6 Chemistry topics). */
export function sampleCsv(): string {
  const topics = ["Mole concept", "Atomic structure", "Chemical bonding", "Thermodynamics", "Equilibrium", "Redox"];
  const max = [20, 20, 20, 16, 16, 8];
  // Base difficulty per topic (fraction typically scored) — Equilibrium and Bonding are weak.
  const base = [0.72, 0.78, 0.48, 0.6, 0.42, 0.74];
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const rows = [["Roll no", ...topics].join(","), ["MAX", ...max].join(",")];
  for (let s = 1; s <= 24; s++) {
    const ability = (rand() - 0.5) * 0.5;
    const cells = topics.map((_, i) => {
      if (rand() < 0.03) return "AB";
      const f = Math.min(1, Math.max(0, base[i]! + ability + (rand() - 0.5) * 0.3));
      return String(Math.round(f * max[i]!));
    });
    rows.push([`R${String(s).padStart(2, "0")}`, ...cells].join(","));
  }
  return rows.join("\n");
}

/* ── Follow-up comparison (the VERIFY step) ──────────────────────────────── */

export type TopicChange = {
  name: string;
  before: number;
  after: number;
  change: number;
  verdict: "improved" | "declined" | "no_clear_change";
  /** Students below 50% before who are at or above 50% after. */
  closed: string[];
  /** Students below 50% in both tests. */
  stillBelow: string[];
  /** Students at or above 50% before who fell below. */
  slipped: string[];
};

export type ClassComparison = {
  topics: TopicChange[];
  matchedStudents: number;
  unmatchedTopics: { onlyFirst: string[]; onlySecond: string[] };
  unmatchedStudents: { onlyFirst: number; onlySecond: number };
  totals: { closed: number; stillBelow: number; slipped: number };
};

const keyOf = (s: string) => s.trim().toLowerCase();

/**
 * Compares two class tests topic by topic, only for topics present in both and
 * students present in both (matched by roll number / name, case-insensitive).
 * Class-average changes within ±margin points are "no clear change".
 */
export function compareClasses(first: Dataset, second: Dataset, margin = 5): ClassComparison {
  const m = Number.isFinite(margin) ? Math.min(Math.max(margin, 0), 50) : 5;
  const a = analyseClass(first);
  const b = analyseClass(second);

  const bTopicIndex = new Map(second.topics.map((t, i) => [keyOf(t.name), i]));
  const aTopicKeys = new Set(first.topics.map((t) => keyOf(t.name)));
  const bStudents = new Map(b.students.map((s) => [keyOf(s.id), s]));
  const aStudentKeys = new Set(a.students.map((s) => keyOf(s.id)));
  const pairs = a.students
    .map((s) => ({ id: s.id, before: s, after: bStudents.get(keyOf(s.id)) }))
    .filter((p): p is { id: string; before: StudentSummary; after: StudentSummary } => Boolean(p.after));

  const topics: TopicChange[] = [];
  first.topics.forEach((t, ia) => {
    const ib = bTopicIndex.get(keyOf(t.name));
    if (ib === undefined) return;
    const both = pairs
      .map((p) => ({ id: p.id, x: p.before.percents[ia], y: p.after.percents[ib] }))
      .filter((v): v is { id: string; x: number; y: number } => typeof v.x === "number" && typeof v.y === "number");
    if (!both.length) return;
    const before = Math.round(both.reduce((s, v) => s + v.x, 0) / both.length);
    const after = Math.round(both.reduce((s, v) => s + v.y, 0) / both.length);
    const change = after - before;
    topics.push({
      name: t.name,
      before,
      after,
      change,
      verdict: Math.abs(change) <= m ? "no_clear_change" : change > 0 ? "improved" : "declined",
      closed: both.filter((v) => v.x < 50 && v.y >= 50).map((v) => v.id),
      stillBelow: both.filter((v) => v.x < 50 && v.y < 50).map((v) => v.id),
      slipped: both.filter((v) => v.x >= 50 && v.y < 50).map((v) => v.id),
    });
  });

  const sum = (k: "closed" | "stillBelow" | "slipped") => topics.reduce((n, t) => n + t[k].length, 0);
  return {
    topics: topics.sort((x, y) => y.stillBelow.length - x.stillBelow.length || x.change - y.change),
    matchedStudents: pairs.length,
    unmatchedTopics: {
      onlyFirst: first.topics.filter((t) => !bTopicIndex.has(keyOf(t.name))).map((t) => t.name),
      onlySecond: second.topics.filter((t) => !aTopicKeys.has(keyOf(t.name))).map((t) => t.name),
    },
    unmatchedStudents: {
      onlyFirst: a.students.filter((s) => !bStudents.has(keyOf(s.id))).length,
      onlySecond: b.students.filter((s) => !aStudentKeys.has(keyOf(s.id))).length,
    },
    totals: { closed: sum("closed"), stillBelow: sum("stillBelow"), slipped: sum("slipped") },
  };
}

export function comparisonToCsv(c: ClassComparison): string {
  const label = { improved: "Improved", declined: "Declined", no_clear_change: "No clear change" };
  const header = ["Topic", "Before %", "After %", "Change", "Verdict", "Gaps closed", "Still below 50%", "Slipped below 50%"];
  const lines = c.topics.map((t) =>
    [t.name, t.before, t.after, t.change, label[t.verdict], t.closed.join("; "), t.stillBelow.join("; "), t.slipped.join("; ")]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

/** Fictional follow-up for the sample class: reteach on the two weakest topics helped most. */
export function sampleFollowUpCsv(): string {
  const rows = parseTable(sampleCsv());
  const lift: Record<string, number> = { "Chemical bonding": 4, Equilibrium: 4, Thermodynamics: 1, Redox: -1 };
  const header = rows[0]!;
  const max = rows[1]!;
  const out = [header.join(","), max.join(",")];
  rows.slice(2).forEach((r, idx) => {
    const cells = r.slice(1).map((v, i) => {
      if (v === "AB") return idx % 2 === 0 ? String(Math.round(Number(max[i + 1]) * 0.5)) : v;
      const topic = header[i + 1]!;
      const m = Number(max[i + 1]);
      const bump = (lift[topic] ?? 0) + ((idx * 7 + i) % 3) - 1;
      return String(Math.min(m, Math.max(0, Number(v) + bump)));
    });
    out.push([r[0], ...cells].join(","));
  });
  return out.join("\n");
}
