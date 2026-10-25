import { z } from "zod";
import { COUNTRY_CODES } from "@/content/countries";

/** Versions of consent wording. Bump when the text shown to users changes. */
export const PRIVACY_NOTICE_VERSION = "2026-10-12";
export const MARKETING_CONSENT_VERSION = "2026-10-12";

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
/** Line breaks (incl. Unicode separators) and bidi overrides that can spoof displayed text. */
const LINE_BREAKS = /[\r\n\u2028\u2029]/;
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/;

/**
 * Single-line text by default. Names, institute names and cities end up in email
 * subjects, CSV exports and admin views, so line breaks are refused there
 * (prevents header/subject injection and broken exports). Pass multiline=true for
 * free-text notes.
 */
const cleanText = (max: number, multiline = false) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .refine((v) => !CONTROL_CHARS.test(v.replace(/\t/g, " ")) && !BIDI_CONTROLS.test(v), "Contains unsupported characters.")
    .refine((v) => multiline || !LINE_BREAKS.test(v), "Please keep this on one line.");

const optionalText = (max: number, multiline = false) =>
  z
    .union([cleanText(max, multiline), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null));

export const emailSchema = z
  .string({ required_error: "Please enter your email address." })
  .trim()
  .min(1, "Please enter your email address.")
  .max(254, "That email address is too long.")
  .email("Please enter a valid email address.");

/** Lower-cases and trims. We deliberately do not strip Gmail dots or +tags. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const ROLES = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher at a coaching institute or school" },
  { value: "tutor", label: "Private tutor" },
  { value: "institute_owner", label: "Institute owner or director" },
  { value: "other", label: "Other" },
] as const;
export type Role = (typeof ROLES)[number]["value"];
const roleValues = ROLES.map((r) => r.value) as [Role, ...Role[]];

export const USE_CASES = [
  { value: "track_progress", label: "Track student progress between tests" },
  { value: "find_learning_gaps", label: "Find learning gaps from test results" },
  { value: "targeted_practice", label: "Assign or do targeted practice" },
  { value: "assessment_reports", label: "Share clearer reports with students or parents" },
  { value: "exam_preparation", label: "Prepare for an exam (e.g. JEE, NEET)" },
  { value: "evaluate_for_institute", label: "Evaluate it for my institute" },
  { value: "other", label: "Something else" },
] as const;
export type UseCase = (typeof USE_CASES)[number]["value"];
const useCaseValues = USE_CASES.map((u) => u.value) as [UseCase, ...UseCase[]];

export const INSTITUTE_SIZES = [
  { value: "under_50", label: "Fewer than 50 students" },
  { value: "50_200", label: "50–200 students" },
  { value: "200_1000", label: "200–1,000 students" },
  { value: "over_1000", label: "More than 1,000 students" },
] as const;
export type InstituteSize = (typeof INSTITUTE_SIZES)[number]["value"];
const instituteSizeValues = INSTITUTE_SIZES.map((s) => s.value) as [InstituteSize, ...InstituteSize[]];

export const ROLES_WITH_INSTITUTE: ReadonlySet<Role> = new Set(["teacher", "institute_owner"]);

const sourceSchema = z
  .object({
    campaign: z
      .string()
      .trim()
      .max(64)
      .regex(/^[a-zA-Z0-9_.-]*$/)
      .optional()
      .catch(undefined),
    landingPage: z
      .string()
      .trim()
      .max(200)
      .regex(/^\/[a-zA-Z0-9/_-]*$/)
      .optional()
      .catch(undefined),
  })
  .partial()
  .optional()
  .catch(undefined);

/** Anti-spam fields: a hidden honeypot and the time the form was first rendered. */
const antiSpam = {
  website: z.string().max(200).optional().catch("filled"),
  startedAt: z.number().int().nonnegative().optional().catch(undefined),
};

export const inviteRequestSchema = z
  .object({
    name: optionalText(80),
    email: emailSchema,
    role: z.enum(roleValues, { errorMap: () => ({ message: "Please choose the role that fits you best." }) }),
    country: z.enum(COUNTRY_CODES, { errorMap: () => ({ message: "Please choose your country." }) }),
    useCase: z.enum(useCaseValues, { errorMap: () => ({ message: "Please choose your main use case." }) }),
    useCaseNote: optionalText(500, true),
    instituteName: optionalText(120),
    instituteSize: z
      .union([z.enum(instituteSizeValues), z.literal(""), z.null(), z.undefined()])
      .transform((v) => (v ? v : null)),
    privacyAcknowledged: z.literal(true, {
      errorMap: () => ({ message: "Please confirm you've read how we use your details." }),
    }),
    marketingConsent: z.boolean().default(false),
    source: sourceSchema,
    ...antiSpam,
  })
  .strip()
  .transform((v) => {
    // Institute details are only kept when relevant to the selected role.
    if (!ROLES_WITH_INSTITUTE.has(v.role)) return { ...v, instituteName: null, instituteSize: null };
    return v;
  });

