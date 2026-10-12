/**
 * Assessment-readiness self-diagnostic.
 * A structured self-reflection checklist — NOT a validated psychometric instrument.
 */

export const SCALE = [
  { value: 0, label: "Not yet" },
  { value: 1, label: "Sometimes" },
  { value: 2, label: "Mostly" },
  { value: 3, label: "Consistently" },
] as const;

export type DimensionKey = "coverage" | "conditions" | "review" | "recall";

export const DIMENSIONS: Array<{
  key: DimensionKey;
  title: string;
  statements: string[];
  actions: string[];
}> = [
  {
    key: "coverage",
    title: "Syllabus coverage & awareness",
    statements: [
      "I have studied every topic in the syllabus at least once.",
      "I can name the three topics I'm currently weakest in.",
      "I know the paper pattern: sections, marking scheme and negative marking.",
    ],
    actions: [
      "List every syllabus topic on one page and mark each as done, shaky or not started.",
      "Pick your three weakest topics using your last two test results, not your feelings.",
      "Read the official exam pattern once and note how marks and negative marking work.",
    ],
  },
  {
    key: "conditions",
    title: "Practice under exam conditions",
    statements: [
      "I have done a full-length, timed paper in the last two weeks.",
      "I usually finish papers within the time limit.",
      "I practise mixed questions, not only chapter-by-chapter sets.",
    ],
    actions: [
      "Schedule one full-length timed paper this week, in one sitting, with no breaks you wouldn't get in the exam.",
      "After each paper, note where time went: which section took longer than planned?",
      "Replace one chapter-wise session each week with a mixed set across 4–5 chapters.",
    ],
  },
  {
    key: "review",
    title: "Mistake review",
    statements: [
      "After a test, I review every question I got wrong or skipped.",
      "I can tell whether a mistake came from a concept, a method, carelessness or time pressure.",
      "I keep a written record of mistakes I've made more than once.",
    ],
    actions: [
      "Within 48 hours of each test, go through every wrong or skipped question before checking any solution.",
      "Label each mistake: concept, method, careless, misread, or time pressure.",
      "Keep a one-page 'repeat mistakes' list and reread it before every test.",
    ],
  },
  {
    key: "recall",
    title: "Revision & recall",
    statements: [
      "I revise by testing myself (questions, flashcards) rather than only rereading notes.",
      "I come back to older topics on a planned schedule.",
      "I can write key formulas and explain core ideas without looking at notes.",
    ],
    actions: [
      "Swap one rereading session for self-testing: close the book and answer questions from memory.",
      "Revisit each finished chapter after roughly 1 week, 3 weeks and 6 weeks.",
      "Once a week, write a chapter's key formulas from memory, then check and correct them.",
    ],
  },
];

export type Answers = Partial<Record<string, number>>;
export type Band = "priority" | "building" | "strong";

export function answerKey(dimension: DimensionKey, index: number): string {
  return `${dimension}.${index}`;
}

export function bandFor(percent: number): Band {
  if (percent >= 70) return "strong";
  if (percent >= 40) return "building";
  return "priority";
}

export type DimensionResult = { key: DimensionKey; title: string; percent: number; band: Band; actions: string[] };

export function scoreDiagnostic(answers: Answers): {
  complete: boolean;
  answered: number;
  total: number;
  dimensions: DimensionResult[];
  overall: number;
  focus: DimensionResult[];
} {
  const total = DIMENSIONS.reduce((n, d) => n + d.statements.length, 0);
  let answered = 0;
  const dimensions = DIMENSIONS.map((d) => {
    let sum = 0;
    d.statements.forEach((_, i) => {
      const v = answers[answerKey(d.key, i)];
      if (typeof v === "number" && v >= 0 && v <= 3) {
        answered += 1;
        sum += v;
      }
    });
    const percent = Math.round((sum / (d.statements.length * 3)) * 100);
    return { key: d.key, title: d.title, percent, band: bandFor(percent), actions: d.actions };
  });
  const overall = Math.round(dimensions.reduce((s, d) => s + d.percent, 0) / dimensions.length);
  // Focus on the weakest one or two areas — fewer priorities are more likely to be acted on.
  const sorted = [...dimensions].sort((a, b) => a.percent - b.percent);
  const focus = sorted.filter((d, i) => i === 0 || (i === 1 && d.band !== "strong"));
  return { complete: answered === total, answered, total, dimensions, overall, focus };
}
