/**
 * The seven founding-programme metrics, computed from aggregate counts only.
 * Pure and deterministic (pass `today`), so the same function powers the
 * institute dashboard, the owner dashboard, emails and tests.
 */
import { HELPED_WITH, MINUTES_SAVED, type HelpedWith, type MinutesSaved, type UsageEvent } from "./events";

export type DayCounters = Partial<Record<UsageEvent, number>>;
export type DayRow = { date: string; c: DayCounters };
export type DeviceCounts = { teacher: number; student: number };
export type FeedbackRow = { at: string; minutes: MinutesSaved; helped: HelpedWith[]; note: string | null };
export type InstituteCore = { createdAt: string; activatedAt: string | null };

export type MetricKey = "activation" | "adoption" | "distribution" | "engagement" | "repeat" | "retention" | "value";
export type Metric = {
  key: MetricKey;
  question: string;
  met: boolean;
  /** true while the answer can't be known yet (e.g. retention before day 30). */
  pending: boolean;
  headline: string;
  detail: string;
};
export type Health = "not_activated" | "active" | "at_risk" | "dormant";

export type InstituteMetrics = {
  metrics: Metric[];
  metCount: number;
  health: Health;
  lastActiveDate: string | null;
  daysSinceActive: number | null;
  totals: Record<UsageEvent, number>;
  teacherDevices: number;
  studentDevices: number;
  weeklyStreak: number;
  weeks: Array<{ weekStart: string; analyses: number; studentActions: number }>;
  nextStep: string;
};

const TEACHER_ACTIVITY: UsageEvent[] = ["analysis_real", "followup_run", "tracker_saved", "links_created", "links_shared", "import_file", "import_sheet", "import_photo"];
const STUDENT_ACTIVITY: UsageEvent[] = ["report_opened", "report_saved", "student_helpful_yes", "student_helpful_no", "reminder_added"];

const DAY_MS = 86_400_000;
const toMs = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
export const daysBetween = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY_MS);