export type InviteRequestInput = z.input<typeof inviteRequestSchema>;
export type InviteRequest = z.output<typeof inviteRequestSchema>;

export const CONTACT_TOPICS = [
  { value: "general", label: "General question" },
  { value: "institute_pilot", label: "Pilot for my institute" },
  { value: "privacy_request", label: "Privacy or data request" },
  { value: "content_error", label: "Report an error in our content" },
  { value: "partnership", label: "Partnership or press" },
  { value: "other", label: "Other" },
] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];
const contactTopicValues = CONTACT_TOPICS.map((t) => t.value) as [ContactTopic, ...ContactTopic[]];

export const contactMessageSchema = z
  .object({
    name: cleanText(80).pipe(z.string().min(1, "Please tell us your name.")),
    email: emailSchema,
    topic: z.enum(contactTopicValues, { errorMap: () => ({ message: "Please choose a topic." }) }),
    message: z
      .string()
      .trim()
      .min(10, "Please write at least 10 characters.")
      .max(2000, "Please keep your message under 2,000 characters.")
      .refine((v) => !CONTROL_CHARS.test(v.replace(/[\r\n\t]/g, "")), "Contains unsupported characters."),
    privacyAcknowledged: z.literal(true, {
      errorMap: () => ({ message: "Please confirm you've read how we use your details." }),
    }),
    ...antiSpam,
  })
  .strip();

export type ContactMessageInput = z.input<typeof contactMessageSchema>;
export type ContactMessage = z.output<typeof contactMessageSchema>;

/** Flattens Zod issues into { field: firstMessage } for accessible inline errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/* ── Institute pilot application ─────────────────────────────────────────── */

export const INSTITUTION_TYPES = [
  { value: "coaching", label: "Coaching institute" },
  { value: "school", label: "School" },
  { value: "college", label: "College / university" },
  { value: "tutor", label: "Tutoring centre" },
] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number]["value"];

export const PILOT_ROLES = [
  { value: "owner", label: "Owner, director or principal" },
  { value: "academic_head", label: "Academic head / HOD / coordinator" },
  { value: "teacher", label: "Teacher" },
  { value: "other", label: "Other" },
] as const;
export type PilotRole = (typeof PILOT_ROLES)[number]["value"];

export const PILOT_EXAMS = [
  { value: "jee_main", label: "JEE Main" },
  { value: "jee_advanced", label: "JEE Advanced" },
  { value: "neet", label: "NEET" },
  { value: "foundation", label: "Foundation (Class 8–10)" },
  { value: "boards", label: "Board exams (CBSE / ICSE / State)" },
  { value: "university", label: "University / semester exams" },
  { value: "other", label: "Other" },
] as const;
export type PilotExam = (typeof PILOT_EXAMS)[number]["value"];

