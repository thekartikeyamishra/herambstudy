// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  emptyWorkspace,
  loadWorkspace,
  MAX_WORKSPACE_BYTES,
  mergeWorkspaces,
  newId,
  parseBackup,
  saveWorkspace,
  todayIso,
  WORKSPACE_KEY,
  type Workspace,
} from "@/lib/client/workspace";
import { buildDataset, parseTable, sampleCsv, sampleFollowUpCsv } from "@/lib/tools/classAnalysis";
import { sortTests, studentTermReports, trackClass } from "@/lib/tools/tracker";

const ds = (csv: string) => buildDataset(parseTable(csv)).dataset!;

describe("trackClass", () => {
  const t1 = { id: "a", name: "Unit 1", date: "2026-07-01", dataset: ds(["Roll,Algebra,Geometry", "MAX,10,10", "R1,3,8", "R2,4,9", "R3,9,AB"].join("\n")) };
  const t2 = { id: "b", name: "Unit 2", date: "2026-08-01", dataset: ds(["roll,algebra,Geometry,Stats", "MAX,10,10,10", "r1,4,8,6", "R2,7,3,6", "R3,9,9,2"].join("\n")) };
  const t3 = { id: "c", name: "Unit 3", date: "2026-09-01", dataset: ds(["Roll,Algebra,Stats", "MAX,10,10", "R1,2,7", "R2,8,6", "R3,AB,3"].join("\n")) };
  // Pass out of order to check sorting by date.
  const track = trackClass([t3, t1, t2]);

  it("orders tests by date and summarises each", () => {
    expect(track.tests.map((t) => t.name)).toEqual(["Unit 1", "Unit 2", "Unit 3"]);
    expect(track.tests[0]!.students).toBe(3);
  });

  it("builds topic series across tests, matching names case-insensitively", () => {
    const algebra = track.topics.find((t) => t.name === "Algebra")!;
    expect(algebra.series).toEqual([53, 67, 50]); // R3 absent in Unit 3 → average of R1, R2
    expect(algebra.lastChange).toBe(-17);
    const stats = track.topics.find((t) => t.name === "Stats")!;
    expect(stats.series).toEqual([null, 47, 53]);
    const geometry = track.topics.find((t) => t.name === "Geometry")!;
    expect(geometry.latest).toBeNull();
    expect(track.topics.map((t) => t.name)).toEqual(["Algebra", "Geometry", "Stats"]);
  });

  it("finds persistent gaps, skipping absences without breaking a run", () => {
    // R1 Algebra: 30, 40, 20 → 3 in a row. R3 Stats: 20, 30 → 2. R2 Geometry: 90 then 30 → only 1.
    expect(track.persistent).toEqual(
      expect.arrayContaining([
        { student: "R1", topic: "Algebra", tests: 3 },
        { student: "R3", topic: "Stats", tests: 2 },
      ]),
    );
    expect(track.persistent.find((p) => p.student === "R2" && p.topic === "Geometry")).toBeUndefined();
    expect(track.persistent[0]).toEqual({ student: "R1", topic: "Algebra", tests: 3 });
  });

  it("compares the last two tests", () => {
    expect(track.latestComparison?.topics.map((t) => t.name.toLowerCase()).sort()).toEqual(["algebra", "stats"]);
    expect(trackClass([t1]).latestComparison).toBeNull();
  });

  it("works on the fictional sample pair", () => {
    const s = trackClass([
      { id: "x", name: "Test 1", date: "2026-08-01", dataset: ds(sampleCsv()) },
      { id: "y", name: "Follow-up", date: "2026-08-22", dataset: ds(sampleFollowUpCsv()) },
    ]);
    expect(s.topics).toHaveLength(6);
    expect(s.latestComparison!.totals.closed).toBeGreaterThan(0);
    expect(sortTests([{ date: "2026-02-01", name: "b" }, { date: "2026-01-01", name: "a" }])[0]!.name).toBe("a");
  });
});

