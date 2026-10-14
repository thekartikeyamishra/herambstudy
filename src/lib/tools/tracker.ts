/**
 * Class progress tracker — pure logic over several saved tests of one class.
 * Topics and students are matched case-insensitively by name / roll number.
 */
import { analyseClass, compareClasses, type ClassComparison, type Dataset } from "./classAnalysis";

export type TrackedTest = { id: string; name: string; date: string; dataset: Dataset };

export type TopicTrend = {
  name: string;
  /** One entry per test (oldest → newest); null when the topic wasn't in that test. */
  series: Array<number | null>;
  latest: number | null;
  /** Change between the last two tests that both included this topic. */
  lastChange: number | null;
};

export type PersistentGap = { student: string; topic: string; tests: number };

export type ClassTrack = {
  tests: Array<{ id: string; name: string; date: string; students: number; average: number | null }>;
  topics: TopicTrend[];
  persistent: PersistentGap[];
  latestComparison: ClassComparison | null;
};

const key = (s: string) => s.trim().toLowerCase();

export function sortTests<T extends { date: string; name: string }>(tests: T[]): T[] {
  return [...tests].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

/**
 * @param minConsecutive a gap is "persistent" when the student was below 50% in this
 *   topic in at least this many of their most recent attempts in a row (default 2).
 */
export function trackClass(input: TrackedTest[], minConsecutive = 2): ClassTrack {
  const tests = sortTests(input);
  const analyses = tests.map((t) => analyseClass(t.dataset));

  // Topic order: first appearance across tests.
  const topicNames = new Map<string, string>();
  tests.forEach((t) => t.dataset.topics.forEach((tp) => topicNames.has(key(tp.name)) || topicNames.set(key(tp.name), tp.name)));

  const topics: TopicTrend[] = [...topicNames.entries()].map(([k, name]) => {
    const series = analyses.map((a) => {
      const t = a.topics.find((x) => key(x.name) === k);
      return t && t.attempted > 0 ? t.average : null;
    });
    const present = series.filter((v): v is number => v !== null);
    const latest = series[series.length - 1] ?? null;
    const lastChange = present.length >= 2 ? present[present.length - 1]! - present[present.length - 2]! : null;
    return { name, series, latest, lastChange };
  });

  // Persistent gaps: walk each student's attempts newest → oldest per topic.
  const studentNames = new Map<string, string>();
  analyses.forEach((a) => a.students.forEach((s) => studentNames.has(key(s.id)) || studentNames.set(key(s.id), s.id)));
  const persistent: PersistentGap[] = [];
  for (const [sk, student] of studentNames) {
    for (const [tk, topic] of topicNames) {
      let run = 0;
      for (let i = tests.length - 1; i >= 0; i--) {
        const ti = tests[i]!.dataset.topics.findIndex((x) => key(x.name) === tk);
        const st = analyses[i]!.students.find((x) => key(x.id) === sk);
        const p = ti >= 0 && st ? st.percents[ti] : null;
        if (p === null || p === undefined) continue; // absent / not tested: skip, don't break the run
        if (p < 50) run += 1;
        else break;
      }
      if (run >= minConsecutive) persistent.push({ student, topic, tests: run });
    }
  }
  persistent.sort((a, b) => b.tests - a.tests || a.topic.localeCompare(b.topic) || a.student.localeCompare(b.student));

  const n = tests.length;
  return {
    tests: tests.map((t, i) => ({ id: t.id, name: t.name, date: t.date, students: t.dataset.students.length, average: analyses[i]!.classAverage })),
    topics,
    persistent,
    latestComparison: n >= 2 ? compareClasses(tests[n - 2]!.dataset, tests[n - 1]!.dataset) : null,
  };
}

/* ── Student term reports ──────────────────────────────────────────────── */

export type StudentTopicLine = { topic: string; first: number | null; latest: number | null; change: number | null; attempts: number };

export type StudentTermReport = {
  student: string;
  testsTaken: number;
  /** Overall % per test (oldest → newest); null where absent. */
  overall: Array<number | null>;
  topics: StudentTopicLine[];
  strengths: string[];
  improved: string[];
  focus: string[];
};

/**
 * One report per student across all saved tests of a class. The more tests a
 * class has, the more useful these become — value that grows with use.
 */
export function studentTermReports(input: TrackedTest[]): StudentTermReport[] {
  const tests = sortTests(input);
  const analyses = tests.map((t) => analyseClass(t.dataset));
  const topicNames = new Map<string, string>();
  tests.forEach((t) => t.dataset.topics.forEach((tp) => topicNames.has(key(tp.name)) || topicNames.set(key(tp.name), tp.name)));
  const students = new Map<string, string>();
  analyses.forEach((a) => a.students.forEach((s) => students.has(key(s.id)) || students.set(key(s.id), s.id)));

  return [...students.entries()].map(([sk, id]) => {
    const rows = analyses.map((a) => a.students.find((s) => key(s.id) === sk) ?? null);
    const overall = rows.map((r) => r?.overall ?? null);
    const topics: StudentTopicLine[] = [...topicNames.entries()].map(([tk, topic]) => {
      const values: number[] = [];
      tests.forEach((t, i) => {
        const ti = t.dataset.topics.findIndex((x) => key(x.name) === tk);
        const p = ti >= 0 ? rows[i]?.percents[ti] : null;
        if (typeof p === "number") values.push(p);
      });
      const first = values[0] ?? null;
      const latest = values.length ? values[values.length - 1]! : null;
      return { topic, first, latest, change: values.length >= 2 ? latest! - first! : null, attempts: values.length };
    });
    const attempted = topics.filter((t) => t.latest !== null);
    return {
      student: id,
      testsTaken: rows.filter((r) => r && r.overall !== null).length,
      overall,
      topics,
      strengths: attempted.filter((t) => t.latest! >= 75).sort((a, b) => b.latest! - a.latest!).slice(0, 3).map((t) => t.topic),
      improved: attempted.filter((t) => (t.change ?? 0) >= 10).sort((a, b) => b.change! - a.change!).slice(0, 3).map((t) => t.topic),
      focus: attempted.filter((t) => t.latest! < 50).sort((a, b) => a.latest! - b.latest!).slice(0, 3).map((t) => t.topic),
    };
  }).sort((a, b) => a.student.localeCompare(b.student, undefined, { numeric: true }));
}
