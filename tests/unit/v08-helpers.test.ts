import { describe, expect, it } from "vitest";
import { normalisePhone, parsePhoneList, phoneFor } from "@/lib/tools/phoneList";
import { hindiParentNote, reportText } from "@/lib/i18n/report";
import { decodeReport, encodeReport, type StudentReport } from "@/lib/tools/studentReport";
import { qrPath, MAX_QR_CHARS } from "@/lib/client/qr";

describe("phone list", () => {
  it("normalises Indian numbers and rejects junk", () => {
    expect(normalisePhone("98765 43210")).toBe("919876543210");
    expect(normalisePhone("+91-98765-43210")).toBe("919876543210");
    expect(normalisePhone("09876543210")).toBe("919876543210");
    expect(normalisePhone("12345")).toBeNull();
    expect(normalisePhone("5876543210")).toBeNull();
  });
  it("parses roll + number lines in any common format, case-insensitively", () => {
    const { phones, bad } = parsePhoneList("R01 9876543210\nR02, +91 98765 43211\nR 03\t919876543212\nnonsense");
    expect(phoneFor(phones, "r01")).toBe("919876543210");
    expect(phoneFor(phones, "R02")).toBe("919876543211");
    expect(phoneFor(phones, "R 03")).toBe("919876543212");
    expect(bad).toEqual(["nonsense"]);
  });
});

describe("Hindi", () => {
  it("parent note names strong and focus topics", () => {
    const n = hindiParentNote({ strong: ["Optics"], focus: ["Kinematics", "Waves"] });
    expect(n).toContain("Optics");
    expect(n).toContain("Kinematics और Waves");
  });
  it("report text has the same keys in both languages", () => {
    expect(Object.keys(reportText("hi")).sort()).toEqual(Object.keys(reportText("en")).sort());
  });
  it("report links carry the language and old links still decode as English", () => {
    const base: StudentReport = { v: 1, i: "Gyan Classes", t: "Unit 1", d: "2026-10-20", s: "R01", n: ["Optics"], p: [40], a: [55] };
    expect(decodeReport(encodeReport({ ...base, l: "hi" }))?.l).toBe("hi");
    expect(decodeReport(encodeReport(base))?.l).toBeUndefined();
  });
});

describe("QR", () => {
  it("encodes typical links and refuses very long ones", () => {
    const q = qrPath(`https://herambstudy.vercel.app/r#${"a".repeat(600)}`);
    expect(q?.size).toBeGreaterThan(40);
    expect(q?.d.startsWith("M")).toBe(true);
    expect(qrPath("x".repeat(MAX_QR_CHARS + 1))).toBeNull();
  });
});

import { lastTestDate, nextFollowUpDate, testWeekStatus } from "@/lib/institute/testDay";

describe("test day follow-ups", () => {
  // 2026-10-25 is a Sunday.
  it("finds the last test day and the day after the next test", () => {
    expect(lastTestDate(0, "2026-10-25")).toBe("2026-10-25");
    expect(lastTestDate(0, "2026-10-28")).toBe("2026-10-25");
    expect(nextFollowUpDate(0, "2026-10-25")).toBe("2026-10-26");
    expect(nextFollowUpDate(0, "2026-10-26")).toBe("2026-10-26");
    expect(nextFollowUpDate(0, "2026-10-27")).toBe("2026-11-02");
  });
  it("says whether the latest test was analysed", () => {
    expect(testWeekStatus(null, null, "2026-10-26")).toBe("unknown");
    expect(testWeekStatus(0, "2026-10-26", "2026-10-27")).toBe("tested");
    expect(testWeekStatus(0, "2026-10-20", "2026-10-25")).toBe("due_today");
    expect(testWeekStatus(0, "2026-10-20", "2026-10-27")).toBe("awaiting");
    expect(testWeekStatus(0, "2026-10-20", "2026-10-29")).toBe("missed");
  });
});
