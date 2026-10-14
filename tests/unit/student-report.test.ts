// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { isSaved, loadHistory, MAX_SAVED_REPORTS, removeReport, saveReport, STUDENT_KEY, topicHistory } from "@/lib/client/studentStore";
import { analyseClass, buildDataset, parseTable } from "@/lib/tools/classAnalysis";
import {
  buildReports,
  decodeReport,
  encodeReport,
  focusTopics,
  linksAsCsv,
  linksAsMessageList,
  reportId,
  reportUrl,
  type StudentReport,
} from "@/lib/tools/studentReport";

const data = buildDataset(parseTable(["Roll,Algebra,Geometry,Trigonometry", "MAX,10,10,10", "R1,3,8,AB", "राम,9,2,4"].join("\n"))).dataset!;
const reports = buildReports(data, analyseClass(data), { institute: "Sunrise Classes", test: "Unit 1", date: "2026-10-01" });

describe("student report links", () => {
  it("builds one report per student with class averages and absences", () => {
    expect(reports).toHaveLength(2);
    expect(reports[0]).toMatchObject({ s: "R1", n: ["Algebra", "Geometry", "Trigonometry"], p: [30, 80, null], a: [60, 50, 40] });
  });

  it("round-trips through the URL fragment, including non-Latin text", () => {
    const r = reports[1]!;
    const url = reportUrl("https://heramb.study/", r);
    expect(url.startsWith("https://heramb.study/r#")).toBe(true);
    expect(url).not.toMatch(/[+/=]\w*$/);
    expect(decodeReport(url.split("#")[1]!)).toEqual(r);
    expect(decodeReport(`#${encodeReport(r)}`)?.s).toBe("राम");
  });

  it("rejects tampered, malformed or oversized payloads", () => {
    expect(decodeReport("")).toBeNull();
    expect(decodeReport("not*base64")).toBeNull();
    expect(decodeReport("x".repeat(13_000))).toBeNull();
    const bad = { ...reports[0]!, p: [30] } as StudentReport; // lengths don't match
    expect(decodeReport(encodeReport(bad))).toBeNull();
    const html = { ...reports[0]!, i: "<script>alert(1)</script>" };
    expect(decodeReport(encodeReport(html))?.i).toBe("<script>alert(1)</script>"); // kept as text; React escapes it
    expect(decodeReport(encodeReport({ ...reports[0]!, v: 2 } as unknown as StudentReport))).toBeNull();
  });

  it("picks up to three focus topics below 50%, weakest first", () => {
    expect(focusTopics(reports[0]!)).toEqual(["Algebra"]);
    expect(focusTopics(reports[1]!)).toEqual(["Geometry", "Trigonometry"]);
  });

  it("produces WhatsApp-ready lists and formula-safe CSV", () => {
    expect(linksAsMessageList("https://x.study", reports, "Unit 1").split("\n")[0]).toMatch(/^R1 — your Unit 1 report: https:\/\/x\.study\/r#/);
    const evil = [{ ...reports[0]!, s: "=HYPERLINK(1)" }];
    expect(linksAsCsv("https://x.study", evil).split("\n")[1]).toMatch(/^'=HYPERLINK/);
  });

  it("has stable ids for de-duplication", () => {
    expect(reportId(reports[0]!)).toBe(reportId(structuredClone(reports[0]!)));
    expect(reportId(reports[0]!)).not.toBe(reportId(reports[1]!));
  });
});

describe("student history (local only)", () => {
  beforeEach(() => localStorage.clear());

  it("saves once, de-duplicates and removes", () => {
    expect(saveReport(reports[0]!)).toBe("saved");
    expect(saveReport(reports[0]!)).toBe("already_saved");
    expect(isSaved(reports[0]!)).toBe(true);
    const id = loadHistory().history.reports[0]!.id;
    expect(removeReport(id)).toBe(true);
    expect(loadHistory().history.reports).toHaveLength(0);
  });

  it("builds topic history across tests, oldest first", () => {
    const later = { ...reports[0]!, t: "Unit 2", d: "2026-11-01", p: [60, 70, 40] };
    saveReport(later);
    saveReport(reports[0]!);
    const algebra = topicHistory(loadHistory().history).find((t) => t.topic === "Algebra")!;
    expect(algebra.points.map((p) => p.pct)).toEqual([30, 60]);
    const trig = topicHistory(loadHistory().history).find((t) => t.topic === "Trigonometry")!;
    expect(trig.points).toHaveLength(1); // absent in Unit 1
  });

  it("ignores corrupt data and handles missing storage and a full history", () => {
    localStorage.setItem(STUDENT_KEY, "{bad");
    expect(loadHistory().history.reports).toEqual([]);
    expect(saveReport(reports[0]!, null)).toBe("unavailable");
    const full = { version: 1, reports: Array.from({ length: MAX_SAVED_REPORTS }, (_, i) => ({ id: `id${i}`, savedAt: "", report: reports[0]! })) };
    localStorage.setItem(STUDENT_KEY, JSON.stringify(full));
    expect(saveReport(reports[1]!)).toBe("full");
  });
});
