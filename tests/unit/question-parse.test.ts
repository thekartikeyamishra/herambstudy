import { describe, expect, it } from "vitest";
import { parseQuestions, sampleQuestionText } from "@/lib/tests/question";

describe("parseQuestions", () => {
  it("parses the sample bank completely", () => {
    const r = parseQuestions(sampleQuestionText());
    expect(r.errors).toEqual([]);
    expect(r.questions).toHaveLength(8);
    expect(r.questions[0]).toMatchObject({ text: "What is the SI unit of force?", options: ["Joule", "Newton", "Watt", "Pascal"], answer: [1], chapter: "Laws of motion", difficulty: "easy", subject: "Physics" });
  });
  it("handles options on separate lines, A./a) styles, multi-line options and defaults", () => {
    const r = parseQuestions("Q1) Which are vectors?\nA. Speed\nB. Velocity\nC. Force\nthat acts on a body\nD. Mass\nAnswer: B, C\n\n2. Unit of work\na) joule\nb) newton\nAns: (a)", { chapter: "Kinematics" });
    expect(r.errors).toEqual([]);
    expect(r.questions[0]!.answer).toEqual([1, 2]);
    expect(r.questions[0]!.options[2]).toBe("Force that acts on a body");
    expect(r.questions[1]).toMatchObject({ chapter: "Kinematics", options: ["joule", "newton"], answer: [0] });
  });
  it("splits questions that have no blank line between them", () => {
    const r = parseQuestions("1. A?\n(a) x (b) y\nAns: a\n2. B?\n(a) x (b) y\nAns: b", { chapter: "C" });
    expect(r.questions).toHaveLength(2);
  });
  it("explains what's missing instead of guessing", () => {
    const r = parseQuestions("1. No options here\nAns: a\n\n2. No answer\n(a) x (b) y\n\n3. Bad answer\n(a) x (b) y\nAns: d", { chapter: "C" });
    expect(r.questions).toHaveLength(0);
    expect(r.errors).toHaveLength(3);
    expect(r.errors[1]).toMatch(/answer/i);
  });
});
