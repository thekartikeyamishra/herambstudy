/**
 * FICTIONAL sample data used in illustrations and worked examples.
 * No real student, institute, or outcome is represented anywhere on this site.
 */

export type MasteryStatus = "secure" | "developing" | "gap";

export function statusFor(percent: number): MasteryStatus {
  if (percent >= 75) return "secure";
  if (percent >= 50) return "developing";
  return "gap";
}

export const statusLabel: Record<MasteryStatus, string> = {
  secure: "Secure",
  developing: "Developing",
  gap: "Learning gap",
};

export type TopicResult = {
  topic: string;
  /** Percent on the first assessment. */
  before: number;
  /** Percent on the follow-up assessment covering the same topic. */
  after: number;
  /** Dominant mistake type observed (fictional). */
  mistake: "Concept" | "Procedure" | "Careless" | "Time pressure" | "Misread question" | "—";
};

export const sampleStudent = {
  name: "Aarav (fictional student)",
  batch: "Class 11 · Physics · Evening batch (fictional)",
  assessments: { first: "Unit test 3", second: "Follow-up check, 3 weeks later" },
  topics: [
    { topic: "Kinematics", before: 82, after: 85, mistake: "Careless" },
    { topic: "Laws of motion", before: 68, after: 77, mistake: "Procedure" },
    { topic: "Work, energy & power", before: 59, after: 71, mistake: "Procedure" },
    { topic: "Rotational motion", before: 41, after: 63, mistake: "Concept" },
    { topic: "Gravitation", before: 74, after: 72, mistake: "Time pressure" },
  ] satisfies TopicResult[],
} as const;

export const workflowSteps = [
  {
    key: "assess",
    title: "Assess",
    short: "Run a test you already use, or one of ours.",
    detail:
      "Every question is tagged to a topic and skill, so a score becomes a map of what each learner can and can't yet do.",
  },
  {
    key: "diagnose",
    title: "Diagnose",
    short: "See gaps by topic and mistake type.",
    detail:
      "Marks are split by topic and by the kind of mistake — a concept gap needs different help from a careless slip or time pressure.",
  },
  {
    key: "practise",
    title: "Practise",
    short: "Assign short, targeted practice.",
    detail:
      "Each learner gets a small set of questions aimed at their weakest topics instead of repeating a whole chapter.",
  },
  {
    key: "verify",
    title: "Verify",
    short: "Re-check the same skills later.",
    detail:
      "A follow-up check on the same topics shows whether the gap actually closed — not just whether practice was completed.",
  },
  {
    key: "improve",
    title: "Improve",
    short: "Decide the next step with evidence.",
    detail:
      "Teachers decide what to reteach, who to group together, and what to share with students and parents, based on verified change.",
  },
] as const;
