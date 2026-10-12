import { describe, expect, it } from "vitest";
import { adsConfig, isAdAllowedOnPath, resolveAdsConfig } from "@/config/ads";
import { buildCsp } from "@/config/csp";
import { getPaymentProvider, isPaymentProviderEnabled } from "@/config/payments";
import { sanitizeParams } from "@/lib/client/analytics";

describe("advertising configuration", () => {
  it("is disabled by default in this build", () => {
    expect(adsConfig.enabled).toBe(false);
    expect(adsConfig.clientId).toBeNull();
  });

  it("stays disabled without a valid publisher ID, even when the flag is on", () => {
    expect(resolveAdsConfig({ NEXT_PUBLIC_ADSENSE_ENABLED: "true" }).enabled).toBe(false);
    expect(resolveAdsConfig({ NEXT_PUBLIC_ADSENSE_ENABLED: "true", NEXT_PUBLIC_ADSENSE_CLIENT_ID: "pub-123" }).enabled).toBe(false);
    expect(resolveAdsConfig({ NEXT_PUBLIC_ADSENSE_ENABLED: "false", NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-1234567890123456" }).enabled).toBe(false);
  });

  it("enables only with the flag and a well-formed ID; auto ads stay opt-in", () => {
    const c = resolveAdsConfig({ NEXT_PUBLIC_ADSENSE_ENABLED: "true", NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-1234567890123456", NEXT_PUBLIC_ADSENSE_SLOT_RESOURCE: "1234567890" });
    expect(c).toEqual({ enabled: true, clientId: "ca-pub-1234567890123456", resourceSlot: "1234567890", autoAds: false });
  });

  it("never allows ads on conversion, legal or home pages", () => {
    for (const p of ["/", "/invite", "/contact", "/privacy", "/terms", "/refund-policy", "/offline", "/how-it-works"]) {
      expect(isAdAllowedOnPath(p)).toBe(false);
    }
    expect(isAdAllowedOnPath("/resources/learning-gap-analysis")).toBe(true);
    expect(isAdAllowedOnPath("/resources")).toBe(false);
  });
});

describe("content security policy", () => {
  it("contains no third-party origins by default", () => {
    const csp = buildCsp({ isDev: false, analyticsEnabled: false, adsEnabled: false });
    expect(csp).not.toMatch(/google/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("adds only the required origins when integrations are enabled", () => {
    expect(buildCsp({ isDev: false, analyticsEnabled: true, adsEnabled: false })).toContain("https://www.googletagmanager.com");
    expect(buildCsp({ isDev: false, analyticsEnabled: false, adsEnabled: true })).toContain("https://pagead2.googlesyndication.com");
  });
});

describe("payments", () => {
  it("are disabled and unimplemented in the launch release", () => {
    expect(isPaymentProviderEnabled("razorpay")).toBe(false);
    expect(isPaymentProviderEnabled("paypal")).toBe(false);
    expect(() => getPaymentProvider("razorpay")).toThrow(/not implemented/);
  });
});

describe("analytics parameter sanitising", () => {
  it("drops unknown keys, emails and long free text", () => {
    expect(
      sanitizeParams({ role: "teacher", email: "a@b.com", country: "someone@example.com", tool: "x".repeat(100), outcome: "success", page: 2 }),
    ).toEqual({ role: "teacher", outcome: "success", page: 2 });
  });
});
