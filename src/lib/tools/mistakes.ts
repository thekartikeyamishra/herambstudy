export const MISTAKE_TYPES = [
  {
    key: "concept",
    label: "Concept gap",
    sign: "Wrong approach from the start; can't explain why a method applies.",
    response: "Reteach the idea with a fresh example, then check understanding with 2–3 'explain why' questions before more practice.",
  },
  {
    key: "procedure",
    label: "Method / procedure error",
    sign: "Right idea, but steps go wrong — sign errors in a derivation, wrong unit conversion, skipped step.",
    response: "Model the full worked method once, then give short sets of the same step until it is fluent.",
  },
  {
    key: "careless",
    label: "Careless slip",
    sign: "Student spots the error immediately when shown; arithmetic or copying mistakes.",
    response: "Teach a quick checking routine (units, signs, rough estimate) and practise it — reteaching the topic won't help.",
  },
  {
    key: "misread",
    label: "Misread question",
    sign: "Answered a different question: missed 'NOT', wrong quantity asked, ignored a condition.",
    response: "Practise underlining what is asked and any conditions before solving; use questions with deliberate traps.",
  },
  {
    key: "time",
    label: "Time pressure",
    sign: "Correct when untimed; errors cluster at the end of the paper or in long questions.",
    response: "Use timed mini-sets and teach when to skip and return; check the order the student attempts sections.",
  },
] as const;

export type MistakeKey = (typeof MISTAKE_TYPES)[number]["key"];
export type MistakeCounts = Record<MistakeKey, number>;

export function emptyCounts(): MistakeCounts {
  return { concept: 0, procedure: 0, careless: 0, misread: 0, time: 0 };
}

/** Returns mistake types ordered by frequency with their share of the total. */
export function analyseMistakes(counts: MistakeCounts) {
  const total = Object.values(counts).reduce((a, b) => a + Math.max(0, b), 0);
  const ranked = MISTAKE_TYPES.map((t) => ({
    ...t,
    count: Math.max(0, counts[t.key]),
    share: total ? Math.round((Math.max(0, counts[t.key]) / total) * 100) : 0,
  })).sort((a, b) => b.count - a.count);
  const top = ranked[0];
  // A pattern needs enough evidence: at least 5 mistakes and one type ≥ 40% of them.
  const dominant = top && total >= 5 && top.share >= 40 ? top : null;
  return { total, ranked, dominant };
}
