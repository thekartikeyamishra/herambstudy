/**
 * Heramb tools for AI assistants (ChatGPT apps, Grok connectors, Claude, custom GPT actions).
 *
 * The teacher pastes marks into the chat; the assistant sends them here; we compute the same
 * plan the website shows and return it. Pure and stateless: nothing is stored or logged
 * (the route logs only sizes and outcomes).
 */
import { absoluteUrl } from "@/config/site";
import { analyseClass, buildDataset, compareClasses, parseTable, type ClassAnalysis } from "@/lib/tools/classAnalysis";
import { normaliseExport } from "@/lib/tools/importMapping";
import { applyPaperMap, parsePaperMap, type PaperScheme } from "@/lib/tools/paperMap";
import { rowsToTsv } from "@/lib/tools/xlsx";

export const MAX_TABLE_CHARS = 200_000;

type JsonSchema = Record<string, unknown>;
export type ToolDef = { name: string; title: string; description: string; inputSchema: JsonSchema; annotations: Record<string, boolean | string> };
export type ToolResult = { ok: true; text: string; structured: Record<string, unknown> } | { ok: false; text: string };

const table = (desc: string): JsonSchema => ({ type: "string", minLength: 1, maxLength: MAX_TABLE_CHARS, description: desc });
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

export const TOOLS: ToolDef[] = [
  {
    name: "analyse_class_test",
    title: "Analyse a class test",
    description:
      "Turns one class test's marks into a chapter-wise teaching plan: which chapters to reteach to the whole class, which need a small-group recap (with the students), the class average per chapter, and students who need attention. Use when a teacher shares marks for a batch. Input is a table (CSV, tab-separated or pasted from Excel/Google Sheets): first column roll number (or name), then one column per chapter/topic; an optional row whose first cell is MAX holds each chapter's maximum marks (without it, values are read as percentages). AB or blank = absent. Exported result sheets with titles, names, phone numbers, totals or ranks are cleaned automatically.",
    inputSchema: {
      type: "object",
      properties: { table: table("The marks table, header row first.") },
      required: ["table"],
      additionalProperties: false,
    },
    annotations: { ...READ_ONLY, title: "Analyse a class test" },
  },
  {
    name: "convert_question_marks_to_chapters",
    title: "Convert question-wise or OMR marks to chapters",
    description:
      "Adds up question-wise marks, right/wrong answers, or OMR options checked against an answer key into chapter-wise marks, then analyses the class. Use when a teacher has marks per question (Q1, Q2…) instead of per chapter. The paper map says which questions belong to which chapter, one chapter per line, e.g. '1-10: Kinematics' and '11-20, 25: Laws of motion'.",
    inputSchema: {
      type: "object",
      properties: {
        table: table("Question-wise table: first column roll number, then Q1, Q2… (or 1, 2…)."),
        paper_map: { type: "string", minLength: 1, maxLength: 5000, description: "One chapter per line: '1-10: Kinematics'." },
        cells: {
          type: "string",
          enum: ["marks", "right_wrong", "options_with_key"],
          description: "marks = marks per question; right_wrong = C/W/blank or 1/0/blank; options_with_key = A/B/C/D compared with answer_key (or a KEY row in the table).",
        },
        marks_correct: { type: "number", minimum: 0, maximum: 100, description: "Marks for a correct answer (right_wrong / options_with_key). Default 4." },
        minus_wrong: { type: "number", minimum: 0, maximum: 100, description: "Marks deducted for a wrong answer. Default 1; 0 for no negative marking." },
        max_per_question: { type: "number", minimum: 0, maximum: 100, description: "Maximum marks per question (cells = marks, when the table has no MAX row). Default 4." },
        answer_key: { type: "string", maxLength: 2000, description: "Answer key in question order, e.g. 'ABCDA BCDAB'. * = bonus question." },
      },
      required: ["table", "paper_map", "cells"],
      additionalProperties: false,
    },
    annotations: { ...READ_ONLY, title: "Question-wise marks to chapters" },
  },
  {
    name: "compare_follow_up_test",
    title: "Did reteaching work? Compare two tests",
    description:
      "Compares a first test with a follow-up test of the same class, chapter by chapter: which chapters improved, declined or showed no clear change, and which students closed their gap, are still below 50%, or slipped. Both tables use the same format as analyse_class_test, with the same chapter names and roll numbers.",
    inputSchema: {
      type: "object",
      properties: {
        first_table: table("The earlier test's marks table."),
        follow_up_table: table("The later (follow-up) test's marks table."),
      },
      required: ["first_table", "follow_up_table"],
      additionalProperties: false,
    },
    annotations: { ...READ_ONLY, title: "Compare follow-up test" },
  },
];

const ACTION = { whole_class: "Reteach to the whole class", small_group: "Small-group recap", maintain: "Maintain", no_data: "No data" } as const;

function readTable(text: string): { rows: string[][]; notes: string[] } | { error: string } {
  if (typeof text !== "string" || !text.trim()) return { error: "The table is empty. Paste the marks with a header row first." };
  if (text.length > MAX_TABLE_CHARS) return { error: "That table is too large (over 200,000 characters). Split the class." };
  const rows = parseTable(text);
  const tidy = normaliseExport(rows);
  return tidy.changed ? { rows: parseTable(rowsToTsv(tidy.rows)), notes: tidy.notes } : { rows, notes: [] };
}

function datasetOrError(text: string) {
  const t = readTable(text);
  if ("error" in t) return { error: t.error };
  const built = buildDataset(t.rows);
  if (!built.dataset) {
    const issues = built.issues.slice(0, 6).map((i) => `Row ${i.row}${i.column ? `, column ${i.column}` : ""}: ${i.message}`);
    return { error: `The table needs fixing before it can be analysed:\n- ${issues.join("\n- ")}` };
  }
  return { dataset: built.dataset, notes: [...t.notes, ...built.warnings] };
}

