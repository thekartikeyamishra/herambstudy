import { describe, expect, it } from "vitest";
import {
  analyseClass,
  compareClasses,
  comparisonToCsv,
  sampleFollowUpCsv,
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

describe("compareClasses (follow-up check)", () => {
  const ds = (csv: string) => buildDataset(parseTable(csv)).dataset!;
  const first = ds(["Roll,Bonding,Redox,Old topic", "MAX,10,10,10", "R1,3,9,5", "R2,4,8,5", "R3,8,2,5", "R4,9,9,5"].join("\n"));
  const second = ds(["roll,bonding,Redox,New topic", "MAX,10,10,10", "r1,6,9,5", "R2,4,9,5", "R3,8,6,5", "R5,9,9,5"].join("\n"));
  const c = compareClasses(first, second, 5);

  it("matches topics and students case-insensitively and reports what didn't match", () => {
    expect(c.matchedStudents).toBe(3);
    expect(c.topics.map((t) => t.name).sort()).toEqual(["Bonding", "Redox"]);
    expect(c.unmatchedTopics).toEqual({ onlyFirst: ["Old topic"], onlySecond: ["New topic"] });
    expect(c.unmatchedStudents).toEqual({ onlyFirst: 1, onlySecond: 1 });
  });

  it("counts gaps closed, still open and slipped per topic", () => {
    const bonding = c.topics.find((t) => t.name === "Bonding")!;
    expect(bonding.closed).toEqual(["R1"]);
    expect(bonding.stillBelow).toEqual(["R2"]);
    const redox = c.topics.find((t) => t.name === "Redox")!;
    expect(redox.closed).toEqual(["R3"]);
    expect(c.totals).toEqual({ closed: 2, stillBelow: 1, slipped: 0 });
  });

  it("applies the margin to class-average change", () => {
    const bonding = c.topics.find((t) => t.name === "Bonding")!; // 50 → 60 over matched R1–R3
    expect(bonding.before).toBe(50);
    expect(bonding.after).toBe(60);
    expect(bonding.verdict).toBe("improved");
    expect(compareClasses(first, second, 20).topics.find((t) => t.name === "Bonding")!.verdict).toBe("no_clear_change");
  });

  it("exports a formula-safe CSV and the fictional follow-up parses and shows progress", () => {
    expect(comparisonToCsv(c).split("\n")[0]).toContain("Gaps closed");
    const followUp = buildDataset(parseTable(sampleFollowUpCsv()));
    expect(followUp.issues).toEqual([]);
    const sample = compareClasses(ds(sampleCsv()), followUp.dataset!, 5);
    expect(sample.matchedStudents).toBe(24);
    expect(sample.totals.closed).toBeGreaterThan(0);
    expect(sample.topics.find((t) => t.name === "Equilibrium")!.verdict).toBe("improved");
  });
});

describe("regressions found in v0.6 edge-case review", () => {
  const issuesOf = (csv: string) => buildDataset(parseTable(csv)).issues.map((i) => i.message).join(" | ");

  it("accepts only decimal numbers — never hex, exponents or numbers with spaces inside", () => {
    for (const cell of ["0x10", "1e3", "Infinity", "1 5", "1 000", "."]) {
      expect(issuesOf(`Roll,A\nMAX,2000\nR1,${cell}`), cell).toMatch(/isn't a number/);
    }
    const ok = buildDataset(parseTable('Roll,A,B,C,D\nMAX,20,20,20,20\nR1,+5,"7,5",15 / 20,70 %')).dataset!;
    expect(ok.students[0]!.scores).toEqual([5, 7.5, 15, 14]);
  });

  it("recognises common labels for the maximum-marks row", () => {
    for (const label of ["MAX", "Max marks", "Maximum Marks", "Full marks", "Full Marks:", "Out of", "Out of:", "Total marks", "Marks out of"]) {
      const d = buildDataset(parseTable(`Roll,A\n${label},20\nR1,15`)).dataset!;
      expect(d.assumedPercent, label).toBe(false);
      expect(d.students.map((s) => s.id), label).toEqual(["R1"]);
    }
  });

  it("warns when a MAX row is not directly under the header", () => {
    const r = buildDataset(parseTable("Roll,A\nR1,15\nMAX,20"));
    expect(r.dataset?.assumedPercent).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/looks like maximum marks/);
  });

  it("explains percentages above 100% without MAX-row advice", () => {
    const msg = issuesOf("Roll,A\nMAX,20\nR1,120%");
    expect(msg).toContain("more than 100%");
    expect(msg).not.toMatch(/MAX row|read as the maximum/);
  });

  it("warns about rows without roll numbers", () => {
    expect(buildDataset(parseTable("Roll,A\n,50\nR2,60")).warnings.join(" ")).toMatch(/no roll number/);
  });
});
