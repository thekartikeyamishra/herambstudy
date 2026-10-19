/**
 * Teaching summary — shared by browser and server.
 *
 * Design for cost and safety:
 *  1. All numbers are computed deterministically in code (classAnalysis.ts).
 *  2. Only AGGREGATES are ever sent to a model: topic names, class averages,
 *     counts. Never roll numbers, names or individual marks.
 *  3. A rule-based summary with the same shape always exists, so AI is an
 *     enhancement: if it's off, over quota, slow or wrong, users still get value.
 */
import { z } from "zod";
import type { ClassAnalysis, ClassComparison } from "@/lib/tools/classAnalysis";

export const PROMPT_VERSION = "summary-v1";

const topicName = z.string().trim().min(1).max(80).regex(/^[^<>{}`]*$/);

export const summaryInputSchema = z
  .object({
    students: z.number().int().min(1).max(500),
    classAverage: z.number().min(0).max(100).nullable(),
    topics: z
      .array(
        z.object({
          name: topicName,
          average: z.number().min(0).max(100),
          attempted: z.number().int().min(0).max(500),
          belowHalf: z.number().int().min(0).max(500),
          action: z.enum(["whole_class", "small_group", "maintain", "no_data"]),
        }),
      )
      .min(1)
      .max(40),
    followUp: z
      .object({
        closed: z.number().int().min(0).max(20000),
        stillBelow: z.number().int().min(0).max(20000),
        slipped: z.number().int().min(0).max(20000),
        improved: z.array(topicName).max(40),
        declined: z.array(topicName).max(40),
      })
      .nullable()
      .default(null),
    audience: z.enum(["teacher"]).default("teacher"),
  })
  .strip();

export type SummaryInput = z.infer<typeof summaryInputSchema>;

export const summaryOutputSchema = z.object({
  headline: z.string().trim().min(5).max(220),
  priorities: z.array(z.string().trim().min(3).max(240)).min(1).max(3),
  parentNote: z.string().trim().min(10).max(600),
  caution: z.string().trim().max(240).default(""),
});

export type SummaryText = z.infer<typeof summaryOutputSchema>;
export type Summary = SummaryText & { source: "ai" | "rules"; note?: string };

/** Builds the aggregate-only payload from a class analysis (runs in the browser). */
/** Topic names go to the model, so strip prompt-shaping characters and never send an empty name. */
const safeTopic = (name: string) => name.slice(0, 80).replace(/[<>{}`]/g, "").trim() || "Unnamed topic";

export function toSummaryInput(a: ClassAnalysis, c: ClassComparison | null = null): SummaryInput {
  return {
    students: a.students.length,
    classAverage: a.classAverage,
    topics: a.topics.slice(0, 40).map((t) => ({
      name: safeTopic(t.name),
      average: t.average,
      attempted: t.attempted,
      belowHalf: t.belowHalf.length,
      action: t.action,
    })),
    followUp: c
      ? {
          closed: c.totals.closed,
          stillBelow: c.totals.stillBelow,
          slipped: c.totals.slipped,
          improved: c.topics.filter((t) => t.verdict === "improved").map((t) => safeTopic(t.name)),
          declined: c.topics.filter((t) => t.verdict === "declined").map((t) => safeTopic(t.name)),
        }
      : null,
    audience: "teacher",
  };
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Deterministic summary — zero cost, always available. */
export function ruleBasedSummary(input: SummaryInput): Summary {
  const whole = input.topics.filter((t) => t.action === "whole_class").sort((a, b) => a.average - b.average);
  const small = input.topics.filter((t) => t.action === "small_group").sort((a, b) => b.belowHalf - a.belowHalf);
  const secure = input.topics.filter((t) => t.action === "maintain").sort((a, b) => b.average - a.average);

  const headline = whole.length
    ? `${list(whole.slice(0, 2).map((t) => t.name))} need${whole.length === 1 && whole.slice(0, 2).length === 1 ? "s" : ""} reteaching for the whole class; ${secure.length ? `${secure[0]!.name} is secure` : "no topic is fully secure yet"}.`
    : small.length
      ? `No topic needs whole-class reteaching — ${small.length} topic${small.length === 1 ? "" : "s"} need a short recap with a few students.`
      : "Every topic is at a secure level for all students who attempted it.";

  const priorities: string[] = [];
  for (const t of whole.slice(0, 2)) {
    priorities.push(`Reteach ${t.name} to the whole class (average ${t.average}%, ${t.belowHalf} of ${t.attempted} below 50%). Check the type of mistake first.`);
  }
  for (const t of small.slice(0, 3 - priorities.length)) {
    priorities.push(`Run a 15-minute recap on ${t.name} with the ${t.belowHalf} student${t.belowHalf === 1 ? "" : "s"} below 50%.`);
  }
  if (priorities.length < 3 && secure.length) priorities.push(`Keep ${secure[0]!.name} in mixed practice so it stays secure.`);
  if (!priorities.length) priorities.push("Use a timed, mixed practice set to check performance holds under exam conditions.");

  const strong = secure.slice(0, 2).map((t) => t.name);
  const focus = [...whole, ...small].slice(0, 2).map((t) => t.name);
  let parentNote = `In the latest test, the class did well in ${strong.length ? list(strong) : "several topics"}.`;
  if (focus.length) parentNote += ` Over the next two weeks we're focusing on ${list(focus)}, with short targeted practice.`;
  if (input.followUp) {
    parentNote += ` Since the previous test, ${input.followUp.closed} topic gap${input.followUp.closed === 1 ? " has" : "s have"} closed across the class.`;
  }
  parentNote += " Please encourage regular revision at home.";

  return {
    headline,
    priorities: priorities.slice(0, 3),
    parentNote,
    caution: "Based on one test's topic averages; confirm with the answer sheets before reteaching.",
    source: "rules",
  };
}

export function buildPrompt(input: SummaryInput): { system: string; user: string } {
  const system = [
    "You help Indian school and coaching teachers turn class test statistics into a short, practical plan.",
    "Use ONLY the numbers provided. Never invent students, scores, causes or outcomes. Never promise results.",
    "Plain, warm, simple English (readers may use English as a second language). No jargon.",
    'Reply with ONLY a JSON object: {"headline": string (≤ 30 words), "priorities": [up to 3 strings, each one concrete action ≤ 35 words], "parentNote": string (≤ 80 words, suitable to forward to parents, about the class not any individual), "caution": string (≤ 25 words)}.',
  ].join("\n");
  // Compact, deterministic encoding keeps input tokens low and makes responses cacheable.
  const user = JSON.stringify({
    students: input.students,
    classAverage: input.classAverage,
    rules: "whole_class = ≥1/3 of attempting students below 50%; small_group = some below 50%; maintain = none below 50%",
    topics: input.topics.map((t) => [t.name, t.average, t.belowHalf, t.attempted, t.action]),
    topicsFormat: ["name", "classAverage%", "studentsBelow50%", "studentsAttempted", "action"],
    followUp: input.followUp,
  });
  return { system, user };
}

/** Parses a model reply strictly; returns null if it isn't the expected JSON. */
export function parseModelOutput(text: string): SummaryText | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = summaryOutputSchema.safeParse(JSON.parse(trimmed.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
