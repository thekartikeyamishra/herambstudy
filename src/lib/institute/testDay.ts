/**
 * Weekly test day → follow-up timing. Habits form around the institute's own test rhythm,
 * so follow-ups land the day after their test, when fresh marks exist.
 */
import { daysBetween } from "./metrics";

export const TEST_DAYS = [
  { value: 1, label: "Monday", hi: "सोमवार" },
  { value: 2, label: "Tuesday", hi: "मंगलवार" },
  { value: 3, label: "Wednesday", hi: "बुधवार" },
  { value: 4, label: "Thursday", hi: "गुरुवार" },
  { value: 5, label: "Friday", hi: "शुक्रवार" },
  { value: 6, label: "Saturday", hi: "शनिवार" },
  { value: 0, label: "Sunday", hi: "रविवार" },
] as const;

export const testDayLabel = (d: number | null | undefined) => TEST_DAYS.find((t) => t.value === d)?.label ?? null;

const DAY = 86_400_000;
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(at(s).getTime() + n * DAY));

/** The most recent test day on or before `today`. */
export function lastTestDate(testDay: number, today: string): string {
  const back = (at(today).getUTCDay() - testDay + 7) % 7;
  return addDays(today, -back);
}

/** The next "day after the test" on or after `today` — the best day to follow up. */
export function nextFollowUpDate(testDay: number, today: string): string {
  const target = (testDay + 1) % 7;
  const ahead = (target - at(today).getUTCDay() + 7) % 7;
  return addDays(today, ahead);
}

export type WeekStatus = "tested" | "due_today" | "awaiting" | "missed" | "unknown";

/**
 * Did they analyse the latest test? "tested" if a real test was analysed on or after the last
 * test day; "due_today" on test day; "awaiting" for 2 days after; then "missed".
 */
export function testWeekStatus(testDay: number | null, lastRealTest: string | null, today: string): WeekStatus {
  if (testDay === null) return "unknown";
  const last = lastTestDate(testDay, today);
  if (lastRealTest && daysBetween(last, lastRealTest) >= 0) return "tested";
  if (last === today) return "due_today";
  // Sheets are usually checked a day or two after the test.
  return daysBetween(last, today) <= 2 ? "awaiting" : "missed";
}
