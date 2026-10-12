"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";
import { answerKey, DIMENSIONS, SCALE, scoreDiagnostic, type Answers, type Band } from "@/lib/tools/readiness";
import { cn } from "@/lib/cn";
import { ToolShell, useToolTracking } from "./ToolShell";

const bandTone: Record<Band, "gap" | "warn" | "good"> = { priority: "gap", building: "warn", strong: "good" };
const bandLabel: Record<Band, string> = { priority: "Priority", building: "Building", strong: "Strong" };
const bar: Record<Band, string> = { priority: "bg-gap", building: "bg-warn", strong: "bg-good" };

export function ReadinessDiagnostic() {
  const [answers, setAnswers] = useState<Answers>({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const { onStart, onComplete } = useToolTracking("readiness_diagnostic");
  const score = scoreDiagnostic(answers);

  function set(key: string, value: number) {
    onStart();
    setAnswers((a) => ({ ...a, [key]: value }));
    setError("");
  }

  function submit() {
    if (!score.complete) {
      setError(`Please answer all ${score.total} statements — ${score.total - score.answered} left.`);
      return;
    }
    setShowResults(true);
    onComplete();
    requestAnimationFrame(() => resultsRef.current?.focus());
  }

  return (
    <ToolShell id="readiness" title="Assessment-readiness diagnostic">
      <p className="text-[0.9375rem] text-ink-soft">
        Rate each statement honestly for the <strong>last two weeks</strong>. Takes about 3 minutes.
      </p>

      <div className="mt-6 space-y-8">
        {DIMENSIONS.map((d) => (
          <fieldset key={d.key} className="space-y-4">
            <legend className="font-sans text-base font-semibold text-ink">{d.title}</legend>
            {d.statements.map((s, i) => {
              const key = answerKey(d.key, i);
              const name = `q-${key}`;
              return (
                <div key={key} role="radiogroup" aria-labelledby={`${name}-label`} className="rounded-xl border border-line p-4">
                  <p id={`${name}-label`} className="text-[0.9375rem] text-ink">{s}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SCALE.map((opt) => (
                      <label
                        key={opt.value}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand",
                          answers[key] === opt.value ? "border-brand bg-brand text-white" : "border-line-strong text-ink-soft hover:border-ink-muted",
                        )}
                      >
                        <input type="radio" className="sr-only" name={name} value={opt.value} checked={answers[key] === opt.value} onChange={() => set(key, opt.value)} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button onClick={submit}>See my results</Button>
        <span className="tabular text-sm text-ink-muted" aria-live="polite">
          {score.answered} of {score.total} answered
        </span>
        {showResults ? (
          <button type="button" className="text-sm font-medium text-ink-muted underline underline-offset-4" onClick={() => { setAnswers({}); setShowResults(false); }}>
            Start over
          </button>
        ) : null}
      </div>
      {error ? <p role="alert" className="field-error">{error}</p> : null}

      {showResults && score.complete ? (
        <div ref={resultsRef} tabIndex={-1} className="mt-10 border-t border-line pt-8 focus:outline-none" data-testid="readiness-results">
          <h3 className="font-sans text-xl font-semibold">Your readiness profile</h3>
          <ul className="mt-5 space-y-4">
            {score.dimensions.map((d) => (
              <li key={d.key}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{d.title}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular text-ink-soft">{d.percent}%</span>
                    <Badge tone={bandTone[d.band]}>{bandLabel[d.band]}</Badge>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-sunk" aria-hidden="true">
                  <div className={cn("h-full rounded-full", bar[d.band])} style={{ width: `${Math.max(d.percent, 2)}%` }} />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 space-y-5">
            {score.focus.map((f) => (
              <div key={f.key} className="rounded-xl border border-brand/25 bg-brand-tint/40 p-5">
                <p className="text-sm font-semibold text-brand-strong">Focus for the next two weeks</p>
                <p className="mt-1 font-semibold text-ink">{f.title}</p>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[0.9375rem] text-ink-soft">
                  {f.actions.map((a) => <li key={a}>{a}</li>)}
                </ol>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-ink-muted">
            This is a self-reflection checklist, not a validated test, and it can't predict exam results. Retake it in
            two weeks to see whether your habits have changed.
          </p>
          <Button variant="secondary" className="no-print mt-4" onClick={() => window.print()}>Print or save as PDF</Button>
        </div>
      ) : null}
    </ToolShell>
  );
}
