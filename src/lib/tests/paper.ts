/**
 * Test papers: pick questions by chapter and difficulty, make anti-copying sets (A, B, C…),
 * produce answer keys and the paper map, conduct online via a link, and turn students'
 * responses back into chapter-wise marks for the analyser. Pure and dependency-free.
 */
import { DIFFICULTIES, type Difficulty, type Question } from "./question";

export type Marking = { correct: number; wrong: number };
export type Paper = {
  id: string;
  name: string;
  institute: string;
  durationMin: number;
  marking: Marking;
  questions: Question[]; // master order
  sets: string[]; // ["A"] or ["A","B",…]
  seed: number;
  createdAt: string;
};
export type BlueprintRow = { chapter: string; difficulty: Difficulty | "any"; count: number };

export const SET_NAMES = ["A", "B", "C", "D"] as const;
export const MAX_PAPER_QUESTIONS = 200;
const LETTERS = "ABCDE";

/* ── Seeded randomness (same seed → same paper on every device) ─────────── */

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const hashString = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
};

/* ── Picking questions ────────────────────────────────────────────────── */

/**
 * Picks questions per blueprint row without repeats. `avoid` (ids used in recent papers) are
 * used only when nothing else fits, so repeated tests don't repeat questions.
 */
export function pickQuestions(bank: Question[], rows: BlueprintRow[], seed: number, avoid: Set<string> = new Set()): { picked: Question[]; shortfalls: string[] } {
  const rand = rng(seed);
  const used = new Set<string>();
  const picked: Question[] = [];
  const shortfalls: string[] = [];
  for (const row of rows) {
    const want = Math.max(0, Math.min(MAX_PAPER_QUESTIONS, Math.floor(row.count)));
    if (!want) continue;
    const fits = bank.filter(
      (q) => !used.has(q.id) && (row.chapter === "*" || q.chapter.toLowerCase() === row.chapter.toLowerCase()) && (row.difficulty === "any" || q.difficulty === row.difficulty),
    );
    const fresh = shuffled(fits.filter((q) => !avoid.has(q.id)), rand);
    const reused = shuffled(fits.filter((q) => avoid.has(q.id)), rand);
    const take = [...fresh, ...reused].slice(0, want);
    take.forEach((q) => used.add(q.id));
    picked.push(...take);
    const label = `${row.chapter === "*" ? "Any chapter" : row.chapter} · ${row.difficulty === "any" ? "any level" : row.difficulty}`;
    if (take.length < want) shortfalls.push(`${label}: wanted ${want}, the bank has ${take.length}.`);
    else if (take.some((q) => avoid.has(q.id))) shortfalls.push(`${label}: some questions were used in a recent paper (not enough new ones).`);
  }
  return { picked: picked.slice(0, MAX_PAPER_QUESTIONS), shortfalls };
}

/** Chapters × difficulty counts in a bank, for the blueprint table. */
export function bankStats(bank: Question[]): Array<{ chapter: string; subject: string; counts: Record<Difficulty, number> }> {
  const map = new Map<string, { chapter: string; subject: string; counts: Record<Difficulty, number> }>();
  for (const q of bank) {
    const k = q.chapter.toLowerCase();
    const e = map.get(k) ?? { chapter: q.chapter, subject: q.subject, counts: { easy: 0, medium: 0, hard: 0 } };
    e.counts[q.difficulty] += 1;
    map.set(k, e);
  }
  return [...map.values()].sort((a, b) => a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter));
}

/* ── Sets (A, B, C…) ──────────────────────────────────────────────────── */

export type SetLayout = { set: string; order: number[]; optionOrder: number[][] };

