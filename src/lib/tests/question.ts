/**
 * Question bank model + a forgiving parser for questions teachers already have in Word,
 * PDF-copied text or WhatsApp notes. Pure; runs in the browser and in tests.
 *
 *   1. What is the SI unit of force?
 *   (a) Joule  (b) Newton  (c) Watt  (d) Pascal
 *   Ans: b
 *   Chapter: Laws of motion | Difficulty: easy
 */
import { z } from "zod";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const MAX_OPTIONS = 5;
export const MAX_BANK = 2000;

export const questionSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{4,40}$/),
    text: z.string().trim().min(1).max(2000),
    options: z.array(z.string().trim().min(1).max(500)).min(2).max(MAX_OPTIONS),
    /** Indexes of correct options (one or more). */
    answer: z.array(z.number().int().min(0).max(MAX_OPTIONS - 1)).min(1).max(MAX_OPTIONS),
    subject: z.string().trim().max(60).default(""),
    chapter: z.string().trim().min(1).max(80),
    difficulty: z.enum(DIFFICULTIES).default("medium"),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    createdAt: z.string().max(40).default(""),
  })
  .strict()
  .refine((q) => q.answer.every((a) => a < q.options.length), "Answer must be one of the options");

export type Question = z.infer<typeof questionSchema>;
export type ParseResult = { questions: Question[]; errors: string[] };

const OPTION_START = /^\s*(?:\(?([a-eA-E1-5])[).:\]]|\[([a-eA-E1-5])\])\s+/;
const INLINE_OPTIONS = /(?:^|\s)\(?([a-eA-E])[).]\s+/g;
const ANSWER = /^\s*(?:ans(?:wer)?|correct(?:\s+answer)?|key)\s*[:.\-–]?\s*\(?\s*([a-eA-E1-5](?:\s*[,&/]\s*[a-eA-E1-5])*)\s*\)?\s*$/i;
const META = /^\s*(chapter|topic|subject|difficulty|level|tags?)\s*[:\-–]\s*(.+)$/i;
const NUMBERED = /^\s*(?:q(?:ues(?:tion)?)?\.?\s*)?(\d{1,4})\s*[.):\]]\s*(.*)$/i;

const letterIndex = (c: string) => (/[1-5]/.test(c) ? Number(c) - 1 : c.toLowerCase().charCodeAt(0) - 97);

export function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 16);
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

function normDifficulty(v: string): Difficulty | null {
  const t = v.trim().toLowerCase();
  if (/^(e|easy|simple|basic|level\s*1|l1|1)$/.test(t)) return "easy";
  if (/^(m|med|medium|moderate|level\s*2|l2|2)$/.test(t)) return "medium";
  if (/^(h|hard|difficult|tough|advanced|level\s*3|l3|3)$/.test(t)) return "hard";
  return null;
}

/** Splits "(a) x (b) y (c) z (d) w" written on one line. */
function splitInlineOptions(line: string): string[] | null {
  const marks = [...line.matchAll(INLINE_OPTIONS)];
  if (marks.length < 2) return null;
  const letters = marks.map((m) => m[1]!.toLowerCase());
  if (letters.some((l, i) => l !== String.fromCharCode(97 + i))) return null;
  const out: string[] = [];
  marks.forEach((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1]!.index! : line.length;
    out.push(line.slice(start, end).trim());
  });
  return out.every(Boolean) ? out : null;
}

/**
 * Parses pasted questions. Blank lines or a new number start a new question. Missing chapter /
 * difficulty fall back to `defaults`. Every problem is reported with the question number.
 */
