"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FictionalDataLabel } from "@/components/ui/Primitives";
import { useConnectedInstitute } from "@/components/founding/InstituteBar";
import { downloadText } from "@/components/resources/ToolShell";
import { recordUsage } from "@/lib/client/usage";
import { emptyStore, loadStore, mergeQuestions, parseStore, recentlyUsed, saveStore, type TestStore } from "@/lib/client/testStore";
import { DIFFICULTIES, newId, parseQuestions, sampleQuestionText, type Difficulty } from "@/lib/tests/question";
import {
  bankStats, difficultyMix, encodeOnlineTest, maxMarks, onlineTestFor, paperMapText, parseResponseCodes, pickQuestions, responsesTable, SET_NAMES, setKey, setLayout,
  type BlueprintRow, type Paper, type ResponseEntry,
} from "@/lib/tests/paper";
import { autoBlueprint, DIFFICULTY_MIXES, FLAG_TEXT, itemAnalysis, MARKING_PRESETS, parseBatches, seatingPlan, suggestedDifficulty, type BatchSeating, type ItemStat } from "@/lib/tests/plan";
import { applyPaperMap, parsePaperMap } from "@/lib/tools/paperMap";
import { parseTable } from "@/lib/tools/classAnalysis";
import { rowsToTsv } from "@/lib/tools/xlsx";
import { whatsappLink } from "@/lib/institute/share";
import { cn } from "@/lib/cn";

export const ANALYSER_PREFILL_KEY = "heramb.analyser-prefill.v1";
type Tab = "questions" | "paper" | "conduct" | "results";
const SAMPLE_PAPER_NAME = "Sample paper (fictional)";

