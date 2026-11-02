import { describe, expect, it } from "vitest";
import { parseQuestions, sampleQuestionText, type Question } from "@/lib/tests/question";
import { decodeOnlineTest, encodeOnlineTest, encodeResponse, onlineTestFor, parseResponseCodes, pickQuestions, setKey, setLayout, type Paper } from "@/lib/tests/paper";
import { apportion, autoBlueprint, DIFFICULTY_MIXES, itemAnalysis, MARKING_PRESETS, parseBatches, seatingPlan, suggestedDifficulty } from "@/lib/tests/plan";

const sample = parseQuestions(sampleQuestionText()).questions;
const paper: Paper = { id: "p1", name: "Weekly 1", institute: "Test Classes", durationMin: 20, marking: { correct: 4, wrong: 1 }, questions: sample, sets: ["A", "B"], seed: 99, createdAt: "" };

function bankOf(spec: Array<[string, "easy" | "medium" | "hard", number]>): Question[] {
  let n = 0;
  return spec.flatMap(([chapter, difficulty, count]) =>
    Array.from({ length: count }, () => ({ id: `q${String(n++).padStart(4, "0")}`, text: `Q${n}`, options: ["a", "b", "c", "d"], answer: [0], subject: "", chapter, difficulty, tags: [], createdAt: "" })),
  );
}

