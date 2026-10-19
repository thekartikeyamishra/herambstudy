/**
 * Minimal RFC 5545 calendar file for a student's "revise before the next test" reminder.
 * Pure and dependency-free; opens in Google Calendar, Apple Calendar and Outlook.
 */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds lines to 75 octets as the spec requires (approximated by characters). */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i ? " " : "") + line.slice(i, i + 73));
  return parts.join("\r\n");
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * A 45-minute revision slot at 18:00 India time on the day before `testDate`
 * (YYYY-MM-DD), with a reminder 30 minutes before.
 */
export function revisionReminderIcs(opts: { testDate: string; testName: string; focus: string[]; uid: string; now?: Date }): string {
  const [y, m, d] = opts.testDate.split("-").map(Number) as [number, number, number];
  // 18:00 IST = 12:30 UTC, on the previous day.
  const start = new Date(Date.UTC(y, m - 1, d - 1, 12, 30));
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  const focus = opts.focus.length ? `Focus on: ${opts.focus.join(", ")}.` : "Mixed, timed practice of all topics.";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Heramb.study//Revision reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@heramb.study`,
    `DTSTAMP:${stamp(opts.now ?? new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`Revise before ${opts.testName}`.slice(0, 120))}`,
    `DESCRIPTION:${esc(`${focus} Look at your wrong answers first and work out why each was wrong.`)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Revision time",
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** YYYY-MM-DD `days` after `iso`. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
