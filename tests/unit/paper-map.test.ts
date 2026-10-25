import { describe, expect, it } from "vitest";
import { analyseClass, buildDataset, parseTable } from "@/lib/tools/classAnalysis";
import { applyPaperMap, parseAnswerKey, parsePaperMap, questionNumber } from "@/lib/tools/paperMap";

describe("parsePaperMap", () => {
  it("reads ranges, lists and different separators", () => {
    const { lines, errors } = parsePaperMap("1-3: Kinematics\nQ4, Q5 = Laws of motion\n6 to 7 Work energy\n8 9 Work energy");
    expect(errors).toEqual([]);
    expect(lines).toEqual([
      { chapter: "Kinematics", questions: [1, 2, 3] },
      { chapter: "Laws of motion", questions: [4, 5] },
      { chapter: "Work energy", questions: [6, 7, 8, 9] },
    ]);
  });
  it("explains bad lines and double-mapped questions", () => {
    const { errors } = parsePaperMap("Kinematics\n1-3: A\n3-4: B\n9-2: C");
    expect(errors.join(" ")).toMatch(/Line 1/);
    expect(errors.join(" ")).toMatch(/Question 3 is in both/);
    expect(errors.join(" ")).toMatch(/valid question range/);
  });
});

describe("questionNumber", () => {
  it.each([["Q1", 1], ["q.12", 12], ["Question 7", 7], ["15", 15], ["Q 3", 3], ["Name", null], ["Total", null]])("%s → %s", (h, n) => {
    expect(questionNumber(h)).toBe(n);
  });
});

const map = parsePaperMap("1-2: Kinematics\n3-4: Optics").lines;

describe("applyPaperMap", () => {
  it("answers scheme: +4 / −1, blank unattempted, all-blank absent", () => {
    const rows = parseTable("Roll,Q1,Q2,Q3,Q4\nR01,C,C,W,\nR02,W,,C,C\nR03,,,,");
    const r = applyPaperMap(rows, map, { kind: "answers", correct: 4, wrong: 1 });
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([
      ["Roll", "Kinematics", "Optics"],
      ["MAX", "8", "8"],
      ["R01", "8", "-1"],
      ["R02", "-1", "8"],
      ["R03", "AB", "AB"],
    ]);
    const ds = buildDataset(r.rows!).dataset!;
    expect(analyseClass(ds).topics.map((t) => t.name)).toEqual(["Kinematics", "Optics"]);
  });
  it("1/0 answers: 0 counts as wrong", () => {
    const r = applyPaperMap(parseTable("Roll,1,2,3,4\nR01,1,0,1,1"), map, { kind: "answers", correct: 4, wrong: 1 });
    expect(r.rows?.[2]).toEqual(["R01", "3", "8"]);
  });
  it("marks scheme uses the MAX row when present, otherwise the default", () => {
    const withMax = applyPaperMap(parseTable("Roll,Q1,Q2,Q3,Q4\nMAX,2,3,5,5\nR01,2,1,5,AB"), map, { kind: "marks", maxPerQuestion: 4 });
    expect(withMax.rows).toEqual([["Roll", "Kinematics", "Optics"], ["MAX", "5", "10"], ["R01", "3", "5"]]);
    const noMax = applyPaperMap(parseTable("Roll,Q1,Q2,Q3,Q4\nR01,2,1,4,4"), map, { kind: "marks", maxPerQuestion: 4 });
    expect(noMax.rows?.[1]).toEqual(["MAX", "8", "8"]);
  });
  it("headers without numbers: columns are read as Q1…Qn", () => {
    const r = applyPaperMap(parseTable("Roll,a,b,c,d\nR01,C,C,C,C"), map, { kind: "answers", correct: 4, wrong: 1 });
    expect(r.rows?.[2]).toEqual(["R01", "8", "8"]);
    expect(r.notes.join(" ")).toMatch(/read as Q1/);
  });
  it("reports unmapped and missing questions, and refuses odd answers", () => {
    const r = applyPaperMap(parseTable("Roll,Q1,Q2,Q3,Q5\nR01,C,C,C,C"), parsePaperMap("1-2: A\n3-4: B").lines, { kind: "answers", correct: 4, wrong: 1 });
    expect(r.notes.join(" ")).toMatch(/ignored: Q4/);
    expect(r.notes.join(" ")).toMatch(/left out: Q5/);
    const bad = applyPaperMap(parseTable("Roll,Q1,Q2\nR01,C,maybe"), map, { kind: "answers", correct: 4, wrong: 1 });
    expect(bad.rows).toBeNull();
    expect(bad.errors[0]).toMatch(/maybe/);
  });
});

describe("OMR responses with an answer key", () => {
  const map = parsePaperMap("1-3: Optics\n4-5: Waves").lines;
  it("parses keys in any common shape", () => {
    expect(parseAnswerKey("ABCDA BCD")).toEqual(["A", "B", "C", "D", "A", "B", "C", "D"]);
    expect(parseAnswerKey("a, b, c, *")).toEqual(["A", "B", "C", "*"]);
  });
  it("marks responses against a typed key with negative marking", () => {
    const rows = [["Roll", "Q1", "Q2", "Q3", "Q4", "Q5"], ["R1", "A", "B", "D", "", "C"], ["R2", "A", "C", "C", "D", "C"]];
    const r = applyPaperMap(rows, map, { kind: "responses", correct: 4, wrong: 1, key: "ABCDC" });
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([["Roll", "Optics", "Waves"], ["MAX", "12", "8"], ["R1", "7", "4"], ["R2", "7", "8"]]);
  });
  it("uses a KEY row from the sheet and skips it as a student", () => {
    const rows = [["Roll", "1", "2", "3", "4", "5"], ["KEY", "A", "B", "C", "D", "*"], ["R1", "A", "B", "C", "A", "B"]];
    const r = applyPaperMap(rows, map, { kind: "responses", correct: 4, wrong: 1 });
    expect(r.rows?.slice(2)).toEqual([["R1", "12", "3"]]);
  });
  it("asks for a key when there is none", () => {
    const r = applyPaperMap([["Roll", "Q1", "Q2"], ["R1", "A", "B"]], map, { kind: "responses", correct: 4, wrong: 1 });
    expect(r.rows).toBeNull();
    expect(r.errors[0]).toMatch(/answer key/);
  });
});
