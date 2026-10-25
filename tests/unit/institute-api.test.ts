import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __setBackendForTests } from "@/lib/server/backend";
import { MemoryContactStore, MemoryInstituteStore, MemoryInviteStore, MemoryPilotStore, MemoryRateLimiter } from "@/lib/server/memoryBackend";
import {
  handleAdminDelete,
  handleAdminList,
  handleAdminLogin,
  handleAdminPatch,
  handleDigestCron,
  handleDigestStop,
  handleInstituteJoin,
  handleInstituteStats,
  handlePublicStats,
  handleUsageEvents,
  handleValueFeedback,
  handleShareSummary,
} from "@/lib/server/instituteHandlers";
import { signSession, verifySession, passwordMatches } from "@/lib/server/adminAuth";
import { signToken, clearDevOutbox, devOutbox } from "@/lib/server/email";

let ip = 0;
let institutes: MemoryInstituteStore;
const H = (extra: Record<string, string> = {}) => ({ "content-type": "application/json", host: "localhost:3000", origin: "http://localhost:3000", "x-forwarded-for": `10.7.${Math.floor(++ip / 250)}.${ip % 250}`, ...extra });
const post = (path: string, body: unknown, extra: Record<string, string> = {}, method = "POST") => new Request(`http://localhost:3000${path}`, { method, headers: H(extra), body: JSON.stringify(body) });

const join = (over: Record<string, unknown> = {}) => ({
  instituteName: "Sunrise Classes",
  city: "Prayagraj",
  institutionType: "coaching",
  contactName: "Mr Sharma",
  role: "owner",
  phone: "+91 98765 43210",
  email: "owner@sunrise.example",
  weeklyDigest: true,
  source: "meeting",
  privacyAcknowledged: true,
  startedAt: Date.now() - 60_000,
  website: "",
  ...over,
});

beforeEach(() => {
  institutes = new MemoryInstituteStore();
  __setBackendForTests({ kind: "memory", invites: new MemoryInviteStore(), contacts: new MemoryContactStore(), pilots: new MemoryPilotStore(), institutes, limiter: new MemoryRateLimiter() });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("OWNER_DASHBOARD_PASSWORD", "correct horse battery");
  vi.stubEnv("FOUNDING_CAP", "2");
  vi.stubEnv("PUBLIC_STATS_MIN", "1");
  // Developer tools on (non-production preview) → emails are captured in the dev inbox.
  vi.stubEnv("HERAMB_DEV_TOOLS", "true");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  vi.stubEnv("RESEND_API_KEY", "");
  clearDevOutbox();
});
afterEach(() => {
  __setBackendForTests(null);
  vi.unstubAllEnvs();
});

async function newInstitute(over: Record<string, unknown> = {}) {
  const res = await handleInstituteJoin(post("/api/institutes", join(over)));
  expect(res.status).toBe(201);
  return (await res.json()) as { code: string; seat: number | null; seatLabel: string | null };
}