describe("apportion", () => {
  it("always sums exactly and follows the weights", () => {
    expect(apportion(10, [0.3, 0.5, 0.2])).toEqual([3, 5, 2]);
    expect(apportion(7, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(7);
    expect(apportion(0, [1, 2])).toEqual([0, 0]);
    expect(apportion(5, [0, 0])).toEqual([0, 0]);
  });
});

describe("autoBlueprint", () => {
  it("spreads the total over chapters and levels by the mix", () => {
    const bank = bankOf([["Optics", "easy", 10], ["Optics", "medium", 10], ["Optics", "hard", 10], ["Waves", "easy", 10], ["Waves", "medium", 10], ["Waves", "hard", 10]]);
    const r = autoBlueprint(bank, ["Optics", "Waves"], 20, DIFFICULTY_MIXES[0]!.share);
    expect(r.shortBy).toBe(0);
    const sum = (ch: string) => r.rows.filter((x) => x.chapter === ch).reduce((s, x) => s + x.count, 0);
    expect(sum("Optics")).toBe(10);
    expect(sum("Waves")).toBe(10);
    expect(r.rows.find((x) => x.chapter === "Optics" && x.difficulty === "medium")!.count).toBe(5);
    // The rows really are pickable from the bank.
    expect(pickQuestions(bank, r.rows, 1).picked).toHaveLength(20);
  });
  it("fills a missing level from the nearest one, then from other chapters", () => {
    const bank = bankOf([["Optics", "easy", 2], ["Optics", "medium", 2], ["Waves", "medium", 20]]);
    const r = autoBlueprint(bank, ["Optics", "Waves"], 10, { easy: 0, medium: 0, hard: 1 });
    expect(r.rows.reduce((s, x) => s + x.count, 0)).toBe(10);
    expect(r.shortBy).toBe(0);
    expect(r.rows.filter((x) => x.chapter === "Optics").reduce((s, x) => s + x.count, 0)).toBe(4);
  });
  it("reports a shortfall instead of inventing questions", () => {
    const bank = bankOf([["Optics", "easy", 3]]);
    const r = autoBlueprint(bank, ["optics", "Unknown"], 10, DIFFICULTY_MIXES[0]!.share);
    expect(r.shortBy).toBe(7);
    expect(r.rows).toEqual([{ chapter: "optics", difficulty: "easy", count: 3 }]);
  });
});

describe("presets", () => {
  it("have sane marks", () => {
    for (const p of MARKING_PRESETS) {
      expect(p.correct).toBeGreaterThan(0);
      expect(p.wrong).toBeGreaterThanOrEqual(0);
      expect(p.wrong).toBeLessThan(p.correct);
    }
  });
});

describe("batches and seating", () => {
  it("parses batch lines and reports bad ones", () => {
    const r = parseBatches("11 JEE A, 42\n11 JEE B\t38\tB\nbad line\n12 NEET, 9999");
    expect(r.batches).toEqual([{ name: "11 JEE A", students: 42, rollPrefix: "R" }, { name: "11 JEE B", students: 38, rollPrefix: "B" }]);
    expect(r.errors).toHaveLength(2);
  });
  it("rotates sets so neighbours differ and counts copies with spares", () => {
    const [a, b] = seatingPlan(["A", "B", "C"], [{ name: "X", students: 10, rollPrefix: "R" }, { name: "Y", students: 3, rollPrefix: "Y" }]);
    expect(a!.seats.slice(0, 4).map((s) => s.set)).toEqual(["A", "B", "C", "A"]);
    expect(a!.seats[0]!.roll).toBe("R01");
    for (let i = 1; i < a!.seats.length; i++) expect(a!.seats[i]!.set).not.toBe(a!.seats[i - 1]!.set);
    expect(a!.copies).toEqual({ A: 5, B: 4, C: 4 }); // 4,3,3 + 5% spare rounded up
    expect(b!.seats[0]!.set).toBe("B"); // next batch starts on the next set
  });
});

describe("batch on online tests and codes", () => {
  it("carries a cleaned batch label from link to response code", async () => {
    const t = onlineTestFor(paper, "B", null, "11 JEE <A>");
    expect(t.b).toBe("11 JEE A");
    const back = await decodeOnlineTest(await encodeOnlineTest(t));
    expect(back!.b).toBe("11 JEE A");
    const codes = [
      encodeResponse({ p: "p1", s: "A", r: "R01", a: "BBBBBBBB", t: 60, b: "11 JEE A" }),
      encodeResponse({ p: "p1", s: "A", r: "R01", a: "CCCCCCCC", t: 60, b: "11 JEE B" }),
    ].join("\n");
    const r = parseResponseCodes(codes, "p1");
    // Same roll number in two batches stays two students.
    expect(r.entries.map((e) => e.batch).sort()).toEqual(["11 JEE A", "11 JEE B"]);
  });
});

describe("item analysis", () => {
  const keyA = setKey(paper, "A");
  const perfectB = setKey(paper, "B");

  it("counts correct answers per master question across sets", () => {
    const entries = [...Array(6)].map((_, i) => (i % 2 ? { set: "B", answers: perfectB } : { set: "A", answers: keyA }));
    const items = itemAnalysis(paper, entries);
    expect(items).toHaveLength(8);
    expect(items.every((it) => it.pctCorrect === 100 && it.flags.includes("too-easy"))).toBe(true);
  });

  it("raises the answer-key alarm when most students agree on another option", () => {
    // Everyone answers Q1 (master) with the same wrong letter, everything else right.
    const q1 = sample[0]!;
    const wrong = "ABCD"[(q1.answer[0]! + 1) % 4]!;
    const answers = [wrong, ...keyA.slice(1)];
    const entries = [...Array(8)].map(() => ({ set: "A", answers }));
    const items = itemAnalysis(paper, entries);
    expect(items[0]!.flags).toContain("check-key");
    expect(items[0]!.topWrong).toBe(wrong);
    expect(items[1]!.flags).not.toContain("check-key");
  });

  it("flags skipped questions and suggests real difficulty only with enough students", () => {
    const blankFirst = ["", ...keyA.slice(1)];
    const items = itemAnalysis(paper, [...Array(10)].map(() => ({ set: "A", answers: blankFirst })));
    expect(items[0]!.flags).toEqual(expect.arrayContaining(["often-skipped", "too-hard"]));
    expect(suggestedDifficulty(items[0]!, 10)).toBe("hard");
    expect(suggestedDifficulty(items[0]!, 9)).toBeNull();
    // Set layout sanity: B differs from A, so mapping really happened.
    expect(setLayout(paper, "B").order).not.toEqual(setLayout(paper, "A").order);
  });

  it("stays quiet with fewer than 5 students", () => {
    expect(itemAnalysis(paper, [{ set: "A", answers: [] }]).every((it) => it.flags.length === 0)).toBe(true);
  });
});
