import { describe, expect, it } from "vitest";
import { FEATURES, GUARANTEES, PLANS } from "@/config/plans";
import { addedOver, aiDailyAllowance, canUse, formatPrice, getPlan } from "@/lib/entitlements";

describe("plans", () => {
  it("every higher plan includes everything in the plan below it (paying never removes features)", () => {
    for (let i = 1; i < PLANS.length; i++) {
      const lower = new Set(PLANS[i - 1]!.features);
      for (const f of lower) expect(PLANS[i]!.features).toContain(f);
      expect(PLANS[i]!.aiPerDay).toBeGreaterThan(PLANS[i - 1]!.aiPerDay);
    }
  });

  it("free plan contains every currently-available, zero-cost tool and data export", () => {
    const free = getPlan("free").features;
    for (const f of ["browser_tools", "local_tracker", "rule_summaries", "term_reports", "student_links", "data_export"] as const) {
      expect(free).toContain(f);
      expect(FEATURES[f].availability).toBe("available");
    }
  });

  it("only promises what exists today", () => {
    expect(GUARANTEES.join(" ")).not.toMatch(/reminder|read-only|12 months/i);
  });

  it("data export is on every plan", () => {
    for (const p of PLANS) expect(p.features).toContain("data_export");
    expect(GUARANTEES.join(" ")).toMatch(/export/i);
  });

  it("gates on both plan membership and availability", () => {
    expect(canUse("free", "browser_tools")).toBe(true);
    expect(canUse("free", "cloud_history")).toBe(false); // not in plan
    expect(canUse("institute", "cloud_history")).toBe(false); // in plan but not built yet
    expect(canUse("institute", "student_practice")).toBe(false);
    expect(canUse("institute", "student_practice", { pilotPartner: true })).toBe(true);
  });

  it("allows lowering — never raising — the free AI allowance via env", () => {
    expect(aiDailyAllowance("free", {})).toBe(5);
    expect(aiDailyAllowance("free", { AI_FREE_DAILY_LIMIT: "2" })).toBe(2);
    expect(aiDailyAllowance("free", { AI_FREE_DAILY_LIMIT: "" })).toBe(5);
    expect(aiDailyAllowance("free", { AI_FREE_DAILY_LIMIT: "0" })).toBe(0);
    expect(aiDailyAllowance("free", { AI_FREE_DAILY_LIMIT: "99" })).toBe(5);
    expect(aiDailyAllowance("institute", { AI_FREE_DAILY_LIMIT: "0" })).toBe(500);
  });

  it("formats unpublished prices honestly and lists upgrade additions", () => {
    expect(formatPrice(getPlan("free"))).toBe("Free forever");
    expect(formatPrice(getPlan("institute"))).toBe("Founding price on request");
    expect(addedOver("free", "teacher")).toEqual(expect.arrayContaining(["cloud_history", "multi_device"]));
  });
});
