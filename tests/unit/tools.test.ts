import { describe, expect, it } from "vitest";
import { statusFor } from "@/content/sampleData";
import { compareAssessments, summarise } from "@/lib/tools/compare";
import { analyseTopics, prioritise, toCsv } from "@/lib/tools/gaps";
import { analyseMistakes, emptyCounts } from "@/lib/tools/mistakes";
import { answerKey, bandFor, DIMENSIONS, scoreDiagnostic, type Answers } from "@/lib/tools/readiness";

describe("status thresholds", () => {
  it("classifies at the documented boundaries", () => {
    expect(statusFor(75)).toBe("secure");
    expect(statusFor(74)).toBe("developing");
    expect(statusFor(50)).toBe("developing");
    expect(statusFor(49)).toBe("gap");
  });
});

describe("readiness diagnostic", () => {
  const all = (v: number): Answers =>
    Object.fromEntries(DIMENSIONS.flatMap((d) => d.statements.map((_, i) => [answerKey(d.key, i), v])));

  it("reports incomplete until every statement is answered", () => {
    expect(scoreDiagnostic({}).complete).toBe(false);
    expect(scoreDiagnostic(all(2)).complete).toBe(true);
  });

  it("scores dimensions and picks the weakest as focus", () => {
    const answers = all(3);
    answers[answerKey("review", 0)] = 0;
    answers[answerKey("review", 1)] = 0;
    answers[answerKey("review", 2)] = 1;
    const s = scoreDiagnostic(answers);
    const review = s.dimensions.find((d) => d.key === "review");
    expect(review?.percent).toBe(11);
    expect(review?.band).toBe("priority");
    expect(s.focus[0]?.key).toBe("review");
    expect(s.focus).toHaveLength(1); // the rest are strong
  });

  it("uses documented band thresholds", () => {
    expect(bandFor(70)).toBe("strong");
    expect(bandFor(40)).toBe("building");
    expect(bandFor(39)).toBe("priority");
  });
});

describe("learning-gap analyser", () => {
  it("validates rows and ignores blank ones", () => {
    const { results, errors } = analyseTopics([
      { topic: "Bonding", scored: "7", max: "20" },
      { topic: "", scored: "", max: "" },
      { topic: "Bad", scored: "30", max: "20" },
      { topic: "Zero max", scored: "1", max: "0" },
    ]);
    expect(results).toHaveLength(1);
    expect(errors.map((e) => e.index)).toEqual([2, 3]);
  });

  it("clamps negative marks to 0% and prioritises gaps with most marks at stake", () => {
    const { results } = analyseTopics([
      { topic: "Small gap", scored: "1", max: "4" },
      { topic: "Big gap", scored: "-2", max: "20" },
      { topic: "Secure", scored: "19", max: "20" },
      { topic: "Developing", scored: "12", max: "20" },
    ]);
    expect(results.find((r) => r.topic === "Big gap")?.percent).toBe(0);
    expect(prioritise(results).map((r) => r.topic)).toEqual(["Big gap", "Small gap", "Developing", "Secure"]);
  });

  it("neutralises spreadsheet formula injection in CSV exports", () => {
    const { results } = analyseTopics([{ topic: "=HYPERLINK(\"x\")", scored: "1", max: "2" }]);
    expect(toCsv(results).split("\n")[1]).toMatch(/^"'=HYPERLINK/);
  });
});

describe("assessment comparison", () => {
  it("treats changes within the margin as no clear change", () => {
    const { results } = compareAssessments(
      [
        { topic: "A", firstPercent: "60", secondPercent: "64" },
        { topic: "B", firstPercent: "48", secondPercent: "66" },
        { topic: "C", firstPercent: "61", secondPercent: "52" },
      ],
      5,
    );
    expect(results.map((r) => r.verdict)).toEqual(["no_clear_change", "improved", "declined"]);
    expect(summarise(results)).toEqual({ improved: 1, declined: 1, unclear: 1 });
  });

  it("rejects out-of-range percentages", () => {
    const { errors } = compareAssessments([{ topic: "A", firstPercent: "120", secondPercent: "50" }], 5);
    expect(errors).toHaveLength(1);
  });
});

describe("mistake tally", () => {
  it("needs at least 5 mistakes and a 40% share before naming a pattern", () => {
    expect(analyseMistakes({ ...emptyCounts(), concept: 3 }).dominant).toBeNull();
    expect(analyseMistakes({ ...emptyCounts(), concept: 2, careless: 2, time: 1, misread: 1, procedure: 1 }).dominant).toBeNull();
    expect(analyseMistakes({ ...emptyCounts(), careless: 4, concept: 2 }).dominant?.key).toBe("careless");
  });
});
