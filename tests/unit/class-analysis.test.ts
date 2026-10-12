import { describe, expect, it } from "vitest";
import {
  analyseClass,
  buildDataset,
  groupsToCsv,
  parseTable,
  sampleCsv,
  templateCsv,
} from "@/lib/tools/classAnalysis";

describe("parseTable", () => {
  it("detects tabs (pasted from spreadsheets), commas and semicolons", () => {
    expect(parseTable("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseTable("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseTable("a;b;c\n1,5;2;3")).toEqual([["a", "b", "c"], ["1,5", "2", "3"]]);
  });

  it("handles quoted cells, escaped quotes, BOM and blank lines", () => {
    expect(parseTable('﻿Roll,"Topic, A","Say ""hi"""\n\nR1,4,5')).toEqual([
      ["Roll", "Topic, A", 'Say "hi"'],
      ["R1", "4", "5"],
    ]);
  });
});

describe("buildDataset", () => {
  it("reads a MAX row and treats blanks / AB as absent", () => {
    const { dataset, issues } = buildDataset(parseTable("Roll,Bonding,Redox\nMAX,20,8\nR1,10,AB\nR2,,8"));
    expect(issues).toEqual([]);
    expect(dataset?.assumedPercent).toBe(false);
    expect(dataset?.topics).toEqual([{ name: "Bonding", max: 20 }, { name: "Redox", max: 8 }]);
    expect(dataset?.students[0]?.scores).toEqual([10, null]);
    expect(dataset?.students[1]?.scores).toEqual([null, 8]);
  });

  it("assumes percentages without a MAX row and explains values above 100", () => {
    const { dataset, issues } = buildDataset(parseTable("Roll,A\nR1,140"));
    expect(dataset).toBeNull();
    expect(issues[0]?.message).toMatch(/add a MAX row/i);
  });

  it("reports precise row/column issues", () => {
    const { issues } = buildDataset(parseTable("Roll,A,A\nMAX,10,10\nR1,abc,11\nR1,1,1"));
    const text = issues.map((i) => `${i.row}:${i.column ?? "-"}`);
    expect(text).toEqual(expect.arrayContaining(["1:3", "3:2", "3:3", "4:1"]));
  });

  it("rejects a header without topics", () => {
    expect(buildDataset(parseTable("Roll\nR1")).issues[0]?.message).toMatch(/topic/i);
  });

  it("accepts the downloadable template and the fictional sample", () => {
    expect(buildDataset(parseTable(templateCsv())).issues).toEqual([]);
    const sample = buildDataset(parseTable(sampleCsv()));
    expect(sample.issues).toEqual([]);
    expect(sample.dataset?.students).toHaveLength(24);
    expect(sampleCsv()).toBe(sampleCsv()); // deterministic
  });
});

describe("analyseClass", () => {
  const data = buildDataset(
    parseTable(
      ["Roll,Weak,Mixed,Strong", "MAX,10,10,10", "R1,2,9,9", "R2,3,4,10", "R3,8,8,8", "R4,AB,9,9", "R5,4,9,10", "R6,9,9,9"].join("\n"),
    ),
  ).dataset!;
  const a = analyseClass(data);

  it("flags whole-class reteach at ≥ 1/3 below 50% and small groups below that", () => {
    const by = Object.fromEntries(a.topics.map((t) => [t.name, t]));
    expect(by.Weak?.attempted).toBe(5); // R4 absent
    expect(by.Weak?.belowHalf).toEqual(["R1", "R2", "R5"]);
    expect(by.Weak?.action).toBe("whole_class");
    expect(by.Mixed?.action).toBe("small_group");
    expect(by.Mixed?.belowHalf).toEqual(["R2"]);
    expect(by.Strong?.action).toBe("maintain");
  });

  it("orders the plan by urgency", () => {
    expect(a.plan.map((t) => t.name)).toEqual(["Weak", "Mixed", "Strong"]);
  });

  it("computes per-student gaps and flags students needing attention", () => {
    const r2 = a.students.find((s) => s.id === "R2")!;
    expect(r2.gaps.map((g) => g.topic)).toEqual(["Weak", "Mixed"]);
    expect(r2.needsAttention).toBe(true);
    expect(a.students.find((s) => s.id === "R6")!.needsAttention).toBe(false);
  });

  it("exports reteach groups as safe CSV", () => {
    const csv = groupsToCsv(a);
    expect(csv.split("\n")[1]).toContain("Reteach to whole class");
    expect(csv).toContain("R1; R2; R5");
  });
});
