/**
 * Usage ledger vocabulary — shared by client and server.
 *
 * Privacy contract (enforced by the schema, the API and tests):
 *  - Events are COUNTS of actions. They never carry marks, names, roll numbers,
 *    topic names, free text, URLs or anything typed by a user.
 *  - The device id is a random value generated in the browser; it is hashed with a
 *    server salt before storage and cannot be linked to a person.
 *  - Value feedback is the only place a short note is accepted, it comes from
 *    teachers, and it is validated to refuse web addresses and line breaks.
 */
import { z } from "zod";
import { CODE_PATTERN } from "./code";

export const USAGE_EVENTS = [
  "analysis_real", // a real (non-sample) class test analysed
  "analysis_sample", // the fictional demo class analysed
  "followup_run", // a re-test compared with the first test
  "tracker_saved", // a test saved in the class progress tracker
  "links_created", // student report links generated (n = number of students)
  "links_shared", // report links copied or downloaded for sending (n = links)
  "report_opened", // a student opened their report (once per report per device)
  "report_saved", // a student saved their report to "My progress"
  "student_helpful_yes", // a student said the report helped
  "student_helpful_no", // a student said it didn't
  "reminder_added", // a student added a next-test reminder to their calendar
  "import_file", // marks imported from a CSV / Excel file
  "import_sheet", // marks imported from a linked Google Sheet
  "import_photo", // marks read from a photo / PDF
] as const;
export type UsageEvent = (typeof USAGE_EVENTS)[number];

export const TEACHER_EVENTS: ReadonlySet<UsageEvent> = new Set([
  "analysis_real",
  "followup_run",
  "tracker_saved",
  "links_created",
  "links_shared",
  "import_file",
  "import_sheet",
  "import_photo",
]);
export const STUDENT_EVENTS: ReadonlySet<UsageEvent> = new Set([
  "report_opened",
  "report_saved",
  "student_helpful_yes",
  "student_helpful_no",
  "reminder_added",
]);

export const MAX_EVENTS_PER_BATCH = 20;
export const MAX_COUNT_PER_EVENT = 500;

export const eventBatchSchema = z
  .object({
    code: z.string().regex(CODE_PATTERN).nullable().optional().transform((v) => v ?? null),
    /** Random per-browser id (base64url, 16–32 chars). Hashed server-side before storage. */
    device: z.string().regex(/^[A-Za-z0-9_-]{16,32}$/),
    role: z.enum(["teacher", "student"]),
    events: z
      .array(
        z
          .object({
            type: z.enum(USAGE_EVENTS),
            n: z.number().int().min(1).max(MAX_COUNT_PER_EVENT).optional().default(1),
          })
          .strip(),
      )
      .min(1)
      .max(MAX_EVENTS_PER_BATCH),
  })
  .strip();
export type EventBatch = z.output<typeof eventBatchSchema>;

/* ── Value feedback ("What did this help with?") ─────────────────────────── */

export const MINUTES_SAVED = [
  { value: "0", label: "No time saved", minutes: 0 },
  { value: "15", label: "About 15 minutes", minutes: 15 },
  { value: "30", label: "About 30 minutes", minutes: 30 },
  { value: "60", label: "About an hour", minutes: 60 },
  { value: "120", label: "Two hours or more", minutes: 120 },
] as const;
export type MinutesSaved = (typeof MINUTES_SAVED)[number]["value"];

export const HELPED_WITH = [
  { value: "weak_chapters", label: "Found the weak chapters faster" },
  { value: "reteach_plan", label: "Planned what to re-teach" },
  { value: "students_attention", label: "Spotted students who needed attention" },
  { value: "parent_communication", label: "Talked to parents with evidence" },
  { value: "checking_time", label: "Saved time compiling results" },
  { value: "student_motivation", label: "Students took their reports seriously" },
  { value: "not_yet", label: "Not useful yet" },
] as const;
export type HelpedWith = (typeof HELPED_WITH)[number]["value"];

const URL_LIKE = /(https?:\/\/|www\.)|\b[a-z0-9-]{2,}\.(com|in|net|org|io|ly|xyz|me|co|info|link|app|site)\b/i;
const UNSAFE = /[\u0000-\u001F\u007F‪-‮⁦-⁩]/;

export const valueFeedbackSchema = z
  .object({
    code: z.string().regex(CODE_PATTERN),
    minutes: z.enum(MINUTES_SAVED.map((m) => m.value) as [MinutesSaved, ...MinutesSaved[]]),
    helped: z
      .array(z.enum(HELPED_WITH.map((h) => h.value) as [HelpedWith, ...HelpedWith[]]))
      .min(1, "Please choose at least one.")
      .max(HELPED_WITH.length)
      .transform((a) => Array.from(new Set(a))),
    note: z
      .union([
        z
          .string()
          .trim()
          .max(280, "Please keep this under 280 characters.")
          .refine((v) => !URL_LIKE.test(v), "Please leave out web addresses.")
          .refine((v) => !UNSAFE.test(v), "Please keep this on one line."),
        z.literal(""),
        z.null(),
        z.undefined(),
      ])
      .transform((v) => (typeof v === "string" && v.length ? v : null)),
  })
  .strip();
export type ValueFeedback = z.output<typeof valueFeedbackSchema>;

/** Day key in India time (the product's home market), e.g. "2026-10-19". */
export function dayKey(at: Date | number = Date.now()): string {
  const t = typeof at === "number" ? at : at.getTime();
  return new Date(t + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Events that can legitimately carry a count above 1 (one entry per class of links). */
const BULK_EVENTS: ReadonlySet<UsageEvent> = new Set(["links_created", "links_shared"]);
/** Upper bound per type per batch for single-action events (a few real clicks within 1.5 s). */
const MAX_SINGLE_PER_BATCH = 3;

/**
 * Server-side clean-up of a usage batch so counts can't be pumped trivially:
 *  - events must match the declared role (students can't send teacher events and vice versa),
 *  - single actions count at most 1 each and at most 3 per type per batch,
 *  - bulk link counts stay within MAX_COUNT_PER_EVENT per type per batch,
 *  - duplicates of the same type are merged.
 */
export function sanitiseEvents(role: "teacher" | "student", events: Array<{ type: UsageEvent; n: number }>): Array<{ type: UsageEvent; n: number }> {
  const allowed = role === "teacher" ? TEACHER_EVENTS : STUDENT_EVENTS;
  const merged = new Map<UsageEvent, number>();
  for (const e of events) {
    // Demo runs come from teachers but aren't "teacher activity" for the metrics.
    if (!allowed.has(e.type) && !(role === "teacher" && e.type === "analysis_sample")) continue;
    const n = BULK_EVENTS.has(e.type) ? e.n : 1;
    merged.set(e.type, (merged.get(e.type) ?? 0) + n);
  }
  return [...merged].map(([type, n]) => ({ type, n: Math.min(n, BULK_EVENTS.has(type) ? MAX_COUNT_PER_EVENT : MAX_SINGLE_PER_BATCH) }));
}