export const TEST_FREQUENCIES = [
  { value: "weekly", label: "Weekly or more often" },
  { value: "fortnightly", label: "Every two weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "irregular", label: "Irregularly" },
] as const;
export type TestFrequency = (typeof TEST_FREQUENCIES)[number]["value"];

export const START_WINDOWS = [
  { value: "this_month", label: "This month" },
  { value: "next_3_months", label: "In the next 3 months" },
  { value: "exploring", label: "Just exploring for now" },
] as const;
export type StartWindow = (typeof START_WINDOWS)[number]["value"];

/** Optional willingness-to-pay signal (₹ per student per month), used only to validate pricing. */
export const PRICE_COMFORT = [
  { value: "not_sure", label: "Not sure yet" },
  { value: "under_25", label: "Under ₹25" },
  { value: "25_50", label: "₹25–50" },
  { value: "50_100", label: "₹50–100" },
  { value: "over_100", label: "More than ₹100" },
] as const;
export type PriceComfort = (typeof PRICE_COMFORT)[number]["value"];

const valuesOf = <T extends ReadonlyArray<{ value: string }>>(list: T) =>
  list.map((x) => x.value) as unknown as [T[number]["value"], ...Array<T[number]["value"]>];

export const pilotApplicationSchema = z
  .object({
    contactName: cleanText(80).pipe(z.string().min(1, "Please tell us your name.")),
    role: z.enum(valuesOf(PILOT_ROLES), { errorMap: () => ({ message: "Please choose your role." }) }),
    email: emailSchema,
    phone: z
      .union([z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,18}$/, "Please enter a valid phone number, or leave it blank."), z.literal(""), z.null(), z.undefined()])
      .transform((v) => (v ? v.replace(/[\s()-]/g, "") : null)),
    institutionType: z.enum(valuesOf(INSTITUTION_TYPES), { errorMap: () => ({ message: "Please choose your type of institution." }) }),
    instituteName: cleanText(120).pipe(z.string().min(2, "Please enter your institution's name.")),
    city: cleanText(80).pipe(z.string().min(2, "Please enter your city.")),
    country: z.enum(COUNTRY_CODES, { errorMap: () => ({ message: "Please choose your country." }) }),
    studentCount: z.enum(valuesOf(INSTITUTE_SIZES), { errorMap: () => ({ message: "Please choose an approximate size." }) }),
    exams: z
      .array(z.enum(valuesOf(PILOT_EXAMS)))
      .min(1, "Please choose at least one.")
      .max(PILOT_EXAMS.length)
      .transform((a) => Array.from(new Set(a))),
    testFrequency: z.enum(valuesOf(TEST_FREQUENCIES), { errorMap: () => ({ message: "Please choose how often you test." }) }),
    currentTools: optionalText(300),
    startWindow: z.enum(valuesOf(START_WINDOWS), { errorMap: () => ({ message: "Please choose when you'd like to start." }) }),
    priceComfort: z
      .union([z.enum(valuesOf(PRICE_COMFORT)), z.literal(""), z.null(), z.undefined()])
      .transform((v) => (v ? v : null)),
    notes: optionalText(1000, true),
    privacyAcknowledged: z.literal(true, {
      errorMap: () => ({ message: "Please confirm you've read how we use your details." }),
    }),
    ...antiSpam,
  })
  .strip();

export type PilotApplicationInput = z.input<typeof pilotApplicationSchema>;
export type PilotApplication = z.output<typeof pilotApplicationSchema>;

/** Body of the confirm / unsubscribe endpoints (ids and tokens are hex/base64url). */
export const emailActionSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{32}$/),
    t: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/),
  })
  .strip();

/* ── Founding institute registration ─────────────────────────────────────── */

export const JOIN_SOURCES = ["meeting", "self", "referral", "ads"] as const;
export type JoinSource = (typeof JOIN_SOURCES)[number];

export const instituteJoinSchema = z
  .object({
    instituteName: cleanText(120).pipe(z.string().min(2, "Please enter the institute's name.")),
    city: cleanText(80).pipe(z.string().min(2, "Please enter the city.")),
    institutionType: z.enum(valuesOf(INSTITUTION_TYPES), { errorMap: () => ({ message: "Please choose the type of institution." }) }),
    contactName: cleanText(80).pipe(z.string().min(1, "Please enter a contact name.")),
    role: z.enum(valuesOf(PILOT_ROLES), { errorMap: () => ({ message: "Please choose a role." }) }),
    phone: z
      .union([z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,18}$/, "Please enter a valid phone / WhatsApp number, or leave it blank."), z.literal(""), z.null(), z.undefined()])
      .transform((v) => (v ? v.replace(/[\s()-]/g, "") : null)),
    email: z
      .union([emailSchema, z.literal(""), z.null(), z.undefined()])
      .transform((v) => (typeof v === "string" && v.length ? normalizeEmail(v) : null)),
    weeklyDigest: z.boolean().default(false),
    source: z.enum(JOIN_SOURCES).optional().catch(undefined),
    /** Weekly test day, 0 = Sunday … 6 = Saturday; null = no fixed day. */
    testDay: z.number().int().min(0).max(6).nullable().optional().catch(null),
    privacyAcknowledged: z.literal(true, {
      errorMap: () => ({ message: "Please confirm you've read how we use these details." }),
    }),
    ...antiSpam,
  })
  .strip()
  .refine((v) => Boolean(v.phone || v.email), { message: "Please add a phone / WhatsApp number or an email so we can help you.", path: ["phone"] })
  .refine((v) => !v.weeklyDigest || Boolean(v.email), { message: "The weekly summary needs an email address.", path: ["email"] });

export type InstituteJoinInput = z.input<typeof instituteJoinSchema>;
export type InstituteJoin = z.output<typeof instituteJoinSchema>;
