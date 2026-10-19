import { describe, expect, it } from "vitest";
import { addDays, revisionReminderIcs } from "@/lib/tools/ics";
import { tidyTable } from "@/components/resources/ImportPanel";
import { buildDataset, parseTable } from "@/lib/tools/classAnalysis";

describe("revision reminder (.ics)", () => {
  const ics = revisionReminderIcs({ testDate: "2026-11-02", testName: "Unit test 4", focus: ["Optics", "Waves, sound"], uid: "abc", now: new Date("2026-10-19T10:00:00Z") });
  it("is a valid calendar with CRLF lines and an alarm", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("UID:abc@heramb.study");
  });
  it("schedules 18:00 IST the day before the test", () => {
    expect(ics).toContain("DTSTART:20261101T123000Z");
    expect(ics).toContain("DTEND:20261101T131500Z");
  });
  it("escapes commas in topic names", () => {
    expect(ics).toContain("Waves\\, sound");
  });
  it("addDays crosses month ends", () => {
    expect(addDays("2026-10-30", 7)).toBe("2026-11-06");
  });
});

describe("tidyTable", () => {
  it("turns a raw platform export into something the analyser accepts", () => {
    const raw = [
      "Unit Test 3 — Results",
      "S.No,Roll No,Student Name,Mobile,Kinematics,Laws of motion,Total,Rank",
      "1,R01,Asha,9876543210,14,9,23,2",
      "2,R02,Ravi,9876500000,18,12,30,1",
    ].join("\n");
    expect(buildDataset(parseTable(raw)).dataset).toBeNull();
    const t = tidyTable(raw);
    expect(t.changed).toBe(true);
    expect(t.text).not.toMatch(/Asha|9876|Rank/);
    const ds = buildDataset(parseTable(t.text)).dataset;
    expect(ds?.topics.map((x) => x.name)).toEqual(["Kinematics", "Laws of motion"]);
    expect(ds?.students.length).toBe(2);
  });
  it("leaves an already-clean table alone", () => {
    const clean = "Roll no\tKinematics\nMAX\t20\nR01\t14";
    expect(tidyTable(clean)).toMatchObject({ changed: false, text: clean });
  });
});

describe("parseTable with a title row", () => {
  it("detects tabs even when the first line has no delimiter", () => {
    const rows = parseTable("Unit Test 3\nRoll No\tKinematics\nR01\t14");
    expect(rows[1]).toEqual(["Roll No", "Kinematics"]);
  });
});