/** Set A = master order. Other sets shuffle question order and options, deterministically. */
export function setLayout(paper: Paper, set: string): SetLayout {
  const n = paper.questions.length;
  if (set === "A" || !paper.sets.includes(set)) {
    return { set: "A", order: [...Array(n).keys()], optionOrder: paper.questions.map((q) => [...q.options.keys()]) };
  }
  const rand = rng((paper.seed ^ hashString(set)) >>> 0);
  const order = shuffled([...Array(n).keys()], rand);
  const optionOrder = order.map((mi) => shuffled([...paper.questions[mi]!.options.keys()], rand));
  return { set, order, optionOrder };
}

/** Answer key for a set, one entry per question as printed ("B", or "A/C" for multi-correct). */
export function setKey(paper: Paper, set: string): string[] {
  const l = setLayout(paper, set);
  return l.order.map((mi, pos) => {
    const q = paper.questions[mi]!;
    return q.answer.map((a) => LETTERS[l.optionOrder[pos]!.indexOf(a)]).sort().join("/");
  });
}

/** Converts a student's answers for a set (printed order, letters) to master order and letters. */
export function toMaster(paper: Paper, set: string, answers: string[]): string[] {
  const l = setLayout(paper, set);
  const out = Array<string>(paper.questions.length).fill("");
  l.order.forEach((mi, pos) => {
    const raw = (answers[pos] ?? "").trim().toUpperCase();
    if (raw.length !== 1) return; // blank, "-" or junk = not attempted
    const shown = LETTERS.indexOf(raw);
    if (shown < 0 || shown >= l.optionOrder[pos]!.length) return;
    out[mi] = LETTERS[l.optionOrder[pos]![shown]!]!;
  });
  return out;
}

/** "1-3, 7: Optics" lines (master numbering) for the paper map converter. */
export function paperMapText(paper: Paper): string {
  const groups = new Map<string, number[]>();
  paper.questions.forEach((q, i) => groups.set(q.chapter, [...(groups.get(q.chapter) ?? []), i + 1]));
  const ranges = (nums: number[]) => {
    const out: string[] = [];
    for (let i = 0; i < nums.length; i++) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j]! + 1) j++;
      out.push(i === j ? `${nums[i]}` : `${nums[i]}-${nums[j]}`);
      i = j;
    }
    return out.join(", ");
  };
  return [...groups.entries()].map(([ch, nums]) => `${ranges(nums)}: ${ch.replace(/^\d+/, (d) => `Ch ${d}`)}`).join("\n");
}

/** Responses table in master order with a KEY row, ready for the paper-map converter. */
export function responsesTable(paper: Paper, entries: Array<{ roll: string; set: string; answers: string[] }>): string[][] {
  const n = paper.questions.length;
  const header = ["Roll no", ...Array.from({ length: n }, (_, i) => `Q${i + 1}`)];
  const key = ["KEY", ...setKey(paper, "A")];
  return [header, key, ...entries.map((e) => [e.roll, ...toMaster(paper, e.set, e.answers)])];
}

export function maxMarks(paper: Paper): number {
  return paper.questions.length * paper.marking.correct;
}

export const difficultyMix = (qs: Question[]) => Object.fromEntries(DIFFICULTIES.map((d) => [d, qs.filter((q) => q.difficulty === d).length])) as Record<Difficulty, number>;

/* ── Online conduct: test link (no answers inside) and response codes ───── */

export type OnlineTest = { v: 1; p: string; n: string; i: string; d: number; s: string; m: [number, number]; q: Array<{ t: string; o: string[] }>; c?: string; b?: string };

/** Batch labels travel inside links and codes, so keep them short and plain. */
export const cleanBatch = (b: unknown) => (typeof b === "string" ? b.replace(/[^\p{L}\p{N} ._/-]/gu, "").trim().slice(0, 40) : "");

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bytesFromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** The student's copy of one set: questions and options in that set's order, never the answers. */
export function onlineTestFor(paper: Paper, set: string, instituteCode?: string | null, batch?: string): OnlineTest {
  const l = setLayout(paper, set);
  const b = cleanBatch(batch);
  return {
    v: 1,
    p: paper.id,
    n: paper.name.slice(0, 80),
    i: paper.institute.slice(0, 80),
    d: paper.durationMin,
    s: l.set,
    m: [paper.marking.correct, paper.marking.wrong],
    q: l.order.map((mi, pos) => ({ t: paper.questions[mi]!.text, o: l.optionOrder[pos]!.map((oi) => paper.questions[mi]!.options[oi]!) })),
    ...(instituteCode && /^HRB-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(instituteCode) ? { c: instituteCode } : {}),
    ...(b ? { b } : {}),
  };
}

