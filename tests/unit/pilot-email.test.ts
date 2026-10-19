import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __setBackendForTests } from "@/lib/server/backend";
import { emailConfig, escapeHtml, inviteAcknowledgement, pilotOwnerAlert, signToken, verifyToken } from "@/lib/server/email";
import { handleEmailAction, handleInvite, handlePilot, PILOT_SUCCESS_MESSAGE } from "@/lib/server/handlers";
import { requestIdForEmail } from "@/lib/server/http";
import { MemoryContactStore, MemoryInstituteStore, MemoryInviteStore, MemoryPilotStore, MemoryRateLimiter } from "@/lib/server/memoryBackend";

const ORIGIN = "http://localhost:3000";
let ip = 0;
const SECRET = "x".repeat(40);

function post(path: string, body: unknown, opts: { contentType?: string; origin?: string | null; raw?: string } = {}) {
  const headers = new Headers({ "content-type": opts.contentType ?? "application/json", host: "localhost:3000", "x-forwarded-for": `10.9.0.${++ip}` });
  if (opts.origin !== null) headers.set("origin", opts.origin ?? ORIGIN);
  return new Request(`${ORIGIN}${path}`, { method: "POST", headers, body: opts.raw ?? JSON.stringify(body) });
}

const pilot = () => ({
  contactName: "Ravi Kumar",
  role: "owner",
  email: "Ravi@Example.com",
  phone: "+91 98765 43210",
  institutionType: "coaching",
  instituteName: "Sunrise Classes",
  city: "Lucknow",
  country: "IN",
  studentCount: "200_1000",
  exams: ["jee_main", "neet", "neet"],
  testFrequency: "weekly",
  startWindow: "next_3_months",
  priceComfort: "25_50",
  privacyAcknowledged: true,
  startedAt: Date.now() - 60_000,
});

let invites: MemoryInviteStore;
let pilots: MemoryPilotStore;

beforeEach(() => {
  invites = new MemoryInviteStore();
  pilots = new MemoryPilotStore();
  __setBackendForTests({ kind: "memory", invites, contacts: new MemoryContactStore(), pilots, institutes: new MemoryInstituteStore(), limiter: new MemoryRateLimiter() });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  __setBackendForTests(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/pilot", () => {
  it("stores a valid application with normalised email, phone and de-duplicated exams", async () => {
    const res = await handlePilot(post("/api/pilot", pilot()));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe(PILOT_SUCCESS_MESSAGE);
    expect(pilots.records).toHaveLength(1);
    const r = pilots.records[0]!;
    expect(r.email).toBe("ravi@example.com");
    expect(r.phone).toBe("+919876543210");
    expect(r.exams).toEqual(["jee_main", "neet"]);
    expect(r.status).toBe("new");
    expect(r.priceComfort).toBe("25_50");
    expect(r.institutionType).toBe("coaching");
  });

  it("requires institute, city, at least one exam and consent", async () => {
    const res = await handlePilot(post("/api/pilot", { ...pilot(), instituteName: "", city: "", exams: [], privacyAcknowledged: false }));
    expect(res.status).toBe(422);
    const errs = (await res.json()).error.fieldErrors;
    expect(Object.keys(errs)).toEqual(expect.arrayContaining(["instituteName", "city", "exams", "privacyAcknowledged"]));
    const noType = await handlePilot(post("/api/pilot", { ...pilot(), institutionType: "factory", email: "t@example.com" }));
    expect((await noType.json()).error.fieldErrors.institutionType).toBeTruthy();
    expect(pilots.records).toHaveLength(0);
  });

  it("rejects invalid phone numbers but accepts an empty one", async () => {
    expect((await handlePilot(post("/api/pilot", { ...pilot(), phone: "call me" }))).status).toBe(422);
    expect((await handlePilot(post("/api/pilot", { ...pilot(), phone: "", email: "b@example.com" }))).status).toBe(200);
  });

  it("is honest when storage is unavailable", async () => {
    __setBackendForTests({ kind: "unavailable", reason: "test" });
    expect((await handlePilot(post("/api/pilot", pilot()))).status).toBe(503);
  });

  it("sends the owner an alert only when email is configured", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await handlePilot(post("/api/pilot", pilot()));
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Heramb <hello@heramb.study>");
    vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@heramb.study");
    await handlePilot(post("/api/pilot", { ...pilot(), email: "second@example.com" }));
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchSpy.mock.calls[0]![1].body as string);
    expect(body.to).toEqual(["owner@heramb.study"]);
    expect(body.reply_to).toBe("second@example.com");
    expect(body.subject).toContain("Sunrise Classes");
  });
});

