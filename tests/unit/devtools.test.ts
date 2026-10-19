import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { devToolsEnabled } from "@/config/devtools";
import { emailConfig, signToken } from "@/lib/server/email";

const cases: Array<[string, Record<string, string | undefined>, boolean]> = [
  ["next dev", { NODE_ENV: "development" }, true],
  ["production build, no flag", { NODE_ENV: "production" }, false],
  ["unit tests", { NODE_ENV: "test" }, false],
  ["preview deploy with flag", { NODE_ENV: "production", HERAMB_DEV_TOOLS: "true", VERCEL_ENV: "preview", NEXT_PUBLIC_SITE_URL: "https://heramb-git-x.vercel.app" }, true],
  ["flag set on the production deployment", { NODE_ENV: "production", HERAMB_DEV_TOOLS: "true", VERCEL_ENV: "production" }, false],
  ["flag set with the production domain", { NODE_ENV: "production", HERAMB_DEV_TOOLS: "true", NEXT_PUBLIC_SITE_URL: "https://heramb.study/" }, false],
  ["flag set with the www domain (any case)", { NODE_ENV: "production", HERAMB_DEV_TOOLS: "true", NEXT_PUBLIC_SITE_URL: "https://WWW.heramb.study" }, false],
  ["flag must be exactly true", { NODE_ENV: "production", HERAMB_DEV_TOOLS: "1" }, false],
];

describe("developer tools gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(cases)("%s → %s", (_label, env, expected) => {
    expect(devToolsEnabled(env)).toBe(expected);
  });

  it("the postbuild check script agrees with the app in every case", async () => {
    const path = join(process.cwd(), "scripts/assert-no-devtools.mjs");
    const script = (await import(/* @vite-ignore */ path)) as { devToolsAllowed: (e: Record<string, string | undefined>) => boolean; devRoutesIn: (m: Record<string, string>) => string[] };
    for (const [, env, expected] of cases) expect(script.devToolsAllowed(env)).toBe(expected);
    expect(script.devRoutesIn({ a: "/dev", b: "/dev/crash", c: "/api/dev/state", d: "/developers", e: "/resources" })).toEqual(["/dev", "/dev/crash", "/api/dev/state"]);
  });

  it("dev inbox and dev link secret are off outside developer tools", () => {
    vi.stubEnv("EMAIL_TOKEN_SECRET", "");
    expect(emailConfig()).toMatchObject({ devOutbox: false, tokens: false });
    expect(signToken("confirm", "a".repeat(32))).toBeNull();
  });

  it("in development, emails are captured and links are signed with the dev secret", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_TOKEN_SECRET", "");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(emailConfig()).toMatchObject({ sending: false, devOutbox: true, tokens: true });
    expect(signToken("confirm", "a".repeat(32))).toMatch(/^[A-Za-z0-9_-]{40,}$/);
  });

  it("a real email provider always wins over the dev inbox", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "hello@heramb.study");
    expect(emailConfig()).toMatchObject({ sending: true, devOutbox: false });
  });
});
