"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, FictionalDataLabel } from "@/components/ui/Primitives";
import { compareAssessments, summarise, type CompareResult, type CompareRow } from "@/lib/tools/compare";
import { ToolShell, useToolTracking } from "./ToolShell";

const blank = (): CompareRow => ({ topic: "", firstPercent: "", secondPercent: "" });
const example: CompareRow[] = [
  { topic: "Cell structure", firstPercent: "72", secondPercent: "75" },
  { topic: "Genetics", firstPercent: "48", secondPercent: "66" },
  { topic: "Human physiology", firstPercent: "61", secondPercent: "52" },
  { topic: "Ecology", firstPercent: "80", secondPercent: "83" },
];
const verdict = {
  improved: { label: "Improved", tone: "good" as const },
  declined: { label: "Declined", tone: "gap" as const },
  no_clear_change: { label: "No clear change", tone: "neutral" as const },
};

export function AssessmentComparer() {
  const [rows, setRows] = useState<CompareRow[]>([blank(), blank(), blank()]);
  const [margin, setMargin] = useState("5");
  const [isExample, setIsExample] = useState(false);
  const [results, setResults] = useState<CompareResult[] | null>(null);
  const [errors, setErrors] = useState<Array<{ index: number; message: string }>>([]);
  const ref = useRef<HTMLDivElement>(null);
  const { onStart, onComplete } = useToolTracking("assessment_comparer");

  function edit(i: number, k: keyof CompareRow, v: string) {
    onStart();
    setIsExample(false);
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)));
  }
  function run() {
    const out = compareAssessments(rows, Number(margin));
    setErrors(out.errors);
    if (out.errors.length || !out.results.length) {
      setResults(null);
      if (!out.errors.length) setErrors([{ index: -1, message: "Add at least one topic with both percentages." }]);
      return;
    }
    setResults(out.results);
    onComplete();
    requestAnimationFrame(() => ref.current?.focus());
  }
  const sum = results ? summarise(results) : null;

  return (
    <ToolShell id="comparer" title="Assessment comparison calculator">
      <p className="text-[0.9375rem] text-ink-soft">
        Enter each topic's percentage on two assessments. Changes within the margin are reported as "no clear change".
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Button variant="secondary" onClick={() => { setRows(example.map((r) => ({ ...r }))); setIsExample(true); setResults(null); onStart(); }}>Load a fictional example</Button>
        <div>
          <label htmlFor="cmp-margin" className="field-label">Margin (± percentage points)</label>
          <input id="cmp-margin" type="number" min={0} max={50} step={1} className="field-input tabular w-28" value={margin}
            aria-describedby="cmp-margin-hint" onChange={(e) => setMargin(e.target.value)} />
        </div>
      </div>
      <p id="cmp-margin-hint" className="field-hint">5 is a sensible default when the two tests are similar; use 8–10 if they differ in length or difficulty.</p>
      {isExample ? <FictionalDataLabel className="mt-3" /> : null}

      <div className="mt-5 space-y-2">
        {rows.map((r, i) => {
          const err = errors.find((e) => e.index === i)?.message;
          return (
            <div key={i}>
              <div className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2">
                <input aria-label={`Topic ${i + 1}`} className="field-input" placeholder="Topic" maxLength={80} value={r.topic} onChange={(e) => edit(i, "topic", e.target.value)} />
                <input aria-label={`Topic ${i + 1}, first assessment percent`} className="field-input tabular" inputMode="decimal" placeholder="Test 1 %" value={r.firstPercent} onChange={(e) => edit(i, "firstPercent", e.target.value)} />
                <input aria-label={`Topic ${i + 1}, second assessment percent`} className="field-input tabular" inputMode="decimal" placeholder="Test 2 %" value={r.secondPercent} onChange={(e) => edit(i, "secondPercent", e.target.value)} />
              </div>
              {err ? <p role="alert" className="field-error">Row {i + 1}: {err}</p> : null}
            </div>
          );
        })}
      </div>
      {errors.find((e) => e.index === -1) ? <p role="alert" className="field-error">{errors.find((e) => e.index === -1)?.message}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" disabled={rows.length >= 30} onClick={() => setRows((r) => [...r, blank()])}>+ Add topic</Button>
        <Button onClick={run}>Compare</Button>
      </div>

      {results && sum ? (
        <div ref={ref} tabIndex={-1} className="mt-10 border-t border-line pt-8 focus:outline-none" data-testid="compare-results">
          <h3 className="font-sans text-xl font-semibold">Comparison</h3>
          <p className="mt-2 text-ink-soft">
            {sum.improved} improved · {sum.declined} declined · {sum.unclear} no clear change (margin ±{Number(margin) || 0} pts)
          </p>
          <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
            {results.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium text-ink">{r.topic}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular text-ink-soft">{r.first}% → {r.second}% ({r.change > 0 ? "+" : ""}{r.change})</span>
                  <Badge tone={verdict[r.verdict].tone}>{verdict[r.verdict].label}</Badge>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-muted">
            This tool doesn't know whether your two tests were equally difficult. A decline after a much harder test may
            not be a real decline — check the questions before drawing conclusions.
          </p>
        </div>
      ) : null}
    </ToolShell>
  );
}