describe("workspace storage", () => {
  const sample = (): Workspace => ({
    version: 1,
    classes: [
      {
        id: "class0001",
        name: "Class 11 A",
        subject: "Chemistry",
        createdAt: "2026-10-14T10:00:00Z",
        tests: [{ id: "test00001", name: "Unit 1", date: "2026-10-01", raw: sampleCsv(), savedAt: "2026-10-14T10:00:00Z" }],
      },
    ],
  });

  beforeEach(() => localStorage.clear());

  it("round-trips through localStorage", () => {
    expect(loadWorkspace().workspace).toEqual(emptyWorkspace());
    expect(saveWorkspace(sample())).toEqual({ ok: true });
    expect(loadWorkspace()).toEqual({ ok: true, workspace: sample() });
  });

  it("treats corrupted data as corrupt without throwing", () => {
    localStorage.setItem(WORKSPACE_KEY, "{not json");
    expect(loadWorkspace()).toMatchObject({ ok: false, reason: "corrupt" });
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ version: 99, classes: [] }));
    expect(loadWorkspace()).toMatchObject({ ok: false, reason: "corrupt" });
  });

  it("reports unavailable storage and refuses oversized workspaces", () => {
    expect(loadWorkspace(null)).toMatchObject({ ok: false, reason: "unavailable" });
    expect(saveWorkspace(sample(), null)).toEqual({ ok: false, reason: "unavailable" });
    const huge = sample();
    huge.classes[0]!.tests = Array.from({ length: 5 }, (_, i) => ({ id: `big${i}xxxxx`, name: `T${i}`, date: "2026-10-01", raw: "x".repeat(MAX_WORKSPACE_BYTES / 4), savedAt: "" }));
    expect(saveWorkspace(huge)).toEqual({ ok: false, reason: "too_large" });
  });

  it("reports quota errors", () => {
    const full = { setItem: () => { throw new DOMException("full", "QuotaExceededError"); }, getItem: () => null } as unknown as Storage;
    expect(saveWorkspace(sample(), full)).toEqual({ ok: false, reason: "quota" });
  });

  it("validates backups, including that every test still parses", () => {
    expect(parseBackup(JSON.stringify(sample()))).toMatchObject({ ok: true });
    expect(parseBackup("nope")).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ version: 1, classes: [{ id: "x" }] }))).toMatchObject({ ok: false });
    const bad = sample();
    bad.classes[0]!.tests[0]!.raw = "Roll,A\nR1,abc";
    expect(parseBackup(JSON.stringify(bad))).toMatchObject({ ok: false, message: expect.stringContaining("Unit 1") });
  });

  it("merges imports without overwriting existing classes", () => {
    const merged = mergeWorkspaces(sample(), sample());
    expect(merged.added).toBe(1);
    expect(merged.workspace.classes).toHaveLength(2);
    expect(merged.workspace.classes[1]!.id).not.toBe("class0001");
  });

  it("creates ids and local dates in the expected format", () => {
    expect(newId()).toMatch(/^[a-z0-9]{6,32}$/);
    expect(todayIso(new Date("2026-10-14T12:00:00Z"))).toMatch(/^2026-10-1[45]$/);
  });
});

describe("studentTermReports", () => {
  const a = { id: "a", name: "T1", date: "2026-07-01", dataset: ds(["Roll,Algebra,Geometry", "MAX,10,10", "R2,3,9", "R10,9,9"].join("\n")) };
  const b = { id: "b", name: "T2", date: "2026-08-01", dataset: ds(["Roll,Algebra,Geometry", "MAX,10,10", "R2,6,4", "R10,AB,9"].join("\n")) };
  const reports = studentTermReports([b, a]);

  it("produces one report per student, naturally sorted", () => {
    expect(reports.map((r) => r.student)).toEqual(["R2", "R10"]);
  });

  it("tracks first/latest/change per topic and classifies strengths, improvements and focus", () => {
    const r2 = reports[0]!;
    expect(r2.testsTaken).toBe(2);
    expect(r2.overall).toEqual([60, 50]);
    expect(r2.topics.find((t) => t.topic === "Algebra")).toEqual({ topic: "Algebra", first: 30, latest: 60, change: 30, attempts: 2 });
    expect(r2.improved).toEqual(["Algebra"]);
    expect(r2.focus).toEqual(["Geometry"]);
    const r10 = reports[1]!;
    expect(r10.topics.find((t) => t.topic === "Algebra")).toMatchObject({ latest: 90, change: null, attempts: 1 });
    expect(r10.strengths).toEqual(["Algebra", "Geometry"]);
  });
});