function planText(a: ClassAnalysis, notes: string[], assumedPercent: boolean): string {
  const lines: string[] = [];
  lines.push(`**Class overview:** ${a.students.length} students · ${a.topics.length} chapters · class average ${a.classAverage === null ? "—" : `${a.classAverage}%`}.`);
  if (assumedPercent) lines.push("No MAX row was found, so the values were read as percentages.");
  for (const n of notes) lines.push(`Note: ${n}`);
  lines.push("", "**Teaching plan (most urgent first):**");
  for (const t of a.plan) {
    const group = t.belowHalf.length && t.action !== "whole_class" ? ` Recap group: ${t.belowHalf.slice(0, 25).join(", ")}${t.belowHalf.length > 25 ? "…" : ""}.` : "";
    lines.push(`- **${t.name}**: ${ACTION[t.action]}. Average ${t.average}%, ${t.belowHalf.length} of ${t.attempted} below 50%.${group}`);
  }
  const attention = a.students.filter((s) => s.needsAttention);
  if (attention.length) lines.push("", `**Students to talk to one-to-one** (below 50% in at least half their chapters): ${attention.map((s) => s.id).slice(0, 40).join(", ")}.`);
  lines.push(
    "",
    `“Whole class” means at least a third of the students who attempted the chapter scored below 50%. One test is a small sample, so confirm with the answer sheets. Personal report links for every student, printable QR slips and the follow-up check: ${absoluteUrl("/resources/class-test-analyser")}`,
  );
  return lines.join("\n");
}

function structured(a: ClassAnalysis) {
  return {
    students: a.students.length,
    classAverage: a.classAverage,
    plan: a.plan.map((t) => ({ chapter: t.name, action: t.action, average: t.average, attempted: t.attempted, belowHalf: t.belowHalf })),
    needsAttention: a.students.filter((s) => s.needsAttention).map((s) => s.id),
    fullToolUrl: absoluteUrl("/resources/class-test-analyser"),
  };
}

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100 ? v : d);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function runTool(name: string, args: Record<string, unknown>): ToolResult {
  if (name === "analyse_class_test") {
    const d = datasetOrError(str(args.table));
    if ("error" in d) return { ok: false, text: d.error! };
    const a = analyseClass(d.dataset);
    return { ok: true, text: planText(a, d.notes, d.dataset.assumedPercent), structured: structured(a) };
  }

  if (name === "convert_question_marks_to_chapters") {
    const map = parsePaperMap(str(args.paper_map));
    if (map.errors.length) return { ok: false, text: `The paper map needs fixing:\n- ${map.errors.slice(0, 6).join("\n- ")}` };
    const t = readTable(str(args.table));
    if ("error" in t) return { ok: false, text: t.error };
    const correct = num(args.marks_correct, 4) || 4;
    const wrong = num(args.minus_wrong, 1);
    const cells = str(args.cells);
    const scheme: PaperScheme =
      cells === "right_wrong"
        ? { kind: "answers", correct, wrong }
        : cells === "options_with_key"
          ? { kind: "responses", correct, wrong, key: str(args.answer_key) || undefined }
          : { kind: "marks", maxPerQuestion: num(args.max_per_question, 4) || 4 };
    const converted = applyPaperMap(t.rows, map.lines, scheme);
    if (!converted.rows) return { ok: false, text: converted.errors.join("\n") };
    const built = buildDataset(converted.rows);
    if (!built.dataset) return { ok: false, text: built.issues.slice(0, 6).map((i) => `Row ${i.row}: ${i.message}`).join("\n") };
    const a = analyseClass(built.dataset);
    return {
      ok: true,
      text: `${planText(a, [...t.notes, ...converted.notes], false)}\n\n**Chapter-wise marks (for your records):**\n\`\`\`\n${rowsToTsv(converted.rows).slice(0, 20_000)}\n\`\`\``,
      structured: { ...structured(a), chapterTable: rowsToTsv(converted.rows) },
    };
  }

  if (name === "compare_follow_up_test") {
    const first = datasetOrError(str(args.first_table));
    if ("error" in first) return { ok: false, text: `First test: ${first.error}` };
    const second = datasetOrError(str(args.follow_up_table));
    if ("error" in second) return { ok: false, text: `Follow-up test: ${second.error}` };
    const c = compareClasses(first.dataset, second.dataset);
    if (!c.topics.length) return { ok: false, text: "No chapter names or students match between the two tests. Use the same chapter names and roll numbers in both." };
    const verdict = { improved: "Improved", declined: "Declined", no_clear_change: "No clear change" } as const;
    const lines = [
      `**Follow-up check:** ${c.matchedStudents} students in both tests · ${c.totals.closed} gaps closed · ${c.totals.stillBelow} still below 50% · ${c.totals.slipped} slipped.`,
      "",
      ...c.topics.map((t) => `- **${t.name}**: ${verdict[t.verdict]} (${t.before}% → ${t.after}%, ${t.change >= 0 ? "+" : ""}${t.change}).${t.stillBelow.length ? ` Still below 50%: ${t.stillBelow.slice(0, 20).join(", ")}.` : ""}`),
    ];
    if (c.unmatchedTopics.onlyFirst.length || c.unmatchedTopics.onlySecond.length) lines.push("", `Chapters only in one test were left out: ${[...c.unmatchedTopics.onlyFirst, ...c.unmatchedTopics.onlySecond].join(", ")}.`);
    return { ok: true, text: lines.join("\n"), structured: { ...c } };
  }

  return { ok: false, text: `Unknown tool: ${name}` };
}
