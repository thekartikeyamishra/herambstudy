export type ResourceKind = "Interactive tool" | "Guide" | "Template";

export type ResourceMeta = {
  slug: string;
  title: string;
  /** Used for <meta name="description"> and cards. */
  summary: string;
  kind: ResourceKind;
  audience: string;
  purpose: string;
  published: string;
  reviewed: string;
  readingMinutes: number;
  related: string[];
};

export const resources: ResourceMeta[] = [
  {
    slug: "class-test-analyser",
    title: "Class test analyser: what to reteach after a test",
    summary:
      "Paste a whole batch's topic-wise marks from Excel or Google Sheets and get a teaching plan, reteach groups, a gap map and printable student reports — in your browser.",
    kind: "Interactive tool",
    audience: "Coaching teachers, subject heads and institute owners.",
    purpose: "Turn one test's marks for a whole class into a reteach plan and student groups in minutes.",
    published: "2026-10-12",
    reviewed: "2026-10-12",
    readingMinutes: 7,
    related: ["learning-gap-analysis", "interpreting-repeated-mistakes", "student-progress-report-template"],
  },
  {
    slug: "assessment-readiness-diagnostic",
    title: "Assessment-readiness diagnostic for students",
    summary:
      "A 12-question self-check across syllabus coverage, timed practice, mistake review and revision habits — with a focused two-week plan.",
    kind: "Interactive tool",
    audience: "Students preparing for a test or competitive exam, and teachers who want a quick habit check-in.",
    purpose: "Identify which study habit is most likely holding back your next test, and what to change first.",
    published: "2026-10-12",
    reviewed: "2026-10-12",
    readingMinutes: 6,
    related: ["interpreting-repeated-mistakes", "learning-gap-analysis"],
  },
  {
    slug: "learning-gap-analysis",
    title: "How to find learning gaps from test results",
    summary:
      "A practical method for turning one test's marks into a prioritised list of topics to reteach — plus a free analyser that does the arithmetic.",
    kind: "Guide",
    audience: "Coaching teachers, tutors and heads of department.",
    purpose: "Decide what to reteach first, using marks you already have.",
    published: "2026-10-12",
    reviewed: "2026-10-12",
    readingMinutes: 9,
    related: ["interpreting-repeated-mistakes", "comparing-assessments", "student-progress-report-template"],
  },
  {
    slug: "student-progress-report-template",
    title: "Student progress report template (free, printable)",
    summary:
      "An editable topic-by-topic report that shows before-and-after progress and agreed next steps. Fill it in, then print or save as PDF.",
    kind: "Template",
    audience: "Teachers and tutors who share progress with students and parents.",
    purpose: "Communicate specific progress and next steps instead of a single average.",
    published: "2026-10-12",
    reviewed: "2026-10-12",
    readingMinutes: 5,
    related: ["comparing-assessments", "learning-gap-analysis"],
  },
  {
    slug: "comparing-assessments",
    title: "How to compare two assessments fairly",
    summary:
      "Why a rise from 60% to 66% may mean nothing, how to compare topic by topic, and a calculator that separates real change from noise.",
    kind: "Guide",
    audience: "Teachers, tutors and institute leads who report improvement.",
    purpose: "Avoid over-claiming or missing real progress when comparing tests.",
    published: "2026-10-12",
    reviewed: "2026-10-12",
    readingMinutes: 8,
    related: ["student-progress-report-template", "learning-gap-analysis"],
  },
  {
    slug: "interpreting-repeated-mistakes",
    title: "Guide to interpreting repeated mistakes",
    summary:
      "Five mistake types, how to tell them apart from a student's working, and the different fix each one needs — with a tally tool.",
    kind: "Guide",
    audience: "Teachers and tutors reviewing test papers.",
    purpose: "Match the response to the cause of a mistake, rather than reteaching everything.",
    published: "2026-10-12",
    reviewed: "2026-10-12",
    readingMinutes: 8,
    related: ["learning-gap-analysis", "assessment-readiness-diagnostic"],
  },
];

export function getResource(slug: string): ResourceMeta | undefined {
  return resources.find((r) => r.slug === slug);
}
