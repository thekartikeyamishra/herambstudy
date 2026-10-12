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
const MAX_ROW = /^(max|max marks|maximum|out of|total)$/i;

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

function toNumber(raw: string): number | null | "invalid" {
  const v = raw.trim();
  if (ABSENT.has(v.toLowerCase())) return null;
  const n = Number(v.replace(/,/g, "."));
  return Number.isFinite(n) ? n : "invalid";
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
  });

  let body = rows.slice(1);
  let maxes = topicNames.map(() => 100);
  let assumedPercent = true;
  if (body[0] && MAX_ROW.test(body[0][0] ?? "")) {
    assumedPercent = false;
    maxes = topicNames.map((_, i) => {
      const n = toNumber(body[0]![i + 1] ?? "");
      if (typeof n !== "number" || n <= 0) {
        issues.push({ row: 2, column: i + 2, message: "Maximum marks must be a number above 0." });
        return 1;
      }
      return n;
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
    const id = (r[0] ?? "").slice(0, LIMITS.cellChars) || `Student ${idx + 1}`;
    if (ids.has(id.toLowerCase())) issues.push({ row: rowNo, column: 1, message: `"${id}" appears more than once.` });
    ids.add(id.toLowerCase());
    if (r.length - 1 > topicNames.length) issues.push({ row: rowNo, message: "This row has more values than there are topics." });
    const scores = topicNames.map((_, i) => {
      const n = toNumber(r[i + 1] ?? "");
      if (n === "invalid") {
        issues.push({ row: rowNo, column: i + 2, message: `"${r[i + 1]}" isn't a number. Use a number, or leave blank / "AB" if absent.` });
        return null;
      }
      if (n !== null) {
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
