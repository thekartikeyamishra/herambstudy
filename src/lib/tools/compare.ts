export type CompareRow = { topic: string; firstPercent: string; secondPercent: string };

export type CompareVerdict = "improved" | "declined" | "no_clear_change";

export type CompareResult = {
  topic: string;
  first: number;
  second: number;
  change: number;
  verdict: CompareVerdict;
};

/**
 * Compares two assessments topic by topic. Changes inside ±margin percentage
 * points are treated as "no clear change", because two different tests are never
 * perfectly equivalent in difficulty. The margin is a judgement call, not a
 * statistical test.
 */
export function compareAssessments(rows: CompareRow[], margin: number): {
  results: CompareResult[];
  errors: Array<{ index: number; message: string }>;
} {
  const safeMargin = Number.isFinite(margin) ? Math.min(Math.max(margin, 0), 50) : 5;
  const results: CompareResult[] = [];
  const errors: Array<{ index: number; message: string }> = [];
  rows.forEach((r, index) => {
    if (!r.topic.trim() && !r.firstPercent.trim() && !r.secondPercent.trim()) return;
    const a = Number(r.firstPercent.trim().replace(/%$/, "").replace(",", "."));
    const b = Number(r.secondPercent.trim().replace(/%$/, "").replace(",", "."));
    if (!r.topic.trim()) return errors.push({ index, message: "Add a topic name." });
    if (!r.firstPercent.trim() || !r.secondPercent.trim() || !Number.isFinite(a) || !Number.isFinite(b)) {
      return errors.push({ index, message: "Enter both percentages." });
    }
    if (a < 0 || a > 100 || b < 0 || b > 100) return errors.push({ index, message: "Percentages must be between 0 and 100." });
    const change = Math.round((b - a) * 10) / 10;
    const verdict: CompareVerdict =
      Math.abs(change) <= safeMargin ? "no_clear_change" : change > 0 ? "improved" : "declined";
    results.push({ topic: r.topic.trim().slice(0, 80), first: a, second: b, change, verdict });
  });
  return { results, errors };
}

export function summarise(results: CompareResult[]) {
  return {
    improved: results.filter((r) => r.verdict === "improved").length,
    declined: results.filter((r) => r.verdict === "declined").length,
    unclear: results.filter((r) => r.verdict === "no_clear_change").length,
  };
}
