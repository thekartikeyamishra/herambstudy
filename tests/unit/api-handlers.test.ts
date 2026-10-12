import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __setBackendForTests } from "@/lib/server/backend";
import { CONTACT_SUCCESS_MESSAGE, handleContact, handleInvite, INVITE_SUCCESS_MESSAGE } from "@/lib/server/handlers";
import { requestIdForEmail } from "@/lib/server/http";
import { MemoryContactStore, MemoryInviteStore, MemoryPilotStore, MemoryRateLimiter } from "@/lib/server/memoryBackend";
import type { InviteStore } from "@/lib/server/types";

const ORIGIN = "http://localhost:3000";
let ipCounter = 0;

function req(body: unknown, opts: { origin?: string | null; ip?: string; contentType?: string; raw?: string } = {}) {
  const headers = new Headers({
    "content-type": opts.contentType ?? "application/json",
    host: "localhost:3000",
    "x-forwarded-for": opts.ip ?? `10.0.0.${++ipCounter}`,
  });
  if (opts.origin !== null) headers.set("origin", opts.origin ?? ORIGIN);
  return new Request(`${ORIGIN}/api/invite`, { method: "POST", headers, body: opts.raw ?? JSON.stringify(body) });
}

const validInvite = () => ({
  email: "Owner@Example.com",
  name: "Original Name",
  role: "institute_owner",
  country: "IN",
  useCase: "evaluate_for_institute",
  instituteName: "Sunrise Classes",
  instituteSize: "50_200",
  privacyAcknowledged: true,
  marketingConsent: false,
  startedAt: Date.now() - 60_000,
  website: "",
});

let invites: MemoryInviteStore;
let contacts: MemoryContactStore;

beforeEach(() => {
  invites = new MemoryInviteStore();
  contacts = new MemoryContactStore();
  __setBackendForTests({ kind: "memory", invites, contacts, pilots: new MemoryPilotStore(), limiter: new MemoryRateLimiter() });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => __setBackendForTests(null));

describe("POST /api/invite", () => {
  it("stores a valid request and confirms only after storage", async () => {
    const res = await handleInvite(req(validInvite()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: INVITE_SUCCESS_MESSAGE });
    const stored = invites.records.get(requestIdForEmail("owner@example.com"));
    expect(stored?.normalizedEmail).toBe("owner@example.com");
    expect(stored?.status).toBe("pending");
    expect(stored?.consentRecords.marketingUpdates.granted).toBe(false);
    expect(stored?.consentRecords.privacyNotice.granted).toBe(true);
    expect(stored?.institute).toEqual({ name: "Sunrise Classes", size: "50_200" });
  });

  it("handles duplicates safely: same response, original record never overwritten", async () => {
    await handleInvite(req(validInvite()));
    const second = await handleInvite(
      req({ ...validInvite(), email: "  OWNER@example.com", name: "Attacker", marketingConsent: true }),
    );
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ ok: true, message: INVITE_SUCCESS_MESSAGE });
    expect(invites.records.size).toBe(1);
    const stored = invites.records.get(requestIdForEmail("owner@example.com"));
    expect(stored?.name).toBe("Original Name");
    expect(stored?.consentRecords.marketingUpdates.granted).toBe(false);
    expect(stored?.duplicateAttempts).toBe(1);
  });

  it("rejects an invalid email with field errors and stores nothing", async () => {
    const res = await handleInvite(req({ ...validInvite(), email: "nope" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.fieldErrors.email).toMatch(/valid email/i);
    expect(invites.records.size).toBe(0);
  });

  it("returns an honest 503 when no storage backend is available", async () => {
    __setBackendForTests({ kind: "unavailable", reason: "test" });
    const res = await handleInvite(req(validInvite()));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("service_unavailable");
    expect(body.error.message).toMatch(/Nothing was saved/);
  });

  it("returns 503 (not success) when storage throws", async () => {
    const failing: InviteStore = {
      createIfAbsent: async () => { throw new Error("boom"); },
      updateMarketing: async () => "not_found",
    };
    __setBackendForTests({ kind: "memory", invites: failing, contacts, pilots: new MemoryPilotStore(), limiter: new MemoryRateLimiter() });
    const res = await handleInvite(req(validInvite()));
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
  });

  it("rejects honeypot submissions", async () => {
    const res = await handleInvite(req({ ...validInvite(), website: "http://spam.example" }));
    expect(res.status).toBe(400);
    expect(invites.records.size).toBe(0);
  });

  it("rejects submissions completed implausibly fast", async () => {
    const res = await handleInvite(req({ ...validInvite(), startedAt: Date.now() - 200 }));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("too_fast");
  });

  it("rate-limits repeated submissions from one IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await handleInvite(req({ ...validInvite(), email: `user${i}@example.com` }, { ip: "203.0.113.9" }));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
    const limited = await handleInvite(req({ ...validInvite(), email: "late@example.com" }, { ip: "203.0.113.9" }));
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("blocks cross-site requests (foreign Origin)", async () => {
    const res = await handleInvite(req(validInvite(), { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("requires JSON and enforces a body size limit", async () => {
    expect((await handleInvite(req(null, { contentType: "text/plain", raw: "email=x" }))).status).toBe(415);
    expect((await handleInvite(req(null, { raw: JSON.stringify({ email: "x".repeat(20_000) }) }))).status).toBe(413);
    expect((await handleInvite(req(null, { raw: "{not json" }))).status).toBe(422);
  });

  it("never trusts client-provided status or consent beyond the explicit checkbox", async () => {
    await handleInvite(req({ ...validInvite(), status: "invited", consentRecords: { marketingUpdates: { granted: true } } }));
    const stored = invites.records.get(requestIdForEmail("owner@example.com"));
    expect(stored?.status).toBe("pending");
    expect(stored?.consentRecords.marketingUpdates.granted).toBe(false);
  });
});

describe("POST /api/contact", () => {
  const msg = () => ({ name: "Asha", email: "asha@example.com", topic: "general", message: "I'd like to know more about pilots.", privacyAcknowledged: true, startedAt: Date.now() - 30_000 });

  it("stores a valid message", async () => {
    const res = await handleContact(req(msg()));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe(CONTACT_SUCCESS_MESSAGE);
    expect(contacts.records).toHaveLength(1);
  });

  it("returns 503 when storage is unavailable", async () => {
    __setBackendForTests({ kind: "unavailable", reason: "test" });
    expect((await handleContact(req(msg()))).status).toBe(503);
  });
});

describe("client IP extraction", () => {
  const withXff = (xff: string) => new Request("http://x/", { headers: { "x-forwarded-for": xff } });
  it("uses the first hop by default and the second-to-last behind Google load balancers", async () => {
    const { clientIp } = await import("@/lib/server/http");
    expect(clientIp(withXff("1.1.1.1, 2.2.2.2"))).toBe("1.1.1.1");
    vi.stubEnv("CLIENT_IP_MODE", "gcp");
    expect(clientIp(withXff("6.6.6.6, 1.1.1.1, 35.0.0.1"))).toBe("1.1.1.1");
    vi.unstubAllEnvs();
  });
});