export function TestBuilder() {
  const inst = useConnectedInstitute();
  const [store, setStore] = useState<TestStore>(emptyStore());
  const [status, setStatus] = useState<"loading" | "ok" | "unavailable" | "damaged">("loading");
  const [tab, setTab] = useState<Tab>("questions");
  const [paperId, setPaperId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [retest, setRetest] = useState<string[]>([]);

  useEffect(() => {
    const r = loadStore();
    setStore(r.store);
    setStatus(r.status);
    const last = r.store.papers.at(-1);
    if (last) setPaperId(last.id);
    // "Make a retest" from the analyser: #retest=<chapters>
    const m = /#retest=([^&]+)/.exec(window.location.hash);
    if (m) {
      try {
        setRetest(decodeURIComponent(m[1]!).split("|").map((c) => c.trim().slice(0, 80)).filter(Boolean).slice(0, 10));
      } catch {
        /* malformed link */
      }
      setTab(r.store.questions.length ? "paper" : "questions");
      if (!r.store.questions.length) setMsg({ kind: "error", text: "Add questions for these chapters to your bank first, then make the retest." });
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function commit(next: TestStore, ok?: string) {
    const err = saveStore(next);
    setStore(next);
    setMsg(err ? { kind: "error", text: err } : ok ? { kind: "ok", text: ok } : null);
  }

  const paper = store.papers.find((p) => p.id === paperId) ?? null;

  /** The 15-second "aha": a complete two-set paper, print-ready, from sample questions. */
  function samplePaper() {
    const { questions } = parseQuestions(sampleQuestionText());
    const merged = mergeQuestions(store.questions, questions);
    const bank = merged.questions;
    const ids = new Set(questions.map((q) => q.text));
    const sampleQs = bank.filter((q) => ids.has(q.text));
    const p: Paper = {
      id: newId(), name: SAMPLE_PAPER_NAME, institute: inst?.name ?? "Your institute", durationMin: 15,
      marking: { correct: 4, wrong: 1 }, questions: sampleQs, sets: ["A", "B"], seed: Math.floor(Math.random() * 1e9), createdAt: new Date().toISOString(),
    };
    commit({ ...store, questions: bank, papers: [...store.papers, p] }, "Sample paper ready: 8 questions, sets A and B, answer key and online link.");
    setPaperId(p.id);
    setTab("conduct");
  }

  if (status === "loading") return <div className="min-h-[40vh]" aria-busy="true" />;

  const tabs: Array<[Tab, string, boolean]> = [
    ["questions", `1 · Question bank (${store.questions.length})`, true],
    ["paper", "2 · Make a paper", store.questions.length > 0],
    ["conduct", "3 · Print or conduct online", Boolean(paper)],
    ["results", "4 · Results", Boolean(paper)],
  ];

  return (
    <div data-testid="test-builder">
      {store.questions.length === 0 && store.papers.length === 0 ? (
        <div className="mb-6 rounded-xl border border-brand/30 bg-brand-tint/40 p-5">
          <p className="font-semibold text-ink">See it work in 10 seconds</p>
          <p className="mt-1 text-sm text-ink-soft">One tap makes a complete sample paper: two shuffled sets, answer keys, an OMR sheet and an online test link. Then add your own questions.</p>
          <Button className="mt-3" onClick={samplePaper}>Make a sample paper</Button>
        </div>
      ) : null}
      {status === "unavailable" ? <p role="alert" className="field-error mb-4">This browser isn't allowing saving (private mode?). You can still make papers, but export a backup before closing.</p> : null}
      {status === "damaged" ? <p role="status" className="mb-4 text-sm text-warn">Some saved items were damaged and were skipped; everything else loaded.</p> : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Test builder steps">
        {tabs.map(([k, label, enabled]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} disabled={!enabled} onClick={() => setTab(k)}
            className={cn("min-h-11 rounded-full border px-4 text-sm disabled:opacity-40", tab === k ? "border-brand bg-brand-tint/60 font-medium text-ink" : "border-line-strong text-ink-soft")}>
            {label}
          </button>
        ))}
      </div>
      {msg ? <p role={msg.kind === "error" ? "alert" : "status"} className={cn("mt-4 text-sm", msg.kind === "error" ? "text-gap" : "text-good")}>{msg.text}</p> : null}

      <div className="mt-6">
        {tab === "questions" ? <QuestionsStep store={store} commit={commit} onSample={samplePaper} /> : null}
        {tab === "paper" ? (
          <PaperStep store={store} institute={inst?.name ?? ""} retest={retest} onCreate={(p) => { commit({ ...store, papers: [...store.papers, p] }, `“${p.name}” is ready.`); setPaperId(p.id); setTab("conduct"); if (p.name !== SAMPLE_PAPER_NAME) recordUsage("paper_created"); }} />
        ) : null}
        {tab === "conduct" && paper ? <ConductStep paper={paper} papers={store.papers} onPick={setPaperId} instituteCode={inst?.code ?? null} /> : null}
        {tab === "results" && paper ? (
          <ResultsStep paper={paper} onRetag={(changes) => {
            const by = new Map(changes.map((c) => [c.id, c.difficulty]));
            commit({ ...store, questions: store.questions.map((q) => (by.has(q.id) ? { ...q, difficulty: by.get(q.id)! } : q)) }, `Updated the difficulty of ${changes.length} question${changes.length === 1 ? "" : "s"}.`);
          }} />
        ) : null}
      </div>
    </div>
  );
}

/* ── 1. Question bank ─────────────────────────────────────────────────── */

function QuestionsStep({ store, commit, onSample }: { store: TestStore; commit: (s: TestStore, ok?: string) => void; onSample: () => void }) {
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [errors, setErrors] = useState<string[]>([]);
  const stats = useMemo(() => bankStats(store.questions), [store.questions]);

  function add() {
    const r = parseQuestions(text, { subject: subject.trim(), chapter: chapter.trim(), difficulty });
    setErrors(r.errors);
    if (!r.questions.length) return;
    const m = mergeQuestions(store.questions, r.questions);
    commit({ ...store, questions: m.questions }, `Added ${m.added} question${m.added === 1 ? "" : "s"}${m.duplicates ? ` (${m.duplicates} duplicate${m.duplicates === 1 ? "" : "s"} skipped)` : ""}${r.errors.length ? `; ${r.errors.length} need fixing (below)` : ""}.`);
    if (!r.errors.length) setText("");
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10_000_000) return commit(store, undefined);
    try {
      const r = parseStore(JSON.parse(await file.text()));
      const m = mergeQuestions(store.questions, r.store.questions);
      const papers = [...store.papers, ...r.store.papers.filter((p) => !store.papers.some((x) => x.id === p.id))];
      commit({ ...store, questions: m.questions, papers }, `Imported ${m.added} questions and ${papers.length - store.papers.length} papers.`);
    } catch {
      setErrors(["That file isn't a Heramb question-bank backup."]);
    }
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="add-q-title">
        <h3 id="add-q-title" className="font-sans text-lg font-semibold">Add questions</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Paste questions from Word, a PDF or your notes. Each question: the question, its options as (a) … (b) … or A. … B. …, and “Ans: b”.
          Optional line: “Chapter: … | Difficulty: easy/medium/hard”. Leave a blank line between questions.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div><label htmlFor="q-subject" className="field-label">Default subject</label><input id="q-subject" className="field-input" maxLength={60} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics" /></div>
          <div><label htmlFor="q-chapter" className="field-label">Default chapter</label><input id="q-chapter" className="field-input" maxLength={80} value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Kinematics" /></div>
          <div>
            <label htmlFor="q-diff" className="field-label">Default difficulty</label>
            <select id="q-diff" className="field-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}</select>
          </div>
        </div>
        <label htmlFor="q-text" className="field-label mt-3">Questions</label>
        <textarea id="q-text" rows={10} className="field-input font-mono text-sm" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={"1. What is the SI unit of force?\n(a) Joule (b) Newton (c) Watt (d) Pascal\nAns: b\nChapter: Laws of motion | Difficulty: easy"} />
        {errors.length ? <ul role="alert" className="mt-2 space-y-1 text-sm text-gap">{errors.slice(0, 12).map((e) => <li key={e}>• {e}</li>)}</ul> : null}
        <div className="mt-3 flex flex-wrap gap-3">
          <Button onClick={add} disabled={!text.trim()}>Add to bank</Button>
          <Button variant="secondary" onClick={() => setText(sampleQuestionText())}>Paste sample questions</Button>
          {store.questions.length === 0 ? <Button variant="ghost" onClick={onSample}>Make a sample paper</Button> : null}
        </div>
      </section>

      <section aria-labelledby="bank-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="bank-title" className="font-sans text-lg font-semibold">Your bank: {store.questions.length} questions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!store.questions.length} onClick={() => downloadText(`heramb-question-bank-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ v: 1, questions: store.questions, papers: store.papers }), "application/json")}>Export backup</Button>
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong bg-paper-raised px-5 text-[0.9375rem] font-medium text-ink hover:bg-paper-sunk has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
              Import backup<input type="file" accept=".json,application/json" className="sr-only" onChange={onImport} />
            </label>
          </div>
        </div>
        <p className="mt-1 text-xs text-ink-muted">Saved in this browser only. Export a backup to move it to another device or share it with another teacher.</p>
        {stats.length ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm" data-testid="bank-stats">
              <thead className="bg-paper-raised text-xs text-ink-muted"><tr><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Chapter</th><th className="px-3 py-2">Easy</th><th className="px-3 py-2">Medium</th><th className="px-3 py-2">Hard</th><th className="px-3 py-2"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.chapter} className="border-t border-line">
                    <td className="px-3 py-1.5 text-ink-muted">{s.subject || "—"}</td><td className="px-3 py-1.5 font-medium">{s.chapter}</td>
                    <td className="tabular px-3 py-1.5">{s.counts.easy}</td><td className="tabular px-3 py-1.5">{s.counts.medium}</td><td className="tabular px-3 py-1.5">{s.counts.hard}</td>
                    <td className="px-3 py-1.5 text-right">
                      <button type="button" className="text-xs text-gap underline underline-offset-4" onClick={() => {
                        if (window.confirm(`Delete all ${s.counts.easy + s.counts.medium + s.counts.hard} questions in “${s.chapter}”? Papers already made keep their copy.`)) {
                          commit({ ...store, questions: store.questions.filter((q) => q.chapter.toLowerCase() !== s.chapter.toLowerCase()) }, `Deleted “${s.chapter}”.`);
                        }
                      }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-3 text-sm text-ink-muted">No questions yet.</p>}
      </section>
    </div>
  );
}

/* ── 2. Make a paper ──────────────────────────────────────────────────── */

function PaperStep({ store, institute, retest, onCreate }: { store: TestStore; institute: string; retest: string[]; onCreate: (p: Paper) => void }) {
  const stats = useMemo(() => bankStats(store.questions), [store.questions]);
  const [name, setName] = useState("");
  const [inst, setInst] = useState(institute);
  const [duration, setDuration] = useState("30");
  const [correct, setCorrect] = useState("4");
  const [wrong, setWrong] = useState("1");
  const [sets, setSets] = useState(2);
  const [rows, setRows] = useState<BlueprintRow[]>(() =>
    retest.length ? retest.map((chapter) => ({ chapter, difficulty: "any", count: 5 })) : [{ chapter: "*", difficulty: "any", count: Math.min(20, store.questions.length) }],
  );
  const [problems, setProblems] = useState<string[]>([]);
  const [preset, setPreset] = useState("");
  const [autoChapters, setAutoChapters] = useState<string[]>(() => retest);
  const [autoTotal, setAutoTotal] = useState("20");
  const [mixId, setMixId] = useState(DIFFICULTY_MIXES[0]!.id);
  const [autoNote, setAutoNote] = useState("");

  useEffect(() => setInst((v) => v || institute), [institute]);

  function applyPreset(id: string) {
    setPreset(id);
    const p = MARKING_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setCorrect(String(p.correct));
    setWrong(String(p.wrong));
    const n = rows.reduce((s, r) => s + (r.count || 0), 0);
    if (n) setDuration(String(Math.max(5, Math.ceil(n * p.minutesPerQuestion))));
  }

  function makeAuto() {
    const mix = DIFFICULTY_MIXES.find((m) => m.id === mixId) ?? DIFFICULTY_MIXES[0]!;
    const want = Math.max(1, Math.min(200, Math.floor(Number(autoTotal) || 0)));
    const chapters = autoChapters.length ? autoChapters : stats.map((s) => s.chapter);
    const r = autoBlueprint(store.questions, chapters, want, mix.share);
    if (!r.rows.length) return setAutoNote("None of those chapters has questions in your bank yet.");
    setRows(r.rows);
    setAutoNote(r.shortBy ? `The bank has ${want - r.shortBy} of the ${want} questions you asked for in these chapters. Add more questions or pick more chapters.` : `Blueprint filled: ${want} questions over ${new Set(r.rows.map((x) => x.chapter)).size} chapters. Adjust any row below.`);
    const p = MARKING_PRESETS.find((x) => x.id === preset);
    if (p) setDuration(String(Math.max(5, Math.ceil((want - r.shortBy) * p.minutesPerQuestion))));
  }

  const total = rows.reduce((s, r) => s + (r.count || 0), 0);
  const num = (v: string, d: number, max: number) => {
    const x = Number(v.replace(",", "."));
    return Number.isFinite(x) && x >= 0 && x <= max ? x : d;
  };

  function create() {
    const seed = Math.floor(Math.random() * 1e9);
    const { picked, shortfalls } = pickQuestions(store.questions, rows, seed, recentlyUsed(store.papers));
    if (!picked.length) return setProblems(["No questions match. Add questions to the bank or change the chapters."]);
    setProblems(shortfalls);
    onCreate({
      id: newId(), name: name.trim() || `Test ${new Date().toLocaleDateString("en-IN")}`, institute: inst.trim().slice(0, 80), durationMin: Math.round(num(duration, 30, 600)),
      marking: { correct: num(correct, 4, 100) || 4, wrong: num(wrong, 1, 100) }, questions: picked, sets: SET_NAMES.slice(0, sets), seed, createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2"><label htmlFor="p-name" className="field-label">Test name</label><input id="p-name" className="field-input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly test 7 · 11 JEE A" /></div>
        <div><label htmlFor="p-inst" className="field-label">Institute name (printed)</label><input id="p-inst" className="field-input" maxLength={80} value={inst} onChange={(e) => setInst(e.target.value)} /></div>
        <div className="sm:col-span-3">
          <label htmlFor="p-preset" className="field-label">Exam pattern (marking)</label>
          <select id="p-preset" className="field-input" value={preset} onChange={(e) => applyPreset(e.target.value)}>
            <option value="">Custom marking</option>
            {MARKING_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <p className="field-hint">Sets the marks and a suggested time. Exams change their pattern from year to year, so check the current official notice for question counts.</p>
        </div>
        <div><label htmlFor="p-dur" className="field-label">Time (minutes)</label><input id="p-dur" inputMode="numeric" className="field-input" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
        <div><label htmlFor="p-cor" className="field-label">Marks for correct</label><input id="p-cor" inputMode="decimal" className="field-input" value={correct} onChange={(e) => setCorrect(e.target.value)} /></div>
        <div><label htmlFor="p-wro" className="field-label">Minus for wrong</label><input id="p-wro" inputMode="decimal" className="field-input" value={wrong} onChange={(e) => setWrong(e.target.value)} /></div>
      </div>
      <fieldset>
        <legend className="field-label">Sets (shuffled question and option order, so neighbours can't copy)</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} type="button" aria-pressed={sets === n} onClick={() => setSets(n)} className={cn("min-h-11 rounded-full border px-4 text-sm", sets === n ? "border-brand bg-brand-tint/60 font-medium" : "border-line-strong")}>
              {n === 1 ? "1 set" : `${n} sets (${SET_NAMES.slice(0, n).join(", ")})`}
            </button>
          ))}
        </div>
      </fieldset>

      <section aria-labelledby="auto-title" className="rounded-xl border border-brand/30 bg-brand-tint/30 p-4" data-testid="auto-blueprint">
        <h3 id="auto-title" className="font-sans text-base font-semibold">Quick blueprint: pick chapters, a total and a difficulty mix</h3>
        <fieldset className="mt-2">
          <legend className="sr-only">Chapters</legend>
          <div className="flex flex-wrap gap-2">
            {stats.map((s) => {
              const on = autoChapters.some((c) => c.toLowerCase() === s.chapter.toLowerCase());
              return (
                <button key={s.chapter} type="button" aria-pressed={on} onClick={() => setAutoChapters(on ? autoChapters.filter((c) => c.toLowerCase() !== s.chapter.toLowerCase()) : [...autoChapters, s.chapter])}
                  className={cn("min-h-9 rounded-full border px-3 text-sm", on ? "border-brand bg-brand-tint/70 font-medium" : "border-line-strong")}>
                  {s.chapter}
                </button>
              );
            })}
          </div>
          <p className="field-hint">None selected = every chapter in the bank.</p>
        </fieldset>
        <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
          <div><label htmlFor="auto-total" className="field-label">Questions</label><input id="auto-total" type="number" min={1} max={200} className="field-input" value={autoTotal} onChange={(e) => setAutoTotal(e.target.value)} /></div>
          <div>
            <label htmlFor="auto-mix" className="field-label">Difficulty mix</label>
            <select id="auto-mix" className="field-input" value={mixId} onChange={(e) => setMixId(e.target.value)}>{DIFFICULTY_MIXES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
          </div>
          <Button variant="secondary" onClick={makeAuto}>Fill the blueprint</Button>
        </div>
        {autoNote ? <p role="status" className="mt-2 text-sm text-ink-soft">{autoNote}</p> : null}
      </section>

      <section aria-labelledby="bp-title">
        <h3 id="bp-title" className="font-sans text-base font-semibold">Blueprint: which chapters, which level, how many</h3>
        <ul className="mt-2 space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[1fr_9rem_6rem_auto] sm:items-end">
              <div>
                <label htmlFor={`bp-ch-${i}`} className="sr-only">Chapter</label>
                <select id={`bp-ch-${i}`} className="field-input" value={r.chapter} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, chapter: e.target.value } : x)))}>
                  <option value="*">Any chapter</option>
                  {stats.map((s) => <option key={s.chapter} value={s.chapter}>{s.subject ? `${s.subject} · ` : ""}{s.chapter} ({s.counts.easy + s.counts.medium + s.counts.hard})</option>)}
                  {r.chapter !== "*" && !stats.some((s) => s.chapter.toLowerCase() === r.chapter.toLowerCase()) ? <option value={r.chapter}>{r.chapter} (not in bank)</option> : null}
                </select>
              </div>
              <div>
                <label htmlFor={`bp-d-${i}`} className="sr-only">Difficulty</label>
                <select id={`bp-d-${i}`} className="field-input" value={r.difficulty} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, difficulty: e.target.value as BlueprintRow["difficulty"] } : x)))}>
                  <option value="any">Any level</option>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`bp-n-${i}`} className="sr-only">Number of questions</label>
                <input id={`bp-n-${i}`} type="number" min={0} max={200} className="field-input" value={r.count} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, count: Math.max(0, Math.min(200, Number(e.target.value) || 0)) } : x)))} />
              </div>
              <button type="button" className="min-h-11 text-sm text-gap underline underline-offset-4" onClick={() => setRows(rows.filter((_, j) => j !== i))} disabled={rows.length === 1}>Remove</button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={() => setRows([...rows, { chapter: stats[0]?.chapter ?? "*", difficulty: "any", count: 5 }])}>+ Add a row</Button>
          <Button variant="ghost" onClick={() => setRows(stats.map((s) => ({ chapter: s.chapter, difficulty: "any", count: Math.min(5, s.counts.easy + s.counts.medium + s.counts.hard) })))}>A few from every chapter</Button>
        </div>
      </section>
      {problems.length ? <ul role="status" className="space-y-1 text-sm text-warn">{problems.map((p) => <li key={p}>• {p}</li>)}</ul> : null}
      <Button onClick={create} disabled={!total}>Make paper ({total} questions)</Button>
    </div>
  );
}