export function parseQuestions(text: string, defaults: { subject?: string; chapter?: string; difficulty?: Difficulty } = {}): ParseResult {
  const errors: string[] = [];
  const blocks: string[][] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.some((l) => l.trim())) blocks.push(cur);
    cur = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/ /g, " ").trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    // A numbered line after options/answer starts a new question even without a blank line.
    if (NUMBERED.test(line) && cur.some((l) => OPTION_START.test(l) || ANSWER.test(l))) flush();
    cur.push(line);
  }
  flush();

  const questions: Question[] = [];
  blocks.slice(0, MAX_BANK).forEach((lines, bi) => {
    const label = `Question ${bi + 1}`;
    const stem: string[] = [];
    const options: string[] = [];
    let answer: number[] = [];
    let chapter = defaults.chapter ?? "";
    let subject = defaults.subject ?? "";
    let difficulty: Difficulty = defaults.difficulty ?? "medium";
    const tags: string[] = [];
    for (const line of lines) {
      const ans = ANSWER.exec(line);
      if (ans) {
        answer = ans[1]!.split(/[,&/\s]+/).filter(Boolean).map(letterIndex);
        continue;
      }
      const metaParts = line.split("|").map((p) => META.exec(p));
      if (metaParts.every(Boolean)) {
        for (const m of metaParts) {
          const key = m![1]!.toLowerCase();
          const value = m![2]!.trim();
          if (key === "chapter" || key === "topic") chapter = value;
          else if (key === "subject") subject = value;
          else if (key === "difficulty" || key === "level") difficulty = normDifficulty(value) ?? difficulty;
          else tags.push(...value.split(/[,;]/).map((t) => t.trim()).filter(Boolean));
        }
        continue;
      }
      const inline = stem.length && !options.length ? splitInlineOptions(line) : null;
      if (inline) {
        options.push(...inline);
        continue;
      }
      const opt = OPTION_START.exec(line);
      if (opt && stem.length) {
        options.push(line.slice(opt[0].length).trim());
        continue;
      }
      if (options.length) {
        // Continuation of the last option.
        options[options.length - 1] = `${options[options.length - 1]} ${line.trim()}`;
        continue;
      }
      const num = stem.length === 0 ? NUMBERED.exec(line) : null;
      stem.push(num ? num[2]! : line.trim());
    }
    const q = {
      id: newId(),
      text: stem.join(" ").trim(),
      options: options.slice(0, MAX_OPTIONS),
      answer: [...new Set(answer)],
      subject: subject.slice(0, 60),
      chapter: chapter.slice(0, 80),
      difficulty,
      tags: tags.slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    if (!q.text) return errors.push(`${label}: no question text.`);
    if (q.options.length < 2) return errors.push(`${label}: needs at least 2 options written as (a) … (b) … or A. … B. …`);
    if (!q.answer.length) return errors.push(`${label}: add the answer on its own line, e.g. “Ans: b”.`);
    if (q.answer.some((a) => a >= q.options.length)) return errors.push(`${label}: the answer isn't one of its ${q.options.length} options.`);
    if (!q.chapter) return errors.push(`${label}: add “Chapter: …” or choose a default chapter.`);
    const parsed = questionSchema.safeParse(q);
    if (!parsed.success) return errors.push(`${label}: ${parsed.error.issues[0]?.message ?? "invalid"}.`);
    questions.push(parsed.data);
  });
  return { questions, errors };
}

/** Sample questions for the 15-second demo. Simple, verifiable facts; clearly labelled as samples. */
export function sampleQuestionText(): string {
  return [
    "1. What is the SI unit of force?\n(a) Joule (b) Newton (c) Watt (d) Pascal\nAns: b\nSubject: Physics | Chapter: Laws of motion | Difficulty: easy",
    "2. A body moving with constant velocity has an acceleration of\n(a) zero (b) 9.8 m/s² (c) 1 m/s² (d) it depends on the mass\nAns: a\nSubject: Physics | Chapter: Laws of motion | Difficulty: medium",
    "3. The value of sin 30° is\n(a) 1 (b) √3/2 (c) 1/2 (d) 0\nAns: c\nSubject: Maths | Chapter: Trigonometry | Difficulty: easy",
    "4. The derivative of x² with respect to x is\n(a) x (b) 2x (c) x²/2 (d) 2\nAns: b\nSubject: Maths | Chapter: Calculus | Difficulty: easy",
    "5. The pH of pure water at 25 °C is\n(a) 0 (b) 14 (c) 1 (d) 7\nAns: d\nSubject: Chemistry | Chapter: Ionic equilibrium | Difficulty: easy",
    "6. The chemical symbol of sodium is\n(a) So (b) Sd (c) Na (d) S\nAns: c\nSubject: Chemistry | Chapter: Periodic table | Difficulty: easy",
    "7. Which organelle is called the powerhouse of the cell?\n(a) Nucleus (b) Mitochondria (c) Ribosome (d) Golgi body\nAns: b\nSubject: Biology | Chapter: Cell | Difficulty: easy",
    "8. The basic accounting equation is\n(a) Assets = Liabilities + Capital (b) Assets = Capital − Liabilities (c) Capital = Assets + Liabilities (d) Liabilities = Assets + Capital\nAns: a\nSubject: Accountancy | Chapter: Accounting basics | Difficulty: medium",
  ].join("\n\n");
}