/** Monday of the week containing `iso`, as an ISO date. */
export function weekStart(iso: string): string {
  const d = new Date(toMs(iso));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(d.getTime() - dow * DAY_MS).toISOString().slice(0, 10);
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const fmtDate = (iso: string) =>
  new Date(toMs(iso)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function emptyTotals(): Record<UsageEvent, number> {
  return {
    analysis_real: 0, analysis_sample: 0, followup_run: 0, tracker_saved: 0, links_created: 0, links_shared: 0,
    report_opened: 0, report_saved: 0, student_helpful_yes: 0, student_helpful_no: 0, reminder_added: 0,
    import_file: 0, import_sheet: 0, import_photo: 0,
  };
}

export function computeMetrics(input: {
  institute: InstituteCore;
  days: DayRow[];
  devices: DeviceCounts;
  feedback: FeedbackRow[];
  today: string;
}): InstituteMetrics {
  const { institute, devices, feedback, today } = input;
  const days = [...input.days].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date)).sort((a, b) => a.date.localeCompare(b.date));

  const totals = emptyTotals();
  for (const d of days) for (const [k, v] of Object.entries(d.c)) if (k in totals && typeof v === "number" && v > 0) totals[k as UsageEvent] += v;

  const has = (d: DayRow, keys: UsageEvent[]) => keys.some((k) => (d.c[k] ?? 0) > 0);
  const realDays = days.filter((d) => (d.c.analysis_real ?? 0) > 0).map((d) => d.date);
  const teacherDays = days.filter((d) => has(d, TEACHER_ACTIVITY)).map((d) => d.date);
  const anyActiveDays = days.filter((d) => has(d, TEACHER_ACTIVITY) || has(d, STUDENT_ACTIVITY)).map((d) => d.date);

  const activatedAt = institute.activatedAt?.slice(0, 10) ?? realDays[0] ?? null;
  // Health and retention follow TEACHER activity: students re-opening old reports don't mean
  // the institute is still running tests.
  const lastActiveDate = teacherDays.at(-1) ?? null;
  const lastAnyDate = anyActiveDays.at(-1) ?? null;
  const daysSinceActive = lastActiveDate ? Math.max(0, daysBetween(lastActiveDate, today)) : null;

  const teacherDevices = Math.max(0, devices.teacher | 0);
  const studentDevices = Math.max(0, devices.student | 0);

  // 1. Activation
  const activation: Metric = {
    key: "activation",
    question: "Did the institute run its first real test?",
    met: Boolean(activatedAt),
    pending: false,
    headline: activatedAt ? `Yes — ${fmtDate(activatedAt)}` : "Not yet",
    detail: activatedAt
      ? `${plural(totals.analysis_real, "real test")} analysed so far${totals.analysis_sample ? ` (plus ${plural(totals.analysis_sample, "demo run")})` : ""}.`
      : totals.analysis_sample
        ? `The demo class was tried ${plural(totals.analysis_sample, "time")}, but no real test yet.`
        : "No test analysed yet.",
  };

  // 2. Teacher adoption — came back on a later day
  const adopted = teacherDays.length >= 2;
  const adoption: Metric = {
    key: "adoption",
    question: "Did the teacher use the tool again?",
    met: adopted,
    pending: !activatedAt,
    headline: adopted ? `Yes — active on ${plural(teacherDays.length, "day")}` : teacherDays.length === 1 ? "Once so far" : "Not yet",
    detail: `${plural(teacherDevices, "teacher device")} connected.`,
  };

  // 3. Student distribution
  const distribution: Metric = {
    key: "distribution",
    question: "How many report links were shared?",
    met: totals.links_shared > 0,
    pending: !activatedAt,
    headline: totals.links_shared ? `${totals.links_shared} shared` : totals.links_created ? `${totals.links_created} created, none sent yet` : "None yet",
    detail: `${plural(totals.links_created, "link")} created in total.`,
  };

  // 4. Student engagement — voluntary student actions
  const voluntary = totals.report_saved + totals.student_helpful_yes + totals.reminder_added;
  const engagement: Metric = {
    key: "engagement",
    question: "How many students voluntarily used their reports?",
    met: voluntary > 0,
    pending: totals.links_shared === 0 && totals.report_opened === 0,
    headline: voluntary ? `${voluntary} student action${voluntary === 1 ? "" : "s"}` : totals.report_opened ? `${totals.report_opened} opened, no saves yet` : "None yet",
    detail: `${totals.report_opened} opened · ${totals.report_saved} saved · ${totals.student_helpful_yes} said it helped · ${totals.reminder_added} set a reminder${
      totals.links_shared ? ` · open rate ${Math.min(100, Math.round((totals.report_opened / totals.links_shared) * 100))}%` : ""
    }.`,
  };

  // 5. Repeat usage — the next test led to another analysis
  const spacedRepeat = realDays.some((d, i) => i > 0 && daysBetween(realDays[0]!, d) >= 3);
  const repeated = spacedRepeat || totals.followup_run > 0;
  const repeat: Metric = {
    key: "repeat",
    question: "Did the next test lead to another analysis?",
    met: repeated,
    pending: !activatedAt,
    headline: repeated ? `Yes — ${plural(realDays.length, "test day")}${totals.followup_run ? `, ${plural(totals.followup_run, "follow-up check")}` : ""}` : "Waiting for the next test",
    detail: realDays.length ? `Real tests analysed on: ${realDays.slice(-4).map(fmtDate).join(", ")}${realDays.length > 4 ? "…" : ""}.` : "—",
  };

  // 6. Retention — still using the workflow 30+ days after activation
  const daysSinceActivation = activatedAt ? daysBetween(activatedAt, today) : null;
  const retained = Boolean(activatedAt && teacherDays.some((d) => daysBetween(activatedAt, d) >= 30));
  const retention: Metric = {
    key: "retention",
    question: "Is the institute still using it after 30 days?",
    met: retained,
    pending: !retained && (daysSinceActivation === null || daysSinceActivation < 30),
    headline: retained ? "Yes — retained" : daysSinceActivation !== null && daysSinceActivation < 30 ? `Day ${daysSinceActivation} of 30` : activatedAt ? "Not since day 30" : "Starts after the first real test",
    detail: lastActiveDate
      ? `Last teacher activity ${fmtDate(lastActiveDate)}${daysSinceActive ? ` (${plural(daysSinceActive, "day")} ago)` : " (today)"}${lastAnyDate && lastAnyDate > lastActiveDate ? `; students last active ${fmtDate(lastAnyDate)}` : ""}.`
      : "No activity yet.",
  };

  // 7. Value — what time or teaching problem it solved (teacher-reported)
  const useful = feedback.filter((f) => !f.helped.includes("not_yet"));
  const minutesList = feedback.map((f) => MINUTES_SAVED.find((m) => m.value === f.minutes)?.minutes ?? 0).sort((a, b) => a - b);
  const medianMinutes = minutesList.length ? minutesList[Math.floor((minutesList.length - 1) / 2)]! : 0;
  const helpedCounts = new Map<HelpedWith, number>();
  for (const f of feedback) for (const h of f.helped) helpedCounts.set(h, (helpedCounts.get(h) ?? 0) + 1);
  const top = [...helpedCounts.entries()].filter(([k]) => k !== "not_yet").sort((a, b) => b[1] - a[1])[0];
  const topLabel = top ? HELPED_WITH.find((h) => h.value === top[0])?.label : null;
  const value: Metric = {
    key: "value",
    question: "What time or teaching problem did it solve?",
    met: useful.length > 0,
    pending: feedback.length === 0,
    headline: useful.length ? (topLabel ?? "Reported useful") : feedback.length ? "Not useful yet (reported)" : "Not asked yet",
    detail: feedback.length
      ? `${plural(feedback.length, "response")} · typical time saved per test: ${medianMinutes ? `${medianMinutes} min` : "none"}${feedback.at(-1)?.note ? ` · latest note: “${feedback.at(-1)!.note}”` : ""}`
      : "Ask after the second test: 'What did this help with?'",
  };

  const metrics = [activation, adoption, distribution, engagement, repeat, retention, value];

  let health: Health;
  if (!activatedAt) health = "not_activated";
  else if (daysSinceActive !== null && daysSinceActive >= 30) health = "dormant";
  else if (daysSinceActive !== null && daysSinceActive >= 10) health = "at_risk";
  else health = "active";

  // Last 8 weeks of rhythm and the streak of consecutive weeks with a real test analysed.
  const thisWeek = weekStart(today);
  const weeks: InstituteMetrics["weeks"] = [];
  for (let i = 7; i >= 0; i--) {
    const ws = new Date(toMs(thisWeek) - i * 7 * DAY_MS).toISOString().slice(0, 10);
    const inWeek = days.filter((d) => weekStart(d.date) === ws);
    weeks.push({
      weekStart: ws,
      analyses: inWeek.reduce((s, d) => s + (d.c.analysis_real ?? 0), 0),
      studentActions: inWeek.reduce((s, d) => s + STUDENT_ACTIVITY.reduce((x, k) => x + (d.c[k] ?? 0), 0), 0),
    });
  }
  let weeklyStreak = 0;
  // The current week only counts once it has a test; an empty current week doesn't break the streak yet.
  const ordered = [...weeks].reverse();
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i]!.analyses > 0) weeklyStreak++;
    else if (i === 0) continue;
    else break;
  }

  let nextStep: string;
  if (!activatedAt) nextStep = "Analyse one real test: paste or import last week's marks into the analyser.";
  else if (totals.links_shared === 0) nextStep = "Send students their report links — that's what parents notice.";
  else if (!repeated) nextStep = "Analyse the next test too; a second test shows what improved.";
  else if (feedback.length === 0) nextStep = "Tell us in two taps what this helped with — it shapes what we build next.";
  else if (health === "at_risk" || health === "dormant") nextStep = "Pick this week's test and run it through the analyser to restart the rhythm.";
  else nextStep = "Keep the weekly rhythm: one test analysed, links sent, the follow-up check after re-teaching.";

  return {
    metrics,
    metCount: metrics.filter((m) => m.met).length,
    health,
    lastActiveDate,
    daysSinceActive,
    totals,
    teacherDevices,
    studentDevices,
    weeklyStreak,
    weeks,
    nextStep,
  };
}

export const HEALTH_LABEL: Record<Health, string> = {
  not_activated: "Not activated",
  active: "Active",
  at_risk: "At risk",
  dormant: "Dormant",
};
