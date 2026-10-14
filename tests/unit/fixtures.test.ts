// @vitest-environment jsdom
/**
 * Every file in test-fixtures/ must behave exactly as manifest.json (and README.md) says.
 * If a fixture or a rule changes, this test tells you which expectation broke.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBackup } from "@/lib/client/workspace";
import { analyseClass, buildDataset, checkTextSize, compareClasses, groupsToCsv, parseTable } from "@/lib/tools/classAnalysis";
import { decodeReport } from "@/lib/tools/studentReport";
import { trackClass } from "@/lib/tools/tracker";
import { contactMessageSchema, inviteRequestSchema, pilotApplicationSchema } from "@/lib/validation/schemas";

const ROOT = join(process.cwd(), "test-fixtures");
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");
type ClassCase = { file: string; expect: "ok" | "error" | "too_large" | "upload_rejected"; students?: number; topics?: number; issue?: string; firstScores?: number[]; plan?: string[] };
const manifest = JSON.parse(read("manifest.json")) as {
  class: ClassCase[];
  followUp: Array<{ first: string; second: string; matchedStudents?: number; onlyFirstTopics?: string[]; onlySecondTopics?: string[]; unmatchedStudents?: { onlyFirst: number; onlySecond: number }; noMatch?: boolean }>;
  tracker: Array<{ tests: string[]; persistent: Array<{ student: string; topic: string; tests: number }> }>;
  backups: Array<{ file: string; expect: "ok" | "error"; message?: string }>;
  links: Array<{ file: string; count?: number; edgeCases?: boolean }>;
  forms: Array<{ file: string; schema: "invite" | "pilot" | "contact" }>;
};
const dataset = (f: string) => buildDataset(parseTable(read(f))).dataset!;

describe("class analyser fixtures", () => {
  for (const c of manifest.class) {
    it(`${c.file} → ${c.expect}`, () => {
      if (c.expect === "upload_rejected") {
        expect(c.file).not.toMatch(/\.(csv|tsv|txt)$/i); // the upload control accepts only these extensions
        return;
      }
      const text = read(c.file);
      if (c.expect === "too_large") {
        expect(checkTextSize(text)).toMatch(/limit is 1 MB/);
        return;
      }
      expect(checkTextSize(text)).toBeNull();
      const r = buildDataset(parseTable(text));
      if (c.expect === "error") {
        expect(r.dataset).toBeNull();
        expect(r.issues.map((i) => i.message).join(" | ")).toContain(c.issue!);
        return;
      }
      expect(r.issues).toEqual([]);
      expect(r.dataset!.students).toHaveLength(c.students!);
      expect(r.dataset!.topics).toHaveLength(c.topics!);
      if (c.firstScores) expect(r.dataset!.students[0]!.scores).toEqual(c.firstScores);
      const analysis = analyseClass(r.dataset!);
      if (c.plan) expect(analysis.plan.map((t) => t.action)).toEqual(c.plan);
      // Exports must never start a cell with a formula character.
      for (const line of groupsToCsv(analysis).split("\n").slice(1)) {
        for (const cell of line.split(",")) expect(cell.replace(/^"/, "")).not.toMatch(/^[=+@]/);
      }
    });
  }
});

describe("follow-up fixtures", () => {
  for (const f of manifest.followUp) {
    it(`${f.first} vs ${f.second}`, () => {
      const c = compareClasses(dataset(f.first), dataset(f.second));
      if (f.noMatch) {
        expect(c.topics).toEqual([]);
        return;
      }
      expect(c.matchedStudents).toBe(f.matchedStudents);
      expect(c.unmatchedTopics).toEqual({ onlyFirst: f.onlyFirstTopics, onlySecond: f.onlySecondTopics });
      expect(c.unmatchedStudents).toEqual(f.unmatchedStudents);
      expect(c.totals.closed).toBeGreaterThan(0);
    });
  }
});

describe("tracker fixtures", () => {
  for (const t of manifest.tracker) {
    it("three units produce the documented repeating gaps", () => {
      const dates = ["2026-07-01", "2026-08-01", "2026-09-01"];
      const track = trackClass(t.tests.map((file, i) => ({ id: `t${i}`, name: file, date: dates[i]!, dataset: dataset(file) })));
      expect(track.persistent).toEqual(expect.arrayContaining(t.persistent));
      expect(track.persistent).toHaveLength(t.persistent.length);
    });
  }
  for (const b of manifest.backups) {
    it(`${b.file} → ${b.expect}`, () => {
      const r = parseBackup(read(b.file));
      expect(r.ok).toBe(b.expect === "ok");
      if (!r.ok && b.message) expect(r.message).toContain(b.message);
    });
  }
});

describe("student link fixtures", () => {
  for (const l of manifest.links) {
    it(l.file, () => {
      if (l.count) {
        const lines = read(l.file).trim().split("\n");
        expect(lines).toHaveLength(l.count);
        for (const line of lines) expect(decodeReport(line.split("#")[1] ?? "")).not.toBeNull();
        return;
      }
      const [, ...cases] = parseTable(read(l.file));
      expect(cases.length).toBeGreaterThan(10);
      for (const [name, url, expected] of cases) {
        const r = decodeReport(url!.split("#")[1] ?? "");
        expect(r === null ? "invalid" : "ok", name).toBe(expected);
      }
    });
  }
});

describe("form fixtures (same validation as the server)", () => {
  const toPayload = (schema: string, row: Record<string, string>) => {
    const bool = (v: string | undefined) => v === "true";
    if (schema === "invite") {
      return { email: row.email, name: row.name, role: row.role, country: row.country, useCase: row.useCase, privacyAcknowledged: bool(row.privacyAcknowledged), marketingConsent: bool(row.marketingConsent) };
    }
    if (schema === "pilot") {
      return { ...row, exams: row.exams ? row.exams.split(";") : [], privacyAcknowledged: bool(row.privacyAcknowledged) };
    }
    return { ...row, privacyAcknowledged: bool(row.privacyAcknowledged) };
  };
  const schemas = { invite: inviteRequestSchema, pilot: pilotApplicationSchema, contact: contactMessageSchema };
  for (const f of manifest.forms) {
    it(f.file, () => {
      const [header, ...rows] = parseTable(read(f.file));
      for (const cells of rows) {
        const row = Object.fromEntries(header!.map((h, i) => [h, cells[i] ?? ""]));
        const result = schemas[f.schema].safeParse(toPayload(f.schema, row));
        if (row.expected === "valid") expect(result.success, row.case).toBe(true);
        else {
          expect(result.success, row.case).toBe(false);
          const field = row.expected!.split(":")[1]!;
          if (!result.success) expect(result.error.issues.map((i) => String(i.path[0])), row.case).toContain(field);
        }
      }
    });
  }
});
