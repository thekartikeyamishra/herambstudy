import { afterEach, describe, expect, it, vi } from "vitest";
import { getProvider, mockProvider } from "@/lib/ai/providers";
import { devToolsEnabled } from "@/lib/dev/env";
import { featureMap } from "@/lib/dev/featureMap";
import { listFixtures, safeFixturePath } from "@/lib/dev/fixtures";
import { devMemorySnapshot, devResetMemory } from "@/lib/server/backend";
import { deliver, devOutbox, clearDevOutbox, emailConfig } from "@/lib/server/email";

afterEach(() => {
  vi.unstubAllEnvs();
  clearDevOutbox();
});

describe("developer tools never activate in production", () => {
  it("devToolsEnabled is false only for production", () => {
    expect(devToolsEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(devToolsEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(devToolsEnabled({ NODE_ENV: "test" })).toBe(true);
  });

  it("the mock AI provider is refused in production", () => {
    expect(getProvider({ AI_PROVIDER: "mock", NODE_ENV: "production" })).toBeNull();
    expect(getProvider({ AI_PROVIDER: "mock", NODE_ENV: "development" })?.id).toBe("mock");
  });

  it("the email outbox is ignored in production (no fake 'sending' state)", () => {
    vi.stubEnv("EMAIL_DEV_OUTBOX", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(emailConfig()).toMatchObject({ outbox: false, sending: false });
    expect(devOutbox()).toEqual([]);
  });

  it("memory snapshot and reset do nothing in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(devMemorySnapshot()).toBeNull();
    expect(devResetMemory()).toBe(false);
  });
});

describe("developer tools work in development", () => {
  it("captures email in the outbox instead of sending, even when Resend is configured", async () => {
    vi.stubEnv("EMAIL_DEV_OUTBOX", "true");
    vi.stubEnv("RESEND_API_KEY", "re_should_not_be_used");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(emailConfig()).toMatchObject({ outbox: true, sending: true });
    expect(await deliver({ to: "a@b.co", subject: "Hi", text: "t", html: "<p>t</p>" })).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(devOutbox()[0]).toMatchObject({ to: "a@b.co", subject: "Hi" });
  });

  it("mock AI modes cover success and every failure path", async () => {
    const ok = await mockProvider("ok").generate({ system: "", user: "", maxTokens: 10 });
    expect(JSON.parse(ok.text).headline).toMatch(/MOCK/);
    await expect(mockProvider("fail").generate({ system: "", user: "", maxTokens: 10 })).rejects.toThrow();
    expect((await mockProvider("garbage").generate({ system: "", user: "", maxTokens: 10 })).text).not.toMatch(/{/);
    const c = new AbortController();
    const slow = mockProvider("slow").generate({ system: "", user: "", maxTokens: 10, signal: c.signal });
    c.abort();
    await expect(slow).rejects.toThrow();
  });

  it("fixture paths cannot escape the fixtures folder", () => {
    expect(safeFixturePath("class-analyser/01-valid.csv")).toBe("class-analyser/01-valid.csv");
    for (const bad of ["../package.json", "a/../../x", "/etc/passwd", "a\\b", "a//b", "", "%2e%2e/x"]) expect(safeFixturePath(bad)).toBeNull();
  });

  it("lists fixtures and describes every feature", () => {
    expect(listFixtures().length).toBeGreaterThan(20);
    const map = featureMap();
    expect(map.length).toBeGreaterThan(20);
    for (const f of map) expect(f.showsWhen.length).toBeGreaterThan(5);
  });
});
