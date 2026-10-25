import { describe, expect, it } from "vitest";
import { analyseClass, buildDataset, parseTable } from "@/lib/tools/classAnalysis";
import { batchViews, summariseClass, summaryId, type StoredSummary } from "@/lib/institute/summary";

const s = (date: string, avg: number, optics: number, batch = "11 JEE A"): StoredSummary => ({
  id: summaryId({ batch, date }), at: `${date}T10:00:00Z`, batch, test: `T ${date}`, date, students: 20, average: avg,
  topics: [{ n: "Optics", avg: optics, att: 20, below: 9 }, { n: "Waves", avg: 80, att: 20, below: 1 }],
});

describe("class summaries", () => {
  it("summarises an analysis with no student-level data", () => {
    const ds = buildDataset(parseTable("Roll\tOptics\tWaves\nMAX\t10\t10\nR01\t3\t9\nR02\t4\t8")).dataset!;
    const sum = summariseClass(analyseClass(ds), { batch: "12 NEET", test: "W1", date: "2026-10-20" });
    expect(sum.students).toBe(2);
    expect(sum.topics[0]).toEqual({ n: "Optics", avg: 35, att: 2, below: 2 });
    expect(JSON.stringify(sum)).not.toMatch(/R01|R02/);
  });
  it("groups by batch with weakest chapters and change since the previous test", () => {
    const views = batchViews([s("2026-10-13", 50, 30), s("2026-10-20", 58, 42), s("2026-10-19", 70, 60, "12 NEET")]);
    expect(views.map((v) => v.batch)).toEqual(["11 JEE A", "12 NEET"]);
    expect(views[0]!.averageChange).toBe(8);
    expect(views[0]!.weakest[0]).toMatchObject({ n: "Optics", avg: 42, change: 12 });
    expect(views[1]!.averageChange).toBeNull();
  });
});

import { chapterKey, computeBenchmark } from "@/lib/institute/summary";

describe("city benchmark", () => {
  it("normalises chapter names across institutes", () => {
    expect(chapterKey("Laws of Motion ")).toBe(chapterKey("laws-of-motion"));
    expect(chapterKey("गति के नियम")).toBe("गति के नियम");
  });
  it("averages OTHER institutes only, needs enough of them, ignores stale data", () => {
    const doc = { A: { avg: 40, date: "2026-10-01" }, B: { avg: 60, date: "2026-10-10" }, C: { avg: 50, date: "2026-10-12" }, D: { avg: 70, date: "2026-10-15" }, OLD: { avg: 10, date: "2025-01-01" }, SELF: { avg: 99, date: "2026-10-20" } };
    const docs = new Map([["optics", doc]]);
    expect(computeBenchmark(docs, "SELF", "2026-10-24", 4)).toEqual({ optics: { avg: 55, institutes: 4 } });
    expect(computeBenchmark(docs, "SELF", "2026-10-24", 5)).toEqual({});
  });
});