export async function encodeOnlineTest(t: OnlineTest): Promise<string> {
  return b64urlFromBytes(await pipe(new TextEncoder().encode(JSON.stringify(t)), new CompressionStream("deflate-raw")));
}

export const MAX_TEST_FRAGMENT = 60_000;

export async function decodeOnlineTest(fragment: string): Promise<OnlineTest | null> {
  const raw = fragment.replace(/^#/, "").trim();
  if (!raw || raw.length > MAX_TEST_FRAGMENT || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(await pipe(bytesFromB64url(raw), new DecompressionStream("deflate-raw")));
    const t = JSON.parse(json) as OnlineTest;
    const okQ = Array.isArray(t.q) && t.q.length > 0 && t.q.length <= MAX_PAPER_QUESTIONS && t.q.every((q) => typeof q.t === "string" && Array.isArray(q.o) && q.o.length >= 2 && q.o.length <= 5 && q.o.every((o) => typeof o === "string"));
    if (t.v !== 1 || typeof t.p !== "string" || typeof t.n !== "string" || typeof t.s !== "string" || !okQ) return null;
    return {
      ...t,
      d: Math.max(0, Math.min(600, Number(t.d) || 0)),
      i: typeof t.i === "string" ? t.i : "",
      c: typeof t.c === "string" && /^HRB-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(t.c) ? t.c : undefined,
      b: cleanBatch(t.b) || undefined,
    };
  } catch {
    return null;
  }
}

/* Response code: "HR1.<payload>.<check>", short enough for one WhatsApp message. */

export type ResponseCode = { p: string; s: string; r: string; a: string; t: number; b?: string };
export type ResponseEntry = { roll: string; set: string; answers: string[]; seconds: number; batch: string };

const check = (s: string) => (hashString(s) % 1679616).toString(36).padStart(4, "0");

export function encodeResponse(r: ResponseCode): string {
  const payload = b64urlFromBytes(new TextEncoder().encode(JSON.stringify(r)));
  return `HR1.${payload}.${check(payload)}`;
}

/** Finds every response code in pasted text (WhatsApp messages, one per line…). */
export function parseResponseCodes(text: string, paperId: string): { entries: ResponseEntry[]; problems: string[] } {
  const problems: string[] = [];
  const byRoll = new Map<string, ResponseEntry>();
  for (const m of text.matchAll(/HR1\.([A-Za-z0-9_-]{8,4000})\.([0-9a-z]{4})/g)) {
    if (check(m[1]!) !== m[2]) {
      problems.push("One code was cut off or edited, so it was skipped. Ask the student to send it again.");
      continue;
    }
    try {
      const r = JSON.parse(new TextDecoder().decode(bytesFromB64url(m[1]!))) as ResponseCode;
      if (r.p !== paperId) {
        problems.push(`A code for a different test was skipped (roll ${String(r.r).slice(0, 20)}).`);
        continue;
      }
      const roll = String(r.r ?? "").trim().slice(0, 40);
      if (!roll) continue;
      const batch = cleanBatch(r.b);
      byRoll.set(`${batch.toLowerCase()}|${roll.toLowerCase()}`, { roll, set: String(r.s ?? "A"), answers: String(r.a ?? "").split(""), seconds: Number(r.t) || 0, batch });
    } catch {
      problems.push("One code couldn't be read, so it was skipped.");
    }
  }
  return { entries: [...byRoll.values()], problems: [...new Set(problems)] };
}
