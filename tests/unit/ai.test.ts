import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProvider, type AiProvider } from "@/lib/ai/providers";
import { buildPrompt, parseModelOutput, ruleBasedSummary, summaryInputSchema, toSummaryInput } from "@/lib/ai/summary";
import { __setBackendForTests } from "@/lib/server/backend";
import { __setAiProviderForTests, handleAiSummary } from "@/lib/server/aiHandler";
import { MemoryContactStore, MemoryInstituteStore, MemoryInviteStore, MemoryPilotStore, MemoryRateLimiter } from "@/lib/server/memoryBackend";
import { analyseClass, buildDataset, compareClasses, parseTable, sampleCsv, sampleFollowUpCsv } from "@/lib/tools/classAnalysis";

const ds = (csv: string) => buildDataset(parseTable(csv)).dataset!;
const analysis = analyseClass(ds(sampleCsv()));
const input = toSummaryInput(analysis, compareClasses(ds(sampleCsv()), ds(sampleFollowUpCsv())));
let ipN = 0;
const req = (body: unknown, ip = `10.7.0.${++ipN}`) =>
  new Request("http://localhost:3000/api/ai/summary", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", host: "localhost:3000", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

const GOOD = JSON.stringify({
  headline: "Equilibrium and bonding need whole-class reteaching.",
  priorities: ["Reteach equilibrium.", "Recap bonding with a small group."],
  parentNote: "The class did well in redox. We are focusing on equilibrium next.",
  caution: "Based on one test.",
});

function fakeProvider(text = GOOD, fail = false): AiProvider & { calls: number } {
  const p = {
    id: "anthropic" as const,
    model: "test-model",
    calls: 0,
    async generate() {
      p.calls += 1;
      if (fail) throw new Error("boom");
      return { text, inputTokens: 500, outputTokens: 120 };
    },
  };
  return p;
}

beforeEach(() => {
  __setBackendForTests({ kind: "memory", invites: new MemoryInviteStore(), contacts: new MemoryContactStore(), pilots: new MemoryPilotStore(), institutes: new MemoryInstituteStore(), limiter: new MemoryRateLimiter() });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  __setBackendForTests(null);
  __setAiProviderForTests(undefined);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("summary input (privacy)", () => {
  it("contains only aggregates — no roll numbers or individual marks", () => {
    const json = JSON.stringify(input);
    expect(json).not.toMatch(/R\d{2}/); // sample roll numbers R01…R24
    expect(Object.keys(input.topics[0]!)).toEqual(["name", "average", "attempted", "belowHalf", "action"]);
    expect(summaryInputSchema.safeParse(input).success).toBe(true);
  });

  it("rejects payloads carrying extra fields or markup", () => {
    const withStudents = { ...input, students: 24, roster: ["R01"] };
    expect(summaryInputSchema.parse(withStudents)).not.toHaveProperty("roster");
    expect(summaryInputSchema.safeParse({ ...input, topics: [{ ...input.topics[0]!, name: "<script>" }] }).success).toBe(false);
  });
});

describe("rule-based summary", () => {
  it("prioritises whole-class topics, then small groups, and mentions follow-up progress", () => {
    const s = ruleBasedSummary(input);
    expect(s.source).toBe("rules");
    expect(s.priorities.length).toBeGreaterThan(0);
    expect(s.priorities.length).toBeLessThanOrEqual(3);
    expect(s.priorities[0]).toMatch(/whole class/i);
    expect(s.parentNote).toMatch(/gaps? (has|have) closed/);
    expect(s.parentNote).not.toMatch(/R\d{2}/);
  });

  it("handles a class where everything is secure", () => {
    const s = ruleBasedSummary({ ...input, followUp: null, topics: [{ name: "Algebra", average: 90, attempted: 10, belowHalf: 0, action: "maintain" }] });
    expect(s.headline).toMatch(/secure/);
  });
});

describe("prompt and parsing", () => {
  it("keeps the prompt compact and grounded", () => {
    const { system, user } = buildPrompt(input);
    expect(system).toMatch(/ONLY the numbers/);
    expect(user.length).toBeLessThan(2000);
  });

  it("accepts valid JSON (even inside code fences) and rejects anything else", () => {
    expect(parseModelOutput(GOOD)?.priorities).toHaveLength(2);
    expect(parseModelOutput("```json\n" + GOOD + "\n```")).not.toBeNull();
    expect(parseModelOutput("Sure! Here is a plan.")).toBeNull();
    expect(parseModelOutput(JSON.stringify({ headline: "x" }))).toBeNull();
  });
});

describe("POST /api/ai/summary", () => {
  it("returns the free rule-based summary when no AI provider is configured", async () => {
    __setAiProviderForTests(null);
    const res = await handleAiSummary(req(input));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.summary.source).toBe("rules");
  });

  it("uses AI when configured and caches identical requests (one model call)", async () => {
    const p = fakeProvider();
    __setAiProviderForTests(p);
    const a = await (await handleAiSummary(req(input))).json();
    const b = await (await handleAiSummary(req(input))).json();
    expect(a.summary.source).toBe("ai");
    expect(b.summary).toEqual(a.summary);
    expect(p.calls).toBe(1);
  });

  it("falls back to rules on provider errors or unusable output", async () => {
    __setAiProviderForTests(fakeProvider(GOOD, true));
    const e = await (await handleAiSummary(req(input))).json();
    expect(e.summary.source).toBe("rules");
    expect(e.summary.note).toMatch(/unavailable/);
    __setAiProviderForTests(fakeProvider("not json"));
    const u = await (await handleAiSummary(req(input))).json();
    expect(u.summary.source).toBe("rules");
  });

  it("enforces the daily allowance per visitor, then serves rules", async () => {
    vi.stubEnv("AI_FREE_DAILY_LIMIT", "2");
    const p = fakeProvider();
    __setAiProviderForTests(p);
    const ip = "198.51.100.7";
    for (let i = 0; i < 2; i++) {
      const body = await (await handleAiSummary(req({ ...input, students: 10 + i }, ip))).json();
      expect(body.summary.source).toBe("ai");
    }
    const third = await (await handleAiSummary(req({ ...input, students: 20 }, ip))).json();
    expect(third.summary.source).toBe("rules");
    expect(third.summary.note).toMatch(/used up/);
    expect(p.calls).toBe(2);
  });

  it("enforces the global daily cap", async () => {
    vi.stubEnv("AI_GLOBAL_DAILY_LIMIT", "1");
    __setAiProviderForTests(fakeProvider());
    expect((await (await handleAiSummary(req({ ...input, students: 30 }))).json()).summary.source).toBe("ai");
    const second = await (await handleAiSummary(req({ ...input, students: 31 }))).json();
    expect(second.summary.note).toMatch(/busy/);
  });

  it("rejects cross-site requests and invalid payloads", async () => {
    const bad = new Request("http://localhost:3000/api/ai/summary", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example", host: "localhost:3000" },
      body: JSON.stringify(input),
    });
    expect((await handleAiSummary(bad)).status).toBe(403);
    expect((await handleAiSummary(req({ topics: [] }))).status).toBe(422);
  });
});

describe("providers", () => {
  it("is off by default and needs a key; only https base URLs for compatible endpoints", () => {
    expect(getProvider({})).toBeNull();
    expect(getProvider({ AI_PROVIDER: "anthropic" })).toBeNull();
    expect(getProvider({ AI_PROVIDER: "anthropic", AI_API_KEY: "k" })?.model).toBe("claude-haiku-5-5");
    expect(getProvider({ AI_PROVIDER: "openai_compatible", AI_API_KEY: "k", AI_BASE_URL: "http://x.test/v1", AI_MODEL: "m" })).toBeNull();
    expect(getProvider({ AI_PROVIDER: "openai_compatible", AI_API_KEY: "k", AI_BASE_URL: "https://x.test/v1", AI_MODEL: "m" })?.id).toBe("openai_compatible");
  });

  it("calls the Anthropic Messages API with key, version and token limit", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: GOOD }], usage: { input_tokens: 400, output_tokens: 100 } })));
    vi.stubGlobal("fetch", f);
    const r = await getProvider({ AI_PROVIDER: "anthropic", AI_API_KEY: "secret", AI_MODEL: "m1" })!.generate({ system: "s", user: "u", maxTokens: 450 });
    expect(r.text).toBe(GOOD);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe("secret");
    expect(init.headers["anthropic-version"]).toBeTruthy();
    expect(JSON.parse(init.body).max_tokens).toBe(450);
  });

  it("calls OpenAI-compatible chat completions", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: GOOD } }] })));
    vi.stubGlobal("fetch", f);
    const r = await getProvider({ AI_PROVIDER: "openai_compatible", AI_API_KEY: "k", AI_BASE_URL: "https://x.test/v1/", AI_MODEL: "m" })!.generate({ system: "s", user: "u", maxTokens: 100 });
    expect(r.text).toBe(GOOD);
    expect(f.mock.calls[0]![0]).toBe("https://x.test/v1/chat/completions");
  });
});
