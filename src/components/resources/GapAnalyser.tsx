"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, FictionalDataLabel } from "@/components/ui/Primitives";
import { statusLabel } from "@/content/sampleData";
import { analyseTopics, prioritise, toCsv, type TopicAnalysis, type TopicInput } from "@/lib/tools/gaps";
import { ToolShell, downloadText, useToolTracking } from "./ToolShell";

const MAX_ROWS = 30;
const blank = (): TopicInput => ({ topic: "", scored: "", max: "" });
const example: TopicInput[] = [
  { topic: "Mole concept", scored: "14", max: "20" },
  { topic: "Atomic structure", scored: "16", max: "20" },
  { topic: "Chemical bonding", scored: "7", max: "20" },
  { topic: "Thermodynamics", scored: "9", max: "16" },
  { topic: "Equilibrium", scored: "4", max: "16" },
  { topic: "Redox reactions", scored: "6", max: "8" },
];
const tone = { secure: "good", developing: "warn", gap: "gap" } as const;

export function GapAnalyser() {
  const [rows, setRows] = useState<TopicInput[]>([blank(), blank(), blank(), blank()]);
  const [usingExample, setUsingExample] = useState(false);
  const [results, setResults] = useState<TopicAnalysis[] | null>(null);
  const [errors, setErrors] = useState<Array<{ index: number; message: string }>>([]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { onStart, onComplete } = useToolTracking("gap_analyser");

  function edit(i: number, key: keyof TopicInput, value: string) {
    onStart();
    setUsingExample(false);
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: value } : row)));
  }

  function analyse() {
    const { results: res, errors: errs } = analyseTopics(rows);
    setErrors(errs);
    if (errs.length || res.length === 0) {
      setResults(null);
      if (!errs.length) setErrors([{ index: -1, message: "Add at least one topic with marks to analyse." }]);
      return;
    }
    setResults(prioritise(res));
    onComplete();
    requestAnimationFrame(() => resultsRef.current?.focus());
  }

  const rowError = (i: number) => errors.find((e) => e.index === i)?.message;
  const topTwo = results?.filter((r) => r.status !== "secure").slice(0, 2) ?? [];

  return (
    <ToolShell id="gap-analyser" title="Learning-gap analyser">
      <p className="text-[0.9375rem] text-ink-soft">
        Enter marks per topic from one test — for one student, or the class average. Negative marking is fine; the
        percentage uses marks above zero.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => { setRows(example.map((r) => ({ ...r }))); setUsingExample(true); setResults(null); setErrors([]); onStart(); }}>
          Load a fictional example
        </Button>
        <Button variant="ghost" onClick={() => { setRows([blank(), blank(), blank(), blank()]); setResults(null); setErrors([]); setUsingExample(false); }}>
          Clear
        </Button>
      </div>
      {usingExample ? <FictionalDataLabel className="mt-3" /> : null}

      <div className="mt-5 space-y-3">
        <div className="hidden grid-cols-[1fr_7rem_7rem_2.75rem] gap-2 text-xs font-medium uppercase tracking-wider text-ink-muted sm:grid">
          <span>Topic</span><span>Marks scored</span><span>Out of</span><span className="sr-only">Remove</span>
        </div>
        {rows.map((row, i) => {
          const err = rowError(i);
          return (
            <div key={i}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_7rem_7rem_2.75rem]">
                <input aria-label={`Topic ${i + 1}`} className="field-input col-span-2 sm:col-span-1" placeholder="e.g. Chemical bonding"
                  value={row.topic} maxLength={80} onChange={(e) => edit(i, "topic", e.target.value)} aria-invalid={Boolean(err)} />
                <input aria-label={`Marks scored, topic ${i + 1}`} className="field-input tabular" inputMode="decimal" placeholder="Scored"
                  value={row.scored} onChange={(e) => edit(i, "scored", e.target.value)} aria-invalid={Boolean(err)} />
                <div className="flex gap-2 sm:contents">
                  <input aria-label={`Maximum marks, topic ${i + 1}`} className="field-input tabular" inputMode="decimal" placeholder="Out of"
                    value={row.max} onChange={(e) => edit(i, "max", e.target.value)} aria-invalid={Boolean(err)} />
                  <button type="button" aria-label={`Remove topic ${i + 1}`} disabled={rows.length <= 1}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line text-ink-muted hover:bg-paper-sunk disabled:opacity-40"
                    onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                </div>
              </div>
              {err ? <p className="field-error" role="alert">Row {i + 1}: {err}</p> : null}
            </div>
          );
        })}
      </div>
      {rowError(-1) ? <p className="field-error" role="alert">{rowError(-1)}</p> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="secondary" disabled={rows.length >= MAX_ROWS} onClick={() => setRows((r) => [...r, blank()])}>+ Add topic</Button>
        <Button onClick={analyse}>Analyse gaps</Button>
      </div>

      {results ? (
        <div ref={resultsRef} tabIndex={-1} className="mt-10 border-t border-line pt-8 focus:outline-none" data-testid="gap-results">
          <h3 className="font-sans text-xl font-semibold">Results, in priority order</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <caption className="sr-only">Topics ordered by priority</caption>
              <thead><tr className="border-b border-line text-xs uppercase tracking-wider text-ink-muted">
                <th scope="col" className="py-2 pr-3 font-medium">#</th>
                <th scope="col" className="py-2 pr-3 font-medium">Topic</th>
                <th scope="col" className="py-2 pr-3 font-medium">Score</th>
                <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                <th scope="col" className="py-2 font-medium">Marks at stake</th>
              </tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={`${r.topic}-${i}`} className="border-b border-line last:border-0">
                    <td className="tabular py-2.5 pr-3 text-ink-muted">{i + 1}</td>
                    <th scope="row" className="py-2.5 pr-3 font-medium text-ink">{r.topic}</th>
                    <td className="tabular py-2.5 pr-3">{r.scored}/{r.max} <span className="text-ink-muted">({r.percent}%)</span></td>
                    <td className="py-2.5 pr-3"><Badge tone={tone[r.status]}>{statusLabel[r.status]}</Badge></td>
                    <td className="tabular py-2.5">{r.marksAtStake}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-xl border border-brand/25 bg-brand-tint/40 p-5 text-[0.9375rem] text-ink-soft">
            {topTwo.length ? (
              <>
                <p className="font-semibold text-ink">Suggested focus</p>
                <p className="mt-1">
                  Start with <strong>{topTwo.map((t) => t.topic).join(" and ")}</strong>. Before reteaching, look at the
                  wrong answers in {topTwo.length > 1 ? "these topics" : "this topic"} and label each mistake (concept,
                  method, careless, misread, time) — the right fix depends on the type.
                </p>
              </>
            ) : (
              <p>Every topic is at or above 75%. Consider a mixed, timed practice set to check this holds under exam conditions.</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => downloadText("learning-gap-analysis.csv", toCsv(results))}>Download CSV</Button>
            <Button variant="ghost" onClick={() => window.print()}>Print</Button>
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            A single test is a small sample: a topic with only a few questions can swing a lot. Treat these results as a
            starting point for conversation and a follow-up check, not a final judgement.
          </p>
        </div>
      ) : null}
    </ToolShell>
  );
}