describe("signed email tokens", () => {
  it("are disabled without a long secret and verify only for the same purpose and id", () => {
    expect(signToken("confirm", "a".repeat(32))).toBeNull();
    vi.stubEnv("EMAIL_TOKEN_SECRET", SECRET);
    const id = "a".repeat(32);
    const t = signToken("confirm", id)!;
    expect(verifyToken("confirm", id, t)).toBe(true);
    expect(verifyToken("unsubscribe", id, t)).toBe(false);
    expect(verifyToken("confirm", "b".repeat(32), t)).toBe(false);
    expect(verifyToken("confirm", id, t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"))).toBe(false);
  });
});

describe("invite acknowledgement and double opt-in", () => {
  const invite = (marketingConsent: boolean, email = "learner@example.com") => ({
    email,
    role: "student",
    country: "IN",
    useCase: "exam_preparation",
    privacyAcknowledged: true,
    marketingConsent,
    startedAt: Date.now() - 60_000,
  });

  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "hello@heramb.study");
    vi.stubEnv("EMAIL_TOKEN_SECRET", SECRET);
  });

  it("emails a new requester once, with a confirm link only if they opted in", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await handleInvite(post("/api/invite", invite(true)));
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchSpy.mock.calls[0]![1].body as string);
    expect(body.text).toContain("/email/confirm?id=");
    expect(body.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

    // Duplicate submission: no second email.
    await handleInvite(post("/api/invite", invite(true)));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await handleInvite(post("/api/invite", invite(false, "other@example.com")));
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    const second = JSON.parse(fetchSpy.mock.calls[1]![1].body as string);
    expect(second.text).not.toContain("/email/confirm");
    expect(second.headers).toBeUndefined();
  });

  it("still succeeds when the email provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const res = await handleInvite(post("/api/invite", invite(true)));
    expect(res.status).toBe(200);
  });

  it("confirms only with a valid token and only if updates were requested", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await handleInvite(post("/api/invite", invite(true)));
    await handleInvite(post("/api/invite", invite(false, "noupdates@example.com")));
    const id = requestIdForEmail("learner@example.com");
    const good = signToken("confirm", id)!;

    expect((await handleEmailAction(post("/api/email/confirm", { id, t: "x".repeat(43) }), "confirm")).status).toBe(400);
    expect((await handleEmailAction(post("/api/email/confirm", { id, t: good }, { origin: "https://evil.example" }), "confirm")).status).toBe(403);

    const ok = await handleEmailAction(post("/api/email/confirm", { id, t: good }), "confirm");
    expect(ok.status).toBe(200);
    expect(invites.records.get(id)?.consentRecords.marketingUpdates.confirmedAt).toBeInstanceOf(Date);

    const other = requestIdForEmail("noupdates@example.com");
    const refused = await handleEmailAction(post("/api/email/confirm", { id: other, t: signToken("confirm", other)! }), "confirm");
    expect(refused.status).toBe(400);
    expect(invites.records.get(other)?.consentRecords.marketingUpdates.confirmedAt).toBeNull();
  });

  it("supports RFC 8058 one-click unsubscribe without an Origin header", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await handleInvite(post("/api/invite", invite(true)));
    const id = requestIdForEmail("learner@example.com");
    const t = signToken("unsubscribe", id)!;
    const req = post(`/api/email/unsubscribe?id=${id}&t=${t}`, null, {
      contentType: "application/x-www-form-urlencoded",
      origin: null,
      raw: "List-Unsubscribe=One-Click",
    });
    const res = await handleEmailAction(req, "unsubscribe");
    expect(res.status).toBe(200);
    expect(invites.records.get(id)?.consentRecords.marketingUpdates.withdrawnAt).toBeInstanceOf(Date);
  });

  it("returns 503 when signed links are not configured", async () => {
    vi.stubEnv("EMAIL_TOKEN_SECRET", "");
    const res = await handleEmailAction(post("/api/email/confirm", { id: "a".repeat(32), t: "x".repeat(43) }), "confirm");
    expect(res.status).toBe(503);
  });
});

describe("email templates", () => {
  it("escape user-supplied values in HTML", () => {
    expect(escapeHtml(`<script>"&'`)).toBe("&lt;script&gt;&quot;&amp;&#39;");
    const m = inviteAcknowledgement({ to: "a@b.co", name: "<b>x</b>", confirmUrl: null, unsubscribeUrl: null, oneClickUrl: null });
    expect(m.html).not.toContain("<b>x</b>");
    const alert = pilotOwnerAlert("o@b.co", {
      contactName: "<img src=x>", role: "owner", email: "a@b.co", phone: null, institutionType: "school", instituteName: "I", city: "C", country: "IN",
      studentCount: "under_50", exams: ["neet"], testFrequency: "weekly", currentTools: null, startWindow: "exploring",
      priceComfort: null, notes: null, privacyNoticeVersion: "v", status: "new", createdAt: new Date(),
    });
    expect(alert.html).not.toContain("<img src=x>");
  });

  it("reports configuration accurately", () => {
    expect(emailConfig()).toMatchObject({ sending: false, tokens: false });
  });
});
