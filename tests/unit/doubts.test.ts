import { describe, expect, it } from "vitest";
import { doubtsCsv, heatmap, retestHref, topChapters, weekStart, type Doubt } from "@/lib/tools/doubts";
import { parseDoubtStore } from "@/lib/client/doubtStore";

const now = new Date(2026, 10, 4, 12); // Wed 4 Nov 2026
const DAY = 86_400_000;
const d = (daysAgo: number, chapter: string, batch = "A"): Doubt => ({ id: `id${Math.random().toString(36).slice(2, 10)}`, at: new Date(now.getTime() - daysAgo * DAY).toISOString(), batch, chapter, note: "" });

describe("doubt log", () => {
  it("weeks start on Monday", () => {
    expect(weekStart(now).getDay()).toBe(1);
    expect(weekStart(now).getDate()).toBe(2);
  });

  it("builds a chapter × week heatmap with trends, merging spellings", () => {
    const doubts = [d(0, "Optics"), d(1, "optics"), d(2, "Optics"), d(30, "Waves"), d(31, "Waves"), d(29, "Waves"), d(100, "Old")];
    const m = heatmap(doubts, { weeks: 6, now });
    expect(m.weeks).toHaveLength(6);
    const optics = m.rows.find((r) => r.chapter.toLowerCase() === "optics")!;
    expect(optics.total).toBe(3);
    expect(optics.counts.at(-1)).toBe(3);
    expect(optics.trend).toBe("rising");
    expect(m.rows.find((r) => r.chapter === "Waves")!.trend).toBe("falling");
    expect(m.rows.some((r) => r.chapter === "Old")).toBe(false);
  });

  it("filters by batch and ranks the last 14 days", () => {
    const doubts = [d(1, "Optics", "A"), d(2, "Optics", "A"), d(3, "Waves", "B"), d(20, "Kinematics", "A")];
    expect(topChapters(doubts, { now })).toEqual([{ chapter: "Optics", count: 2 }, { chapter: "Waves", count: 1 }]);
    expect(topChapters(doubts, { now, batch: "B" })).toEqual([{ chapter: "Waves", count: 1 }]);
  });

  it("links into the test builder and exports formula-safe CSV", () => {
    expect(retestHref(["Optics", "Waves"])).toBe("/test-builder#retest=Optics%7CWaves");
    expect(doubtsCsv([{ ...d(0, "=HYPERLINK()"), note: 'say "hi", ok' }])).toContain(`'=HYPERLINK()`);
  });

  it("drops damaged entries instead of crashing", () => {
    const r = parseDoubtStore({ v: 1, doubts: [d(0, "Optics"), { id: "x", chapter: "" }, "junk"], lastBatch: "A" });
    expect(r.store.doubts).toHaveLength(1);
    expect(r.dropped).toBe(2);
    expect(parseDoubtStore("nope").store.doubts).toEqual([]);
  });
});