describe("founding institute registration", () => {
  it("issues a code and real, limited founding seats", async () => {
    const a = await newInstitute();
    const b = await newInstitute({ instituteName: "Second" });
    const c = await newInstitute({ instituteName: "Third" });
    expect(a.code).toMatch(/^HRB-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect([a.seat, b.seat, c.seat]).toEqual([1, 2, null]);
    expect(a.seatLabel).toBe("#01 of 2");
    const stored = await institutes.get(a.code);
    expect(stored?.weeklyDigest.granted).toBe(true);
    expect(stored?.phone).toBe("+919876543210");
  });

  it("validates: contact needed, digest needs email, honeypot, origin", async () => {
    const r1 = await handleInstituteJoin(post("/api/institutes", join({ phone: "", email: "" })));
    expect((await r1.json()).error.fieldErrors.phone).toMatch(/phone \/ WhatsApp number or an email/);
    const r2 = await handleInstituteJoin(post("/api/institutes", join({ email: "", weeklyDigest: true })));
    expect((await r2.json()).error.fieldErrors.email).toMatch(/needs an email/);
    expect((await handleInstituteJoin(post("/api/institutes", join({ website: "x" })))).status).toBe(400);
    expect((await handleInstituteJoin(post("/api/institutes", join(), { origin: "https://evil.example" }))).status).toBe(403);
  });
});

describe("usage ledger → seven metrics", () => {
  it("records anonymous counts and shows them on the institute dashboard", async () => {
    const { code } = await newInstitute();
    const teacher = { code, device: "teacherdevice0001", role: "teacher" };
    expect((await handleUsageEvents(post("/api/events", { ...teacher, events: [{ type: "analysis_real" }, { type: "links_created", n: 30 }, { type: "links_shared", n: 30 }] }))).status).toBe(202);
    for (let s = 0; s < 3; s++) {
      await handleUsageEvents(post("/api/events", { code, device: `studentdevice000${s}`, role: "student", events: [{ type: "report_opened" }, { type: "report_saved" }] }));
    }
    await handleValueFeedback(post("/api/institutes/feedback", { code, minutes: "30", helped: ["weak_chapters"], note: "Found Optics gap" }));

    const res = await handleInstituteStats(post("/api/institutes/stats", { code: code.toLowerCase().replace(/-/g, " ") }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.institute).toMatchObject({ name: "Sunrise Classes", seat: 1, weeklyDigest: true });
    expect(body.institute.phone).toBeUndefined();
    expect(body.institute.email).toBeUndefined();
    const met = Object.fromEntries(body.metrics.metrics.map((m: { key: string; met: boolean }) => [m.key, m.met]));
    expect(met).toMatchObject({ activation: true, distribution: true, engagement: true, value: true, adoption: false, repeat: false, retention: false });
    expect(body.metrics.totals.report_opened).toBe(3);
    expect(body.metrics.studentDevices).toBe(3);
    expect(body.metrics.teacherDevices).toBe(1);
    const stored = await institutes.get(code);
    expect(stored?.activatedAt).toBeInstanceOf(Date);
  });

  it("never counts unknown codes or code-less events, and never errors to the client", async () => {
    const res = await handleUsageEvents(post("/api/events", { code: "HRB-2222-2222", device: "anydevice00000001", role: "teacher", events: [{ type: "analysis_real" }] }));
    expect(res.status).toBe(202);
    const anon = await handleUsageEvents(post("/api/events", { device: "anydevice00000001", role: "teacher", events: [{ type: "analysis_real" }] }));
    expect(anon.status).toBe(202);
    expect((await institutes.totals()).analysesReal).toBe(0);
    expect((await handleUsageEvents(post("/api/events", { device: "x", role: "teacher", events: [] }))).status).toBe(422);
  });

  it("can't be pumped: single actions are clamped and roles can't send the other side's events", async () => {
    const { code } = await newInstitute();
    await handleUsageEvents(post("/api/events", { code, device: "pumpdevice000000001", role: "teacher", events: [{ type: "analysis_real", n: 500 }, { type: "analysis_real", n: 500 }, { type: "report_saved", n: 9 }] }));
    await handleUsageEvents(post("/api/events", { code, device: "pumpdevice000000002", role: "student", events: [{ type: "report_opened", n: 500 }, { type: "links_shared", n: 400 }] }));
    const stats = await (await handleInstituteStats(post("/api/institutes/stats", { code }))).json();
    expect(stats.metrics.totals.analysis_real).toBe(2);
    expect(stats.metrics.totals.report_saved).toBe(0);
    expect(stats.metrics.totals.report_opened).toBe(1);
    expect(stats.metrics.totals.links_shared).toBe(0);
  });

  it("deleting the most recent sign-up releases its founding seat", async () => {
    const before = (await institutes.totals()).foundingTaken;
    const { code } = await newInstitute();
    expect((await institutes.totals()).foundingTaken).toBe(before + 1);
    await institutes.remove(code);
    expect((await institutes.totals()).foundingTaken).toBe(before);
  });

  it("stats for an unknown or malformed code", async () => {
    expect((await handleInstituteStats(post("/api/institutes/stats", { code: "HRB-2222-2222" }))).status).toBe(404);
    expect((await handleInstituteStats(post("/api/institutes/stats", { code: "nope" }))).status).toBe(422);
  });

  it("public stats stay hidden below the threshold and show real totals above it", async () => {
    vi.stubEnv("PUBLIC_STATS_MIN", "2");
    await newInstitute();
    expect((await (await handlePublicStats()).json()).show).toBe(false);
    await newInstitute({ instituteName: "Two" });
    const body = await (await handlePublicStats()).json();
    expect(body.show).toBe(true);
    expect(body.totals.institutes).toBe(2);
  });
});

describe("owner dashboard", () => {
  it("is invisible without a password configured", async () => {
    vi.stubEnv("OWNER_DASHBOARD_PASSWORD", "");
    expect((await handleAdminLogin(post("/api/admin/session", { password: "x" }))).status).toBe(404);
    expect((await handleAdminList(new Request("http://localhost:3000/api/admin/institutes", { headers: H() }))).status).toBe(404);
  });

  it("signs in, lists contacts + metrics, updates CRM fields and deletes on request", async () => {
    const { code } = await newInstitute();
    expect((await handleAdminLogin(post("/api/admin/session", { password: "wrong password!!" }))).status).toBe(401);
    const login = await handleAdminLogin(post("/api/admin/session", { password: "correct horse battery" }));
    const cookie = login.headers.get("set-cookie")!;
    expect(cookie).toMatch(/heramb_owner=.+; Path=\/; HttpOnly; SameSite=Strict/);
    const session = cookie.split(";")[0]!;

    expect((await handleAdminList(new Request("http://localhost:3000/api/admin/institutes", { headers: H() }))).status).toBe(401);
    const list = await (await handleAdminList(new Request("http://localhost:3000/api/admin/institutes", { headers: H({ cookie: session }) }))).json();
    expect(list.institutes[0]).toMatchObject({ code, phone: "+919876543210", email: "owner@sunrise.example" });
    expect(list.institutes[0].metrics.metrics).toHaveLength(7);

    const patch = await handleAdminPatch(post("/api/admin/institutes", { code, notes: "Met on Tuesday", nextFollowUp: "2026-10-26", status: "active" }, { cookie: session }, "PATCH"));
    expect(patch.status).toBe(200);
    expect((await institutes.get(code))?.notes).toBe("Met on Tuesday");

    expect((await handleAdminDelete(post("/api/admin/institutes", { code }, { cookie: session }, "DELETE"))).status).toBe(422);
    expect((await handleAdminDelete(post("/api/admin/institutes", { code, confirm: true }, { cookie: session }, "DELETE"))).status).toBe(200);
    expect(await institutes.get(code)).toBeNull();
  });

  it("sessions expire and break when the password changes", () => {
    const s = signSession(Date.now())!;
    expect(verifySession(s)).toBe(true);
    expect(verifySession(s, Date.now() + 13 * 3600 * 1000)).toBe(false);
    expect(verifySession(s, Date.now(), { OWNER_DASHBOARD_PASSWORD: "a different password" })).toBe(false);
    expect(verifySession("123.abc")).toBe(false);
    expect(passwordMatches("correct horse battery")).toBe(true);
    expect(passwordMatches("correct horse batter")).toBe(false);
  });
});

describe("weekly digest", () => {
  it("cron needs the secret, emails opted-in institutes only, and one-click stop works", async () => {
    vi.stubEnv("CRON_SECRET", "a-long-cron-secret-value");
    const { code } = await newInstitute();
    await newInstitute({ instituteName: "No digest", weeklyDigest: false });
    expect((await handleDigestCron(new Request("http://localhost:3000/api/cron/digest"))).status).toBe(404);
    const res = await handleDigestCron(new Request("http://localhost:3000/api/cron/digest", { headers: { authorization: "Bearer a-long-cron-secret-value" } }));
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, sent: 1, skipped: 1 });
    const digest = devOutbox().find((m) => m.subject.includes("your week"));
    expect(digest?.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(digest?.text).toMatch(/Programme checklist: 0 of 7/);

    const t = signToken("digest", code)!;
    const bad = await handleDigestStop(new Request(`http://localhost:3000/api/institutes/digest?id=${code}&t=wrongtokenwrongtokenwrong`, { method: "POST" }));
    expect(bad.status).toBe(422);
    const stop = await handleDigestStop(new Request(`http://localhost:3000/api/institutes/digest?id=${code}&t=${t}`, { method: "POST" }));
    expect(stop.status).toBe(200);
    expect((await institutes.get(code))?.weeklyDigest.withdrawnAt).toBeInstanceOf(Date);
    const again = await (await handleDigestCron(new Request("http://localhost:3000/api/cron/digest", { headers: { authorization: "Bearer a-long-cron-secret-value" } }))).json();
    expect(again.sent).toBe(0);
  });

  it("welcome + owner emails are prepared on registration", async () => {
    vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "founder@heramb.example");
    await newInstitute();
    await new Promise((r) => setTimeout(r, 10));
    const subjects = devOutbox().map((m) => m.subject);
    expect(subjects.some((s) => /Founding institute #01 of 2/.test(s))).toBe(true);
    expect(subjects.some((s) => /New founding institute: Sunrise Classes/.test(s))).toBe(true);
  });
});

describe("test day at sign-up", () => {
  it("stores the test day and schedules the first follow-up", async () => {
    const res = await handleInstituteJoin(post("/api/institutes", join({ testDay: 0, phone: "9876500001" })));
    expect(res.status).toBe(201);
    const { code } = (await res.json()) as { code: string };
    const rec = await institutes.get(code);
    expect(rec?.testDay).toBe(0);
    expect(rec?.nextFollowUp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${rec!.nextFollowUp}T00:00:00Z`).getUTCDay()).toBe(1); // Monday, the day after a Sunday test
  });
});


describe("batch results shared with the head", () => {
  const summary = (over: Record<string, unknown> = {}) => ({
    batch: "11 JEE A", test: "Weekly 6", date: "2026-10-20", students: 30, average: 55,
    topics: [{ n: "Optics", avg: 38, att: 30, below: 17 }, { n: "Waves", avg: 71, att: 29, below: 6 }], ...over,
  });
  it("stores aggregates only, replaces re-shares, and shows them on the dashboard", async () => {
    const { code } = await newInstitute();
    expect((await handleShareSummary(post("/api/institutes/summaries", { code, summary: summary() }))).status).toBe(200);
    expect((await handleShareSummary(post("/api/institutes/summaries", { code, summary: summary({ average: 56 }) }))).status).toBe(200);
    const stats = await (await handleInstituteStats(post("/api/institutes/stats", { code }))).json();
    expect(stats.summaries).toHaveLength(1);
    expect(stats.summaries[0].average).toBe(56);
  });
  it("refuses anything that could carry student data, and bad counts", async () => {
    const { code } = await newInstitute();
    const sneaky = summary({ topics: [{ n: "Optics", avg: 38, att: 30, below: 17, students: ["R01 Asha"] }] });
    expect((await handleShareSummary(post("/api/institutes/summaries", { code, summary: sneaky }))).status).toBe(422);
    expect((await handleShareSummary(post("/api/institutes/summaries", { code, summary: summary({ names: ["Asha"] }) }))).status).toBe(422);
    expect((await handleShareSummary(post("/api/institutes/summaries", { code, summary: summary({ topics: [{ n: "Optics", avg: 38, att: 10, below: 17 }] }) }))).status).toBe(422);
    expect((await handleShareSummary(post("/api/institutes/summaries", { code: "HRB-2222-2222", summary: summary() }))).status).toBe(404);
  });
});


describe("city benchmark on the dashboard", () => {
  it("shows the city average only once 4 other institutes in the city share the chapter", async () => {
    const codes: string[] = [];
    for (let i = 0; i < 5; i++) codes.push((await newInstitute({ city: "Prayagraj" })).code);
    const share = (code: string, avg: number) =>
      handleShareSummary(post("/api/institutes/summaries", { code, summary: { batch: "11 A", test: "W1", date: new Date().toISOString().slice(0, 10), students: 20, average: avg, topics: [{ n: "Optics", avg, att: 20, below: 5 }] } }));
    for (const [i, c] of codes.slice(0, 4).entries()) await share(c, 40 + i * 10);
    let stats = await (await handleInstituteStats(post("/api/institutes/stats", { code: codes[0] }))).json();
    expect(stats.benchmark).toEqual({}); // only 3 others
    await share(codes[4]!, 80);
    stats = await (await handleInstituteStats(post("/api/institutes/stats", { code: codes[0] }))).json();
    expect(stats.benchmark).toEqual({ optics: { avg: 65, institutes: 4 } });
  });
});

import { launchReadiness } from "@/lib/server/instituteHandlers";

describe("launch readiness", () => {
  it("reports booleans only and flags missing production settings", () => {
    const items = launchReadiness({ kind: "unavailable", reason: "x" } as never, { CRON_SECRET: "short" });
    expect(items.find((i) => i.key === "storage")).toMatchObject({ ok: false, critical: true });
    expect(items.find((i) => i.key === "cron")?.ok).toBe(false);
    expect(JSON.stringify(items)).not.toMatch(/short/);
  });
});
