import { describe, expect, it } from "vitest";
import { codeFromRandom, CODE_ALPHABET, foundingCap, isValidCode, normaliseCode, seatLabel } from "@/lib/institute/code";
import { dayKey, eventBatchSchema, valueFeedbackSchema } from "@/lib/institute/events";
import { computeMetrics, weekStart, type DayRow } from "@/lib/institute/metrics";
import reportLinks from "../fixtures/report-links.json";
import { buildReports, decodeReport, encodeReport } from "@/lib/tools/studentReport";
import { analyseClass, buildDataset, parseTable, sampleCsv } from "@/lib/tools/classAnalysis";

describe("institute codes", () => {
  it("generates codes in the canonical, unambiguous format", () => {
    let i = 0;
    const bytes = [0, 255, 7, 31, 30, 62, 93, 124, 248, 249, 3, 4];
    const code = codeFromRandom(() => bytes[i++ % bytes.length]!);
    expect(isValidCode(code)).toBe(true);
    expect(code).toMatch(/^HRB-[^01OIL]{4}-[^01OIL]{4}$/);
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it("rejects bytes that would bias the distribution", () => {
    const seq = [250, 251, 252, 253, 254, 255, 0, 1, 2, 3, 4, 5, 6, 7];
    let i = 0;
    const code = codeFromRandom(() => seq[i++]!);
    expect(code).toBe(`HRB-${CODE_ALPHABET.slice(0, 4)}-${CODE_ALPHABET.slice(4, 8)}`);
  });

  it("normalises codes typed on a phone", () => {
    expect(normaliseCode("hrb 7kq4 m2xa")).toBe("HRB-7KQ4-M2XA");
    expect(normaliseCode("7KQ4M2XA")).toBe("HRB-7KQ4-M2XA");
    expect(normaliseCode("HRB-7KQ4-M2X")).toBeNull();
    expect(normaliseCode("HRB-0KQ4-M2XA")).toBeNull();
    expect(normaliseCode(undefined)).toBeNull();
  });

  it("formats founding seats and reads the cap from env", () => {
    expect(seatLabel(7, 50)).toBe("#07 of 50");
    expect(seatLabel(null, 50)).toBeNull();
    expect(foundingCap({})).toBe(50);
    expect(foundingCap({ FOUNDING_CAP: "20" })).toBe(20);
    expect(foundingCap({ FOUNDING_CAP: "-3" })).toBe(50);
  });
});

describe("usage event schema (privacy contract)", () => {
  const base = { code: "HRB-7KQ4-M2XA", device: "abcdefghijklmnop", role: "teacher" };
  it("accepts counts only", () => {
    const r = eventBatchSchema.parse({ ...base, events: [{ type: "analysis_real" }, { type: "links_shared", n: 32 }] });
    expect(r.events).toEqual([{ type: "analysis_real", n: 1 }, { type: "links_shared", n: 32 }]);
  });
  it("strips any extra data a buggy client might attach", () => {
    const r = eventBatchSchema.parse({ ...base, marks: [1, 2], events: [{ type: "analysis_real", topic: "Kinematics", name: "Ravi" }] });
    expect(JSON.stringify(r)).not.toMatch(/Kinematics|Ravi|marks/);
  });
  it("rejects unknown events, bad codes and oversized counts", () => {
    expect(eventBatchSchema.safeParse({ ...base, events: [{ type: "student_name" }] }).success).toBe(false);
    expect(eventBatchSchema.safeParse({ ...base, code: "HRB-XXXX", events: [{ type: "analysis_real" }] }).success).toBe(false);
    expect(eventBatchSchema.safeParse({ ...base, events: [{ type: "links_shared", n: 501 }] }).success).toBe(false);
    expect(eventBatchSchema.safeParse({ ...base, events: [] }).success).toBe(false);
  });
  it("value feedback refuses links and multi-line notes", () => {
    const ok = { code: base.code, minutes: "30", helped: ["weak_chapters"], note: "Saved our Saturday meeting" };
    expect(valueFeedbackSchema.safeParse(ok).success).toBe(true);
    expect(valueFeedbackSchema.safeParse({ ...ok, note: "see www.spam.com" }).success).toBe(false);
    expect(valueFeedbackSchema.safeParse({ ...ok, note: "a\nb" }).success).toBe(false);
    expect(valueFeedbackSchema.safeParse({ ...ok, helped: [] }).success).toBe(false);
  });
  it("uses India dates for day keys", () => {
    expect(dayKey(Date.parse("2026-10-18T20:00:00Z"))).toBe("2026-10-19");
    expect(dayKey(Date.parse("2026-10-18T10:00:00Z"))).toBe("2026-10-18");
  });
});

describe("seven founding-programme metrics", () => {
  const day = (date: string, c: DayRow["c"]): DayRow => ({ date, c });
  const run = (days: DayRow[], today: string, extra: Partial<Parameters<typeof computeMetrics>[0]> = {}) =>
    computeMetrics({ institute: { createdAt: "2026-09-01", activatedAt: null }, days, devices: { teacher: 1, student: 0 }, feedback: [], today, ...extra });
  const met = (m: ReturnType<typeof run>) => Object.fromEntries(m.metrics.map((x) => [x.key, x.met]));

  it("a brand-new institute has nothing met and a clear first step", () => {
    const m = run([], "2026-09-02");
    expect(m.metCount).toBe(0);
    expect(m.health).toBe("not_activated");
    expect(m.nextStep).toMatch(/Analyse one real test/);
  });

  it("demo runs don't count as activation", () => {
    const m = run([day("2026-09-02", { analysis_sample: 3 })], "2026-09-02");
    expect(met(m).activation).toBe(false);
    expect(m.metrics[0]!.detail).toMatch(/demo class was tried 3 times/);
  });

  it("answers all seven questions YES for a healthy institute", () => {
    const days = [
      day("2026-09-02", { analysis_real: 1, links_created: 30, links_shared: 30 }),
      day("2026-09-03", { report_opened: 24, report_saved: 11, student_helpful_yes: 6 }),
      day("2026-09-09", { analysis_real: 1, followup_run: 1, links_shared: 28 }),
      day("2026-10-08", { analysis_real: 1, report_opened: 20 }),
    ];
    const m = run(days, "2026-10-10", {
      devices: { teacher: 2, student: 40 },
      feedback: [{ at: "2026-09-10", minutes: "60", helped: ["weak_chapters", "parent_communication"], note: "Parents finally saw chapter data" }],
    });
    expect(met(m)).toEqual({ activation: true, adoption: true, distribution: true, engagement: true, repeat: true, retention: true, value: true });
    expect(m.metCount).toBe(7);
    expect(m.health).toBe("active");
    expect(m.totals.links_shared).toBe(58);
    expect(m.metrics.find((x) => x.key === "engagement")!.detail).toMatch(/open rate 76%/);
    expect(m.metrics.find((x) => x.key === "value")!.detail).toMatch(/60 min/);
  });

  it("retention is pending before day 30 and false after a lapse", () => {
    const early = run([day("2026-09-02", { analysis_real: 1 })], "2026-09-20");
    const r1 = early.metrics.find((x) => x.key === "retention")!;
    expect(r1.met).toBe(false);
    expect(r1.pending).toBe(true);
    expect(r1.headline).toBe("Day 18 of 30");
    const lapsed = run([day("2026-09-02", { analysis_real: 1 })], "2026-10-20");
    const r2 = lapsed.metrics.find((x) => x.key === "retention")!;
    expect(r2.pending).toBe(false);
    expect(lapsed.health).toBe("dormant");
  });

  it("flags at-risk institutes after 10 quiet days", () => {
    expect(run([day("2026-09-02", { analysis_real: 1 })], "2026-09-13").health).toBe("at_risk");
  });

  it("a re-test on the same day is adoption but not 'the next test'", () => {
    const m = run([day("2026-09-02", { analysis_real: 2 })], "2026-09-03");
    expect(met(m).repeat).toBe(false);
  });

  it("counts the weekly streak without breaking on an empty current week", () => {
    const m = run([day("2026-09-28", { analysis_real: 1 }), day("2026-10-06", { analysis_real: 1 }), day("2026-10-13", { analysis_real: 1 })], "2026-10-19");
    expect(weekStart("2026-10-19")).toBe("2026-10-19");
    expect(m.weeklyStreak).toBe(3);
    expect(m.weeks).toHaveLength(8);
  });
});

describe("report links carry an optional institute code", () => {
  it("every existing link in the fixtures still decodes exactly as before", () => {
    for (const c of reportLinks as Array<{ fragment: string; valid: boolean }>) {
      expect(decodeReport(c.fragment) !== null).toBe(c.valid);
    }
  });
  it("adds the code when connected and round-trips it", () => {
    const { dataset } = buildDataset(parseTable(sampleCsv()));
    const reports = buildReports(dataset!, analyseClass(dataset!), { institute: "Sunrise", test: "UT 3", date: "2026-10-01", code: "HRB-7KQ4-M2XA" });
    const back = decodeReport(encodeReport(reports[0]!));
    expect(back?.c).toBe("HRB-7KQ4-M2XA");
    const plain = buildReports(dataset!, analyseClass(dataset!), { institute: "Sunrise", test: "UT 3", date: "2026-10-01" });
    expect("c" in plain[0]!).toBe(false);
  });
  it("rejects a malformed code inside a link", () => {
    const { dataset } = buildDataset(parseTable(sampleCsv()));
    const [r] = buildReports(dataset!, analyseClass(dataset!), { institute: "Sunrise", test: "UT 3", date: "2026-10-01" });
    expect(decodeReport(encodeReport({ ...r!, c: "javascript:alert(1)" }))).toBeNull();
  });
});
