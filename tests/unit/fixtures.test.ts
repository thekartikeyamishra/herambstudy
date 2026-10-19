/**
 * Runs every file in tests/fixtures through the real parser and checks it against the
 * expectation recorded in tests/fixtures/manifest.json. If behaviour changes, the test
 * kit and this test disagree — so the downloadable test files never go stale.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyseClass, buildDataset, compareClasses, groupsToCsv, parseTable, type Dataset } from "@/lib/tools/classAnalysis";
import { buildReports, decodeReport, encodeReport, linksAsCsv } from "@/lib/tools/studentReport";
import { trackClass } from "@/lib/tools/tracker";

type Expect = {
  ok: boolean;
  students?: number;
  topics?: number;
  assumedPercent?: boolean;
  warning?: string;
  issue?: string;
  noDataTopic?: string;
  linksOk?: number;
  csvEscaped?: boolean;
  compareWith?: string;
  matched?: number;
  onlyFirstTopics?: string[];
  onlySecondTopics?: string[];
  closed?: number;
  slipped?: number;
  trackerSet?: string[];
  persistent?: Array<[string, string, number]>;
};
type Entry = { file: string; title: string; expect: Expect };

const dir = join(process.cwd(), "tests/fixtures");
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as Entry[];
const load = (file: string) => buildDataset(parseTable(readFileSync(join(dir, file), "utf8")));
const data = (file: string): Dataset => {
  const r = load(file);
  if (!r.dataset) throw new Error(`${file}: ${r.issues.map((i) => i.message).join("; ")}`);
  return r.dataset;
};

describe("test-kit fixtures behave as documented", () => {
  it("has a manifest entry for every fixture", () => {
    expect(manifest.length).toBeGreaterThanOrEqual(30);
  });

  for (const f of manifest) {
    it(`${f.file} — ${f.title}`, () => {
      const r = load(f.file);
      const e = f.expect;
      if (!e.ok) {
        expect(r.dataset).toBeNull();
        expect(r.issues.map((i) => i.message).join(" | ")).toContain(e.issue!);
        return;
      }
      expect(r.issues).toEqual([]);
      const d = r.dataset!;
      if (e.students !== undefined) expect(d.students).toHaveLength(e.students);
      if (e.topics !== undefined) expect(d.topics).toHaveLength(e.topics);
      if (e.assumedPercent !== undefined) expect(d.assumedPercent).toBe(e.assumedPercent);
      if (e.warning) expect(r.warnings.join(" ")).toContain(e.warning);
      const a = analyseClass(d);
      if (e.noDataTopic) {
        expect(a.topics.find((t) => t.name === e.noDataTopic)?.action).toBe("no_data");
        expect(a.plan[a.plan.length - 1]?.name).toBe(e.noDataTopic);
      }
      if (e.linksOk !== undefined) {
        const reports = buildReports(d, a, { institute: "Test Institute", test: "Unit 1", date: "2026-10-01" });
        // A link only counts if it opens exactly as the report page will open it.
        expect(reports.filter((x) => decodeReport(encodeReport(x)) !== null)).toHaveLength(e.linksOk);
      }
      if (e.csvEscaped) {
        const groups = groupsToCsv(a);
        const links = linksAsCsv("https://heramb.study", buildReports(d, a, { institute: "T", test: "U", date: "2026-10-01" }));
        for (const csv of [groups, links]) {
          for (const line of csv.split("\n").slice(1)) expect(line).not.toMatch(/(^|,)"?[=+@]/);
        }
      }
      if (e.compareWith) {
        const c = compareClasses(data(e.compareWith), d, 5);
        expect(c.matchedStudents).toBe(e.matched);
        expect(c.unmatchedTopics.onlyFirst).toEqual(e.onlyFirstTopics);
        expect(c.unmatchedTopics.onlySecond).toEqual(e.onlySecondTopics);
        expect(c.totals.closed).toBe(e.closed);
        if (e.slipped !== undefined) expect(c.totals.slipped).toBe(e.slipped);
      }
      if (e.trackerSet) {
        const tests = e.trackerSet.map((file, i) => ({ id: `t${i}`, name: `Test ${i + 1}`, date: `2026-0${7 + i}-01`, dataset: data(file) }));
        const track = trackClass(tests);
        for (const [student, topic, n] of e.persistent ?? []) {
          expect(track.persistent).toContainEqual({ student, topic, tests: n });
        }
      }
    });
  }
});

describe("tracker backup fixtures", () => {
  const list = JSON.parse(readFileSync(join(dir, "backups.json"), "utf8")) as Array<{ file: string; ok: boolean; title: string }>;
  for (const b of list) {
    it(`${b.file} — ${b.title}`, async () => {
      const { parseBackup } = await import("@/lib/client/workspace");
      expect(parseBackup(readFileSync(join(dir, b.file), "utf8")).ok).toBe(b.ok);
    });
  }
});

describe("student report link fixtures", () => {
  const list = JSON.parse(readFileSync(join(dir, "report-links.json"), "utf8")) as Array<{ case: string; fragment: string; valid: boolean }>;
  for (const l of list) {
    it(`${l.valid ? "opens" : "rejects"}: ${l.case}`, async () => {
      const { decodeReport } = await import("@/lib/tools/studentReport");
      expect(decodeReport(l.fragment) !== null).toBe(l.valid);
    });
  }
});
