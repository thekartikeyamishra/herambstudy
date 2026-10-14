// @vitest-environment jsdom
/**
 * Regression tests for loopholes found in the v0.6 edge-case audit.
 * Each test names the problem it guards against.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadHistory, saveReport, STUDENT_KEY } from "@/lib/client/studentStore";
import { loadWorkspace, saveWorkspace, type Workspace } from "@/lib/client/workspace";
import { __setBackendForTests } from "@/lib/server/backend";
import { handleContact, handleInvite, handlePilot } from "@/lib/server/handlers";
import { submittedTooFast } from "@/lib/server/http";
import { MemoryContactStore, MemoryInviteStore, MemoryPilotStore, MemoryRateLimiter } from "@/lib/server/memoryBackend";
import { analyseClass, buildDataset, checkTextSize, parseTable, sampleCsv } from "@/lib/tools/classAnalysis";
import { buildReports, decodeReport, encodeReport } from "@/lib/tools/studentReport";
import { contactMessageSchema, inviteRequestSchema, pilotApplicationSchema } from "@/lib/validation/schemas";

const parse = (csv: string) => buildDataset(parseTable(csv));
const messages = (csv: string) => parse(csv).issues.map((i) => i.message).join(" | ");

describe("class sheet: silent mis-analysis is now an explicit error", () => {
  it("a Total/Average row at the bottom is not counted as a student", () => {
    expect(parse("Roll,A,B\nMAX,10,10\nR1,5,6\nR2,7,8\nTotal,12,14").dataset).toBeNull();
    expect(messages("Roll,A\nMAX,10\nR1,5\nClass average,5")).toMatch(/summary/);
    // Exactly one message for the summary row (no per-cell noise).
    expect(parse("Roll,A,B\nMAX,10,10\nR1,5,6\nTotal,12,14").issues).toHaveLength(1);
  });

  it("a Total / Percentage / Rank column is not counted as a topic", () => {
    for (const col of ["Total", "Percentage", "%", "Rank", "Grade", "Marks obtained"]) {
      expect(messages(`Roll,A,${col}\nMAX,10,100\nR1,5,50`)).toMatch(/total or result column/);
    }
  });

  it("a second ID column (Roll No, Name, Section…) is not analysed as marks", () => {
    for (const col of ["Roll No", "Name", "Section", "Adm. No.", "S.No", "Registration No"]) {
      expect(messages(`Student,${col},Physics\nMAX,100,50\nAsha,1,30`)).toMatch(/looks like an ID column/);
    }
  });

  it("Indian max-marks labels (M.M., Full marks, Max. Marks) are recognised", () => {
    for (const label of ["M.M.", "MM", "Full marks", "Max. Marks", "Maximum marks", "F.M."]) {
      const r = parse(`Roll,A\n${label},20\nR1,15`);
      expect(r.issues).toEqual([]);
      expect(r.dataset?.topics[0]?.max).toBe(20);
      expect(r.dataset?.students.map((s) => s.id)).toEqual(["R1"]);
    }
  });

  it("a blank roll number is an error, not an invented 'Student 1'", () => {
    expect(messages("Roll,A\nMAX,10\n,5")).toMatch(/no roll number/);
  });

  it("only plain decimals are numbers (no hex, exponents or Infinity)", () => {
    for (const v of ["0x10", "1e1", "Infinity", "12abc", "1.2.3", "½"]) {
      expect(messages(`Roll,A\nMAX,100\nR1,${v}`)).toMatch(/isn't a number/);
    }
    const ok = parse("Roll,A,B,C\nMAX,20,20,20\nR1,7.5,+3,.5").dataset!;
    expect(ok.students[0]!.scores).toEqual([7.5, 3, 0.5]);
    expect(parse("Roll;A\nMAX;20\nR1;7,5").dataset!.students[0]!.scores).toEqual([7.5]); // decimal comma
  });

  it("'75%' is accepted and converted against the topic maximum", () => {
    expect(parse("Roll,A\nR1,75%").dataset!.students[0]!.scores).toEqual([75]);
    expect(parse("Roll,A\nMAX,20\nR1,75%").dataset!.students[0]!.scores).toEqual([15]);
    expect(messages("Roll,A\nR1,120%")).toMatch(/between 0% and 100%/);
    expect(messages("Roll,A\nMAX,20%\nR1,5")).toMatch(/Maximum marks/);
  });

  it("pasted text over 1 MB is refused before parsing", () => {
    expect(checkTextSize("x".repeat(1_000_001))).toMatch(/limit is 1 MB/);
    expect(checkTextSize(sampleCsv())).toBeNull();
  });
});

describe("tracker storage: nothing unloadable is ever written", () => {
  beforeEach(() => localStorage.clear());
  const ws = (raw: string): Workspace => ({
    version: 1,
    classes: [{ id: "class0001", name: "C", subject: "", createdAt: "", tests: [{ id: "test00001", name: "T", date: "2026-01-01", raw, savedAt: "" }] }],
  });

  it("a test over 1 MB is rejected and existing data is untouched", () => {
    expect(saveWorkspace(ws(sampleCsv()))).toEqual({ ok: true });
    expect(saveWorkspace(ws("x".repeat(1_000_001)))).toEqual({ ok: false, reason: "invalid" });
    expect(loadWorkspace()).toMatchObject({ ok: true, workspace: ws(sampleCsv()) });
  });

  it("empty names are rejected", () => {
    const bad = ws(sampleCsv());
    bad.classes[0]!.name = "   ";
    expect(saveWorkspace(bad)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("student history: one bad entry doesn't wipe the rest", () => {
  beforeEach(() => localStorage.clear());
  it("keeps valid reports when another entry is damaged", () => {
    const d = parse("Roll,A\nMAX,10\nR1,5\nR2,9").dataset!;
    const [r1, r2] = buildReports(d, analyseClass(d), { institute: "I", test: "T", date: "2026-01-01" });
    saveReport(r1!);
    saveReport(r2!);
    const stored = JSON.parse(localStorage.getItem(STUDENT_KEY)!);
    stored.reports[0].report.p = ["broken"];
    localStorage.setItem(STUDENT_KEY, JSON.stringify(stored));
    expect(loadHistory().history.reports.map((x) => x.report.s)).toEqual(["R2"]);
  });
});

describe("report links survive what chat apps do to them", () => {
  it("ignores trailing punctuation and spaces", () => {
    const d = parse("Roll,A\nMAX,10\nR1,5").dataset!;
    const r = buildReports(d, analyseClass(d), { institute: "I", test: "T", date: "2026-01-01" })[0]!;
    const frag = encodeReport(r);
    for (const tail of [".", ").", " ", "!", "%20"]) expect(decodeReport(`#${frag}${tail}`)).toEqual(r);
    expect(decodeReport(`#${frag.slice(0, -5)}`)).toBeNull(); // truncated link still rejected
  });
});

describe("forms: single-line fields reject line breaks", () => {
  const invite = { email: "a@b.co", role: "student", country: "IN", useCase: "other", privacyAcknowledged: true };
  it("names, institution and city can't contain line breaks or tabs", () => {
    expect(inviteRequestSchema.safeParse({ ...invite, name: "Ravi\r\nBcc: x@y.z" }).success).toBe(false);
    expect(inviteRequestSchema.safeParse({ ...invite, name: "Ravi Kumar" }).success).toBe(true);
    expect(contactMessageSchema.safeParse({ name: "A\tB", email: "a@b.co", topic: "general", message: "Line one\nLine two is fine here.", privacyAcknowledged: true }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ name: "A B", email: "a@b.co", topic: "general", message: "Line one\nLine two is fine here.", privacyAcknowledged: true }).success).toBe(true);
    const pilot = { contactName: "A", role: "owner", email: "a@b.co", institutionType: "school", instituteName: "X School", city: "Lucknow", country: "IN", studentCount: "under_50", exams: ["neet"], testFrequency: "weekly", startWindow: "exploring", privacyAcknowledged: true };
    expect(pilotApplicationSchema.safeParse(pilot).success).toBe(true);
    for (const k of ["instituteName", "city", "contactName", "currentTools"]) {
      expect(pilotApplicationSchema.safeParse({ ...pilot, [k]: "Line\nbreak" }).success).toBe(false);
    }
    expect(pilotApplicationSchema.safeParse({ ...pilot, notes: "Multi\nline notes are fine" }).success).toBe(true);
  });
});

describe("anti-spam: the timing field can't be skipped", () => {
  beforeEach(() => {
    __setBackendForTests({ kind: "memory", invites: new MemoryInviteStore(), contacts: new MemoryContactStore(), pilots: new MemoryPilotStore(), limiter: new MemoryRateLimiter() });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => __setBackendForTests(null));
  let ip = 0;
  const req = (body: unknown) =>
    new Request("http://localhost:3000/api/x", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", host: "localhost:3000", "x-forwarded-for": `10.66.0.${++ip}` },
      body: JSON.stringify(body),
    });

  it("treats a missing timing field like a bot submission", async () => {
    expect(submittedTooFast(undefined)).toBe(true);
    const invite = { email: "t@example.com", role: "student", country: "IN", useCase: "other", privacyAcknowledged: true };
    expect((await handleInvite(req(invite))).status).toBe(429);
    expect((await handleInvite(req({ ...invite, startedAt: Date.now() - 30_000 }))).status).toBe(200);
    expect((await handleContact(req({ name: "A", email: "a@b.co", topic: "general", message: "Hello there friend.", privacyAcknowledged: true }))).status).toBe(429);
    const pilot = { contactName: "A", role: "owner", email: "p@b.co", institutionType: "school", instituteName: "X School", city: "Lucknow", country: "IN", studentCount: "under_50", exams: ["neet"], testFrequency: "weekly", startWindow: "exploring", privacyAcknowledged: true };
    expect((await handlePilot(req(pilot))).status).toBe(429);
  });
});
