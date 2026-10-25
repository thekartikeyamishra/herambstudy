import { describe, expect, it } from "vitest";
import { batchHistoryCsv, isPro, limitHistory } from "@/lib/institute/plan";
import type { StoredSummary } from "@/lib/institute/summary";

const s = (batch: string, date: string): StoredSummary => ({
  id: `${batch}-${date}`, at: `${date}T10:00:00Z`, batch, test: "=HYPERLINK(1)", date, students: 10, average: 50,
  topics: [{ n: "Optics", avg: 40, att: 10, below: 6 }],
});

describe("plan", () => {
  it("is Pro only until the paid date", () => {
    expect(isPro("2026-11-30", "2026-11-30")).toBe(true);
    expect(isPro("2026-11-29", "2026-11-30")).toBe(false);
    expect(isPro(null, "2026-11-30")).toBe(false);
  });
  it("free keeps the latest 2 tests per batch; Pro keeps all", () => {
    const all = [s("11A", "2026-10-01"), s("11A", "2026-10-08"), s("11A", "2026-10-15"), s("12B", "2026-10-02")];
    expect(limitHistory(all, false).map((x) => x.id).sort()).toEqual(["11A-2026-10-08", "11A-2026-10-15", "12B-2026-10-02"]);
    expect(limitHistory(all, true)).toHaveLength(4);
  });
  it("exports formula-safe CSV", () => {
    const csv = batchHistoryCsv([s("11A", "2026-10-01")]);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv.split("\n")).toHaveLength(2);
  });
});
