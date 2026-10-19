import { statusFor, type MasteryStatus } from "@/content/sampleData";

export type TopicInput = { topic: string; scored: string; max: string };

export type TopicAnalysis = {
  topic: string;
  scored: number;
  max: number;
  percent: number;
  status: MasteryStatus;
  /** Marks still available in this topic — how much fixing it could matter. */
  marksAtStake: number;
};

export type RowError = { index: number; message: string };

/** Plain numbers with decimal commas and Unicode minus signs ("−2", "7,5"). */
const num = (v: string) => {
  const t = v.trim().replace(/^[\u2212\u2013]/, "-");
  return t === "" ? NaN : Number(t.replace(",", "."));
};
/** "45%" in the scored box means 45% of the maximum. */
const scoredFrom = (v: string, max: number) => {
  const t = v.trim();
  return t.endsWith("%") ? (num(t.slice(0, -1)) / 100) * max : num(t);
};

/** Validates rows and computes per-topic results. Blank rows are ignored. */
export function analyseTopics(rows: TopicInput[]): { results: TopicAnalysis[]; errors: RowError[] } {
  const results: TopicAnalysis[] = [];
  const errors: RowError[] = [];
  rows.forEach((row, index) => {
    const blank = !row.topic.trim() && !row.scored.trim() && !row.max.trim();
    if (blank) return;
    const max = num(row.max);
    const scored = Math.round(scoredFrom(row.scored, max) * 100) / 100;
    if (!row.topic.trim()) return errors.push({ index, message: "Add a topic name." });
    if (!Number.isFinite(max) || max <= 0) return errors.push({ index, message: "Maximum marks must be more than 0." });
    if (!Number.isFinite(scored)) return errors.push({ index, message: "Enter the marks scored (can be negative)." });
    if (scored > max) return errors.push({ index, message: "Marks scored can't exceed the maximum." });
    if (scored < -max) return errors.push({ index, message: "Negative marks look too large for this maximum." });
    const percent = Math.round((Math.max(scored, 0) / max) * 100);
    results.push({
      topic: row.topic.trim().slice(0, 80),
      scored,
      max,
      percent,
      status: statusFor(percent),
      marksAtStake: Math.round((max - Math.max(scored, 0)) * 10) / 10,
    });
  });
  return { results, errors };
}

/**
 * Priority order: learning gaps first, then developing topics; within a group,
 * topics with more marks at stake come first.
 */
export function prioritise(results: TopicAnalysis[]): TopicAnalysis[] {
  const rank: Record<MasteryStatus, number> = { gap: 0, developing: 1, secure: 2 };
  return [...results].sort((a, b) => rank[a.status] - rank[b.status] || b.marksAtStake - a.marksAtStake || a.percent - b.percent);
}

export function toCsv(results: TopicAnalysis[]): string {
  const esc = (s: string) => {
    let v = s;
    if (/^[=+\-@]/.test(v)) v = `'${v}`; // prevent spreadsheet formula injection
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const header = "Topic,Marks scored,Maximum,Percent,Status,Marks at stake";
  const lines = results.map((r) => [esc(r.topic), r.scored, r.max, r.percent, r.status, r.marksAtStake].join(","));
  return [header, ...lines].join("\n");
}
