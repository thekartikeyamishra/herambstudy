/**
 * Plans and features — the single source of truth for what is free, what is
 * paid, and what exists today. The pricing page, feature gates and docs read
 * from here, so a pricing decision is a one-file change.
 *
 * Principle: anything that costs us ~nothing to run (browser-only tools) stays
 * free forever. Paid plans add things with real running cost or institutional
 * value: cloud history, AI at scale, many users, parent delivery, support.
 * Payment therefore arrives with NEW value — nothing free is taken away.
 */

export type PlanId = "free" | "teacher" | "institute" | "network";

export type FeatureId =
  | "browser_tools"
  | "local_tracker"
  | "rule_summaries"
  | "ai_summaries"
  | "cloud_history"
  | "multi_device"
  | "term_reports"
  | "student_links"
  | "branded_reports"
  | "parent_delivery"
  | "multi_teacher"
  | "head_dashboard"
  | "student_practice"
  | "question_bank"
  | "multi_branch"
  | "data_export"
  | "city_benchmark"
  | "batch_history"
  | "priority_support";

/** available = works today; pilot = with pilot partners; planned = not built yet. */
export type Availability = "available" | "pilot" | "planned";

export const FEATURES: Record<FeatureId, { label: string; availability: Availability }> = {
  browser_tools: { label: "Class test analyser, follow-up check and all free tools", availability: "available" },
  local_tracker: { label: "Class progress tracker (saved on your device)", availability: "available" },
  rule_summaries: { label: "Instant teaching summary from your numbers", availability: "available" },
  ai_summaries: { label: "AI-written teaching summary and parent note", availability: "available" },
  term_reports: { label: "Student term reports across all tests", availability: "available" },
  student_links: { label: "Personal report link for every student, with your institute's name", availability: "available" },
  data_export: { label: "Export all your data, any time", availability: "available" },
  cloud_history: { label: "Cloud history for every class, year after year", availability: "planned" },
  multi_device: { label: "Use on any device; nothing lost if a browser is cleared", availability: "planned" },
  branded_reports: { label: "Reports on your institute's letterhead", availability: "planned" },
  parent_delivery: { label: "Send reports to parents (WhatsApp / email)", availability: "planned" },
  multi_teacher: { label: "All teachers and subjects in one workspace", availability: "planned" },
  head_dashboard: { label: "Head's dashboard: each batch's latest results and weakest chapters", availability: "available" },
  city_benchmark: { label: "City benchmark: your chapters vs other founding institutes", availability: "available" },
  batch_history: { label: "Full-year batch history for the head, with CSV export", availability: "available" },
  student_practice: { label: "Targeted practice assigned to students", availability: "pilot" },
  question_bank: { label: "Your own topic-tagged question bank", availability: "planned" },
  multi_branch: { label: "Multiple branches, central reporting", availability: "planned" },
  priority_support: { label: "Onboarding and priority support", availability: "pilot" },
};

export type Plan = {
  id: PlanId;
  name: string;
  forWho: string;
  /**
   * Price in INR. null = not published yet (shown as "Founding price on request").
   * Set these only after pilots validate willingness to pay (see /pilot price answers).
   */
  priceInr: { amount: number; unit: "per teacher / month" | "per student / month" | "per year" } | null;
  features: FeatureId[];
  /** Daily AI summary allowance. Browser tools are never limited. */
  aiPerDay: number;
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    forWho: "Any teacher, tutor or student",
    priceInr: { amount: 0, unit: "per year" },
    features: ["browser_tools", "local_tracker", "rule_summaries", "ai_summaries", "term_reports", "student_links", "data_export", "head_dashboard", "city_benchmark"],
    aiPerDay: 5,
  },
  {
    id: "teacher",
    name: "Teacher Pro",
    forWho: "Teachers and tutors who track classes all year",
    priceInr: null,
    features: ["browser_tools", "local_tracker", "rule_summaries", "ai_summaries", "term_reports", "student_links", "data_export", "head_dashboard", "city_benchmark", "cloud_history", "multi_device", "branded_reports"],
    aiPerDay: 50,
  },
  {
    id: "institute",
    name: "Institute",
    forWho: "Coaching institutes, schools and colleges",
    priceInr: null,
    features: [
      "browser_tools", "local_tracker", "rule_summaries", "ai_summaries", "term_reports", "student_links", "data_export",
      "cloud_history", "multi_device", "branded_reports", "parent_delivery", "multi_teacher", "head_dashboard",
      "city_benchmark", "batch_history", "student_practice", "question_bank", "priority_support",
    ],
    aiPerDay: 500,
    highlight: true,
  },
  {
    id: "network",
    name: "Network",
    forWho: "Multi-branch groups and school chains",
    priceInr: null,
    features: [
      "browser_tools", "local_tracker", "rule_summaries", "ai_summaries", "term_reports", "student_links", "data_export",
      "cloud_history", "multi_device", "branded_reports", "parent_delivery", "multi_teacher", "head_dashboard",
      "city_benchmark", "batch_history", "student_practice", "question_bank", "multi_branch", "priority_support",
    ],
    aiPerDay: 2000,
  },
];

/**
 * Promises shown publicly. Only list what the product can honour TODAY.
 * Proposed commitments (renewal reminders, post-cancellation access) live in
 * docs/BUSINESS-MODEL.md until the owner decides them and billing exists.
 */
export const GUARANTEES = [
  "Your data is yours: export it (CSV / JSON) at any time, on every plan.",
  "Everything that's free today stays free — paid plans only add new things.",
] as const;
