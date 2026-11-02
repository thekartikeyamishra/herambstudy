import { describe, expect, it } from "vitest";
import { parseQuestions, sampleQuestionText } from "@/lib/tests/question";
import {
  decodeOnlineTest, encodeOnlineTest, encodeResponse, onlineTestFor, paperMapText, parseResponseCodes, pickQuestions, responsesTable, setKey, setLayout, toMaster, type Paper,
} from "@/lib/tests/paper";
import { applyPaperMap, parsePaperMap } from "@/lib/tools/paperMap";
import { analyseClass, buildDataset } from "@/lib/tools/classAnalysis";

const bank = parseQuestions(sampleQuestionText()).questions;
const paper: Paper = { id: "p1", name: "Weekly 1", institute: "Test Classes", durationMin: 20, marking: { correct: 4, wrong: 1 }, questions: bank, sets: ["A", "B", "C"], seed: 12345, createdAt: "" };

describe("papers", () => {
  it("picks by chapter and difficulty without repeats and reports shortfalls", () => {
    const r = pickQuestions(bank, [{ chapter: "Laws of motion", difficulty: "any", count: 2 }, { chapter: "*", difficulty: "easy", count: 3 }, { chapter: "Cell", difficulty: "hard", count: 1 }], 7);
    expect(new Set(r.picked.map((q) => q.id)).size).toBe(r.picked.length);
    expect(r.picked.filter((q) => q.chapter === "Laws of motion")).toHaveLength(2);
    expect(r.shortfalls[0]).toMatch(/Cell · hard: wanted 1, the bank has 0/);
  });
  it("prefers questions not used recently", () => {
    const avoid = new Set(bank.slice(0, 6).map((q) => q.id));
    const r = pickQuestions(bank, [{ chapter: "*", difficulty: "any", count: 2 }], 1, avoid);
    expect(r.picked.every((q) => !avoid.has(q.id))).toBe(true);
  });
  it("set A is the master order; other sets are deterministic shuffles with correct keys", () => {
    expect(setLayout(paper, "A").order).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    const b1 = setLayout(paper, "B");
    expect(setLayout(paper, "B")).toEqual(b1);
    expect(b1.order).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    // A student answering set B perfectly maps back to the master key exactly.
    expect(toMaster(paper, "B", setKey(paper, "B"))).toEqual(setKey(paper, "A"));
    expect(setKey(paper, "A")).toEqual(["B", "A", "C", "B", "D", "C", "B", "A"]);
  });
  it("turns responses from mixed sets into correct chapter marks", () => {
    const table = responsesTable(paper, [
      { roll: "R1", set: "A", answers: setKey(paper, "A") },
      { roll: "R2", set: "B", answers: setKey(paper, "B") },
      { roll: "R3", set: "C", answers: [] },
    ]);
    const r = applyPaperMap(table, parsePaperMap(paperMapText(paper)).lines, { kind: "responses", correct: 4, wrong: 1 });
    expect(r.errors).toEqual([]);
    const lom = r.rows![0]!.indexOf("Laws of motion");
    expect(r.rows![2]![lom]).toBe("8");
    expect(r.rows![3]![lom]).toBe("8");
    expect(r.rows![4]![lom]).toBe("AB");
    const ds = buildDataset(r.rows!).dataset!;
    expect(analyseClass(ds).students).toHaveLength(3);
  });
  it("online test links carry no answers and round-trip", async () => {
    const t = onlineTestFor(paper, "B");
    const code = await encodeOnlineTest(t);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = await decodeOnlineTest(code);
    expect(back).toEqual(t);
    expect(JSON.stringify(back)).not.toMatch(/"answer"|chapter/);
    expect(await decodeOnlineTest(code.slice(0, 20))).toBeNull();
  });
  it("response codes survive WhatsApp text, reject edits and other tests, and keep the latest per roll", () => {
    const c1 = encodeResponse({ p: "p1", s: "B", r: "R7", a: "ABCD-ABC", t: 300 });
    const c2 = encodeResponse({ p: "p1", s: "B", r: "R7", a: "BBBBBBBB", t: 280 });
    const other = encodeResponse({ p: "zz", s: "A", r: "R9", a: "AAAA", t: 1 });
    const edited = c1.replace(/\.(\w{4})$/, ".zzzz");
    const r = parseResponseCodes(`Hi sir my code: ${c1}\n${c2} thanks\n${other}\n${edited}`, "p1");
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0]).toMatchObject({ roll: "R7", set: "B", answers: "BBBBBBBB".split("") });
    expect(r.problems.length).toBe(2);
  });
});