/* ── 3. Print or conduct online ───────────────────────────────────────── */

function ConductStep({ paper, papers, onPick, instituteCode }: { paper: Paper; papers: Paper[]; onPick: (id: string) => void; instituteCode: string | null }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [printing, setPrinting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [batch, setBatch] = useState("");
  const [batchText, setBatchText] = useState("");
  const isSample = paper.name === SAMPLE_PAPER_NAME;
  const mix = difficultyMix(paper.questions);
  const parsedBatches = useMemo(() => parseBatches(batchText), [batchText]);
  const seating = useMemo(() => seatingPlan(paper.sets, parsedBatches.batches), [paper.sets, parsedBatches.batches]);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => void (async () => {
      const out: Record<string, string> = {};
      for (const s of paper.sets) out[s] = `${window.location.origin}/t#${await encodeOnlineTest(onlineTestFor(paper, s, isSample ? null : instituteCode, batch))}`;
      if (live) setLinks(out);
    })(), 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [paper, instituteCode, isSample, batch]);

  useEffect(() => {
    setMounted(true);
    const done = () => {
      document.body.classList.remove("print-test");
      setPrinting(false);
    };
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("failed");
    }
  }

  function print() {
    setPrinting(true);
    document.body.classList.add("print-test");
    setTimeout(() => window.print(), 150);
  }

  return (
    <div className="space-y-6">
      {papers.length > 1 ? (
        <div className="max-w-sm">
          <label htmlFor="paper-pick" className="field-label">Paper</label>
          <select id="paper-pick" className="field-input" value={paper.id} onChange={(e) => onPick(e.target.value)}>
            {[...papers].reverse().map((p) => <option key={p.id} value={p.id}>{p.name} · {p.questions.length} Q · {p.createdAt.slice(0, 10)}</option>)}
          </select>
        </div>
      ) : null}
      <div className="rounded-xl border border-line p-4" data-testid="paper-summary">
        <p className="font-semibold text-ink">{paper.name}</p>
        <p className="tabular mt-1 text-sm text-ink-soft">
          {paper.questions.length} questions · {maxMarks(paper)} marks (+{paper.marking.correct} / −{paper.marking.wrong}) · {paper.durationMin} min · sets {paper.sets.join(", ")} · easy {mix.easy}, medium {mix.medium}, hard {mix.hard}
        </p>
        {isSample ? <FictionalDataLabel className="mt-2" /> : null}
      </div>

      <section aria-labelledby="print-title">
        <h3 id="print-title" className="font-sans text-lg font-semibold">On paper</h3>
        <p className="mt-1 text-sm text-ink-soft">Prints every set, a bubble answer sheet to photocopy, and the answer keys on a separate page (keep that page with you).</p>
        <Button className="mt-3" onClick={print}>Print paper, OMR sheet and keys{seating.length ? " + seating chart" : ""}</Button>
      </section>

      <section aria-labelledby="seat-title" data-testid="seating">
        <h3 id="seat-title" className="font-sans text-lg font-semibold">Batches and seating</h3>
        <p className="mt-1 text-sm text-ink-soft">
          One line per batch: <span className="font-mono">name, students</span> (optionally <span className="font-mono">, roll prefix</span>). Heramb gives every roll number a set so neighbours never share one,
          and tells you how many copies of each set to photocopy (5% spare included).
        </p>
        <label htmlFor="batch-lines" className="sr-only">Batch list</label>
        <textarea id="batch-lines" rows={3} className="field-input mt-2 font-mono text-sm" value={batchText} onChange={(e) => setBatchText(e.target.value)} placeholder={"11 JEE A, 42\n11 JEE B, 38, B\n12 NEET, 55, N"} />
        {parsedBatches.errors.length ? <ul role="alert" className="mt-2 space-y-1 text-sm text-gap">{parsedBatches.errors.slice(0, 5).map((e) => <li key={e}>• {e}</li>)}</ul> : null}
        {seating.length ? <SeatingSummary seating={seating} sets={paper.sets} /> : null}
      </section>

      <section aria-labelledby="online-title">
        <h3 id="online-title" className="font-sans text-lg font-semibold">Online, on students' phones</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Send each batch one set's link. Students enter their roll number, take the timed test and send you a short response code on WhatsApp.
          The link holds only the questions; the answer key never leaves this device.
        </p>
        <div className="mt-3 max-w-sm">
          <label htmlFor="link-batch" className="field-label">Batch for these links (optional)</label>
          <input id="link-batch" className="field-input" maxLength={40} value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. 11 JEE A" list="batch-names" />
          <datalist id="batch-names">{seating.map((b) => <option key={b.name} value={b.name} />)}</datalist>
          <p className="field-hint">The batch travels inside each student's code, so results can be split batch by batch.</p>
        </div>
        <ul className="mt-3 space-y-2" data-testid="online-links">
          {paper.sets.map((s) => (
            <li key={s} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-2 text-sm">
              <span className="font-semibold">Set {s}</span>
              {links[s] ? (
                <>
                  <a href={links[s]} target="_blank" rel="noopener" className="text-brand underline underline-offset-4">Preview<span className="sr-only"> set {s} (new tab)</span></a>
                  <button type="button" className="font-medium underline underline-offset-4" onClick={() => copy(links[s]!, s)}>{copied === s ? "Copied ✓" : "Copy link"}</button>
                  <a className="font-medium text-good underline underline-offset-4" target="_blank" rel="noopener" href={whatsappLink(`${paper.name}${paper.institute ? ` · ${paper.institute}` : ""}${batch.trim() ? ` · ${batch.trim()}` : ""}\nSet ${s} · ${paper.durationMin} min. Open, enter your roll number, and send me the code you get at the end:\n${links[s]}`)}>Send on WhatsApp</a>
                </>
              ) : <span className="text-ink-muted">Preparing link…</span>}
            </li>
          ))}
        </ul>
        {copied === "failed" ? <p role="alert" className="field-error">Copying isn't allowed in this browser. Use “Send on WhatsApp”.</p> : null}
      </section>

      <details className="rounded-xl border border-line p-4 text-sm">
        <summary className="cursor-pointer font-medium">Answer keys and paper map</summary>
        <div className="mt-3 space-y-2 font-mono text-xs">
          {paper.sets.map((s) => <p key={s}>Set {s}: {setKey(paper, s).map((k, i) => `${i + 1}${k}`).join(" ")}</p>)}
          <pre className="whitespace-pre-wrap">{paperMapText(paper)}</pre>
        </div>
      </details>

      {mounted && printing ? createPortal(<PrintPaper paper={paper} seating={seating} />, document.body) : null}
    </div>
  );
}

function SeatingSummary({ seating, sets }: { seating: BatchSeating[]; sets: string[] }) {
  const totals = Object.fromEntries(sets.map((s) => [s, seating.reduce((n, b) => n + (b.copies[s] ?? 0), 0)]));
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-sm" data-testid="seating-table">
        <thead className="bg-paper-raised text-xs text-ink-muted">
          <tr><th className="px-3 py-2">Batch</th><th className="px-3 py-2">Students</th>{sets.map((s) => <th key={s} className="px-3 py-2">Copies of set {s}</th>)}<th className="px-3 py-2">First seats</th></tr>
        </thead>
        <tbody>
          {seating.map((b) => (
            <tr key={b.name} className="border-t border-line">
              <td className="px-3 py-1.5 font-medium">{b.name}</td>
              <td className="tabular px-3 py-1.5">{b.seats.length}</td>
              {sets.map((s) => <td key={s} className="tabular px-3 py-1.5">{b.copies[s] ?? 0}</td>)}
              <td className="px-3 py-1.5 font-mono text-xs text-ink-soft">{b.seats.slice(0, 4).map((x) => `${x.roll}→${x.set}`).join("  ")}…</td>
            </tr>
          ))}
          <tr className="border-t border-line-strong font-semibold">
            <td className="px-3 py-1.5">Total to print</td>
            <td className="tabular px-3 py-1.5">{seating.reduce((n, b) => n + b.seats.length, 0)}</td>
            {sets.map((s) => <td key={s} className="tabular px-3 py-1.5">{totals[s]}</td>)}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PrintPaper({ paper, seating }: { paper: Paper; seating: BatchSeating[] }) {
  const header = (title: string) => (
    <header style={{ borderBottom: "2px solid #0E1528", paddingBottom: 6, marginBottom: 10 }}>
      <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{paper.institute || " "}</p>
      <p style={{ fontSize: 13, margin: "2px 0 0" }}>{paper.name} · {title}</p>
      <p style={{ fontSize: 11, margin: "2px 0 0" }}>Time: {paper.durationMin} min · Maximum marks: {maxMarks(paper)} · +{paper.marking.correct} for correct, −{paper.marking.wrong} for wrong, 0 if not attempted</p>
      <p style={{ fontSize: 11, margin: "6px 0 0" }}>Name: ____________________ Roll no: __________ Batch: __________</p>
    </header>
  );
  return (
    <div className="test-print" aria-hidden="true">
      {paper.sets.map((s) => {
        const l = setLayout(paper, s);
        return (
          <section key={s} className="test-print-page">
            {header(`Set ${s}`)}
            <ol style={{ listStyle: "none", paddingLeft: 0, fontSize: 12, lineHeight: 1.45 }}>
              {l.order.map((mi, pos) => {
                const q = paper.questions[mi]!;
                return (
                  <li key={pos} style={{ marginBottom: 8, breakInside: "avoid", paddingLeft: 24, textIndent: -24 }}>
                    <strong style={{ display: "inline-block", width: 24, textIndent: 0 }}>{pos + 1}.</strong>
                    {q.text}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", marginTop: 2, textIndent: 0 }}>
                      {l.optionOrder[pos]!.map((oi, k) => <span key={k}>({"abcde"[k]}) {q.options[oi]}</span>)}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <section className="test-print-page">
        {header("Answer sheet")}
        <p style={{ fontSize: 11 }}>Set: {paper.sets.map((s) => `○ ${s}`).join("   ")} · Fill one bubble per question.</p>
        <div style={{ columns: 3, fontSize: 12, marginTop: 8 }}>
          {paper.questions.map((q, i) => (
            <p key={i} style={{ margin: "0 0 5px", breakInside: "avoid", fontFamily: "monospace" }}>
              {String(i + 1).padStart(3, " ")}{" "}{"ABCDE".slice(0, Math.max(...paper.questions.map((x) => x.options.length))).split("").map((c) => `○${c}`).join(" ")}
            </p>
          ))}
        </div>
      </section>
      <section className="test-print-page">
        <header style={{ borderBottom: "2px solid #0E1528", paddingBottom: 6, marginBottom: 10 }}>
          <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{paper.name} · Answer keys (teacher's copy)</p>
        </header>
        {paper.sets.map((s) => (
          <p key={s} style={{ fontSize: 12, fontFamily: "monospace", lineHeight: 1.7 }}><strong>Set {s}:</strong> {setKey(paper, s).map((k, i) => `${i + 1}-${k}`).join("  ")}</p>
        ))}
        <p style={{ fontSize: 12, marginTop: 12 }}><strong>Chapters (set A numbering):</strong></p>
        <pre style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{paperMapText(paper)}</pre>
        <p style={{ fontSize: 10, color: "#586076", marginTop: 12 }}>After the test: Heramb.study test builder → Results → paste the answers. Chapter-wise analysis is automatic.</p>
      </section>
      {seating.map((b) => (
        <section key={b.name} className="test-print-page">
          <header style={{ borderBottom: "2px solid #0E1528", paddingBottom: 6, marginBottom: 10 }}>
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{paper.name} · Seating and sets · {b.name}</p>
            <p style={{ fontSize: 11, margin: "2px 0 0" }}>Seat students in roll order. Copies: {paper.sets.map((s) => `set ${s} × ${b.copies[s] ?? 0}`).join(", ")} (5% spare included).</p>
          </header>
          <div style={{ columns: 4, fontSize: 12, fontFamily: "monospace" }}>
            {b.seats.map((x) => <p key={x.roll} style={{ margin: "0 0 3px" }}>{x.roll} · Set {x.set} · ☐</p>)}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ── 4. Results ───────────────────────────────────────────────────────── */

type Entry = Pick<ResponseEntry, "roll" | "set" | "answers"> & { batch: string };

function ResultsStep({ paper, onRetag }: { paper: Paper; onRetag: (changes: Array<{ id: string; difficulty: Difficulty }>) => void }) {
  const [codes, setCodes] = useState("");
  const [sheet, setSheet] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [batch, setBatch] = useState("*");
  const [retagged, setRetagged] = useState(false);

  const batches = useMemo(() => [...new Set((entries ?? []).map((e) => e.batch).filter(Boolean))].sort(), [entries]);
  const chosen = useMemo(() => (entries ?? []).filter((e) => batch === "*" || e.batch === batch), [entries, batch]);
  const items = useMemo(() => (chosen.length ? itemAnalysis(paper, chosen) : []), [paper, chosen]);
  const retags = useMemo(
    () => items.flatMap((it) => {
      const d = suggestedDifficulty(it, chosen.length);
      return d ? [{ id: paper.questions[it.q - 1]!.id, difficulty: d, q: it.q }] : [];
    }),
    [items, chosen.length, paper.questions],
  );

  function load(list: Entry[], extra: string[]) {
    setError("");
    setNotes(extra);
    setRetagged(false);
    if (!list.length) {
      setEntries(null);
      return setError("No students found. Paste the response codes, or the answer table with a header row.");
    }
    setEntries(list);
    setBatch("*");
  }

  function openAnalyser() {
    if (!chosen.length) return;
    const table = responsesTable(paper, chosen);
    const r = applyPaperMap(table, parsePaperMap(paperMapText(paper)).lines, { kind: "responses", correct: paper.marking.correct, wrong: paper.marking.wrong });
    if (!r.rows) return setError(r.errors.join(" "));
    const label = batch === "*" ? "" : ` · ${batch}`;
    try {
      sessionStorage.setItem(ANALYSER_PREFILL_KEY, JSON.stringify({ text: rowsToTsv(r.rows), notes: [`From “${paper.name}”${label}: ${chosen.length} students.`, ...notes], sample: paper.name === SAMPLE_PAPER_NAME }));
    } catch {
      return setError("This browser blocked handing the results to the analyser. Copy the chapter table below instead.");
    }
    window.location.href = "/resources/class-test-analyser";
  }

  function fromCodes() {
    const r = parseResponseCodes(codes, paper.id);
    load(r.entries, r.problems);
  }

  function fromSheet() {
    // Roll no, [Set], [Batch], Q1..Qn with letters A–E (blank = not attempted).
    const rows = parseTable(sheet).filter((r) => r.some(Boolean));
    if (rows.length < 2) return setError("Paste a header row and at least one student.");
    const header = rows[0]!.map((h) => h.trim().toLowerCase());
    const setCol = header.findIndex((h) => h === "set");
    const batchCol = header.findIndex((h) => h === "batch");
    const firstQ = header.findIndex((h, i) => i > 0 && i !== setCol && i !== batchCol && /^q?\s*0*1$/.test(h));
    if (firstQ < 0) return setError("Couldn't find the Q1 column. Header should look like: Roll no, Set, Q1, Q2, …");
    load(
      rows.slice(1).map((r) => ({
        roll: (r[0] ?? "").trim(),
        set: setCol >= 0 ? (r[setCol] ?? "A").trim().toUpperCase() || "A" : "A",
        batch: batchCol >= 0 ? (r[batchCol] ?? "").trim().slice(0, 40) : "",
        answers: r.slice(firstQ, firstQ + paper.questions.length).map((c) => c.trim().toUpperCase()),
      })).filter((e) => e.roll),
      [],
    );
  }

  const flagged = items.filter((it) => it.flags.length);
  const keyAlarms = items.filter((it) => it.flags.includes("check-key"));

  return (
    <div className="space-y-6" data-testid="results-step">
      <section aria-labelledby="codes-title">
        <h3 id="codes-title" className="font-sans text-lg font-semibold">Online test: paste the codes students sent</h3>
        <p className="mt-1 text-sm text-ink-soft">Select the WhatsApp messages (or the whole chat export) and paste. Heramb finds every code, checks it belongs to this paper, and keeps each roll number's latest one.</p>
        <textarea rows={6} className="field-input mt-2 font-mono text-xs" value={codes} onChange={(e) => setCodes(e.target.value)} aria-label="Response codes" placeholder="HR1.eyJwIjoi…" />
        <Button className="mt-3" onClick={fromCodes} disabled={!codes.trim()}>Analyse online answers</Button>
      </section>
      <section aria-labelledby="sheet-title">
        <h3 id="sheet-title" className="font-sans text-lg font-semibold">Paper test: paste the answers</h3>
        <p className="mt-1 text-sm text-ink-soft">From your OMR software or typed in Excel: Roll no, Set (optional), Batch (optional), then Q1, Q2… with the letter each student marked. Blank = not attempted.</p>
        <textarea rows={6} className="field-input mt-2 font-mono text-xs" value={sheet} onChange={(e) => setSheet(e.target.value)} aria-label="Answer table" placeholder={"Roll no\tSet\tQ1\tQ2\tQ3\nR01\tA\tB\tA\tC\nR02\tB\tC\t\tD"} />
        <Button className="mt-3" onClick={fromSheet} disabled={!sheet.trim()}>Analyse paper answers</Button>
      </section>
      {notes.length ? <ul role="status" className="space-y-1 text-sm text-warn">{notes.map((n) => <li key={n}>• {n}</li>)}</ul> : null}
      {error ? <p role="alert" className="field-error">{error}</p> : null}

      {entries ? (
        <section aria-labelledby="review-title" className="rounded-xl border border-brand/40 p-4" data-testid="results-review">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="review-title" className="font-sans text-lg font-semibold">{chosen.length} student{chosen.length === 1 ? "" : "s"} · question check</h3>
              <p className="mt-1 text-sm text-ink-soft">Before the chapter-wise plan, check the paper itself: questions everyone got wrong usually mean a wrong key or an unclear question, not a weak batch.</p>
            </div>
            {batches.length ? (
              <div>
                <label htmlFor="res-batch" className="field-label">Batch</label>
                <select id="res-batch" className="field-input" value={batch} onChange={(e) => setBatch(e.target.value)}>
                  <option value="*">All batches ({entries.length})</option>
                  {batches.map((b) => <option key={b} value={b}>{b} ({entries.filter((e) => e.batch === b).length})</option>)}
                </select>
              </div>
            ) : null}
          </div>

          {keyAlarms.length ? (
            <p role="alert" className="mt-3 rounded-lg border-l-4 border-gap bg-gap/5 px-3 py-2 text-sm" data-testid="key-alarm">
              <strong>Check the answer key for Q{keyAlarms.map((k) => k.q).join(", Q")} (set A numbering).</strong> Most students who answered chose the same other option. If the key is wrong, fix the question in your bank and re-run; marks will be recalculated.
            </p>
          ) : null}
          {chosen.length < 5 ? <p className="mt-3 text-sm text-ink-muted">Question flags appear once at least 5 students have answered.</p> : null}

          <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm" data-testid="item-analysis">
              <thead className="sticky top-0 bg-paper-raised text-xs text-ink-muted">
                <tr><th className="px-3 py-2">Q</th><th className="px-3 py-2">Chapter</th><th className="px-3 py-2">Level</th><th className="px-3 py-2">Correct</th><th className="px-3 py-2">Key</th><th className="px-3 py-2">Most-picked wrong</th><th className="px-3 py-2">Note</th></tr>
              </thead>
              <tbody>
                {items.map((it) => <ItemRow key={it.q} it={it} />)}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-muted">{flagged.length ? `${flagged.length} question${flagged.length === 1 ? "" : "s"} flagged.` : "No questions flagged."} Percentages are of all {chosen.length} students, including those who left it blank.</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={openAnalyser}>Open the chapter-wise plan{batch === "*" ? "" : ` for ${batch}`}</Button>
            <Button variant="secondary" onClick={() => downloadText(`${paper.name.replace(/[^\w-]+/g, "-")}-question-check.csv`, itemCsv(items), "text/csv")}>Download question check (CSV)</Button>
            {retags.length && !retagged ? (
              <Button variant="ghost" onClick={() => { onRetag(retags); setRetagged(true); }}>
                Re-tag {retags.length} question{retags.length === 1 ? "" : "s"} by real difficulty
              </Button>
            ) : null}
          </div>
          {retags.length && !retagged ? <p className="mt-2 text-xs text-ink-muted">Based on how {chosen.length} students actually did: {retags.slice(0, 6).map((r) => `Q${r.q} → ${r.difficulty}`).join(", ")}{retags.length > 6 ? "…" : ""}. Future blueprints will use these levels.</p> : null}
          {retagged ? <p role="status" className="mt-2 text-sm text-good">Difficulty tags updated in your bank.</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function ItemRow({ it }: { it: ItemStat }) {
  return (
    <tr className={cn("border-t border-line", it.flags.includes("check-key") && "bg-gap/5")}>
      <td className="tabular px-3 py-1.5 font-medium">{it.q}</td>
      <td className="px-3 py-1.5">{it.chapter}</td>
      <td className="px-3 py-1.5 text-ink-soft">{it.difficulty}</td>
      <td className="tabular px-3 py-1.5">{it.pctCorrect}%</td>
      <td className="px-3 py-1.5 font-mono">{it.key}</td>
      <td className="px-3 py-1.5 font-mono">{it.topWrong ? `${it.topWrong} (${it.picks[it.topWrong]})` : "—"}</td>
      <td className="px-3 py-1.5 text-xs">{it.flags.map((f) => FLAG_TEXT[f]).join(" · ")}</td>
    </tr>
  );
}

function itemCsv(items: ItemStat[]): string {
  const cell = (v: string | number) => {
    let x = String(v);
    if (/^[=+\-@\t\r]/.test(x)) x = `'${x}`;
    return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
  };
  const head = ["Q (set A)", "Chapter", "Level", "Attempted", "Correct", "% correct", "Key", "A", "B", "C", "D", "E", "Flags"];
  return [head, ...items.map((it) => [it.q, it.chapter, it.difficulty, it.attempted, it.correct, it.pctCorrect, it.key, ..."ABCDE".split("").map((l) => it.picks[l] ?? ""), it.flags.map((f) => FLAG_TEXT[f]).join("; ")])]
    .map((r) => r.map(cell).join(",")).join("\n");
}
