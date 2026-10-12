"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { analyseMistakes, emptyCounts, MISTAKE_TYPES, type MistakeCounts, type MistakeKey } from "@/lib/tools/mistakes";
import { ToolShell, useToolTracking } from "./ToolShell";

export function MistakeTally() {
  const [counts, setCounts] = useState<MistakeCounts>(emptyCounts());
  const { onStart, onComplete } = useToolTracking("mistake_tally");
  const analysis = analyseMistakes(counts);

  function change(key: MistakeKey, delta: number) {
    onStart();
    const next = { ...counts, [key]: Math.min(99, Math.max(0, counts[key] + delta)) };
    setCounts(next);
    if (analyseMistakes(next).dominant) onComplete();
  }

  return (
    <ToolShell id="mistake-tally" title="Mistake-pattern tally">
      <p className="text-[0.9375rem] text-ink-soft">
        Go through one student's wrong answers (or a sample from the class) and count each by type.
      </p>
      <ul className="mt-5 space-y-2">
        {MISTAKE_TYPES.map((t) => (
          <li key={t.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{t.label}</p>
              <p className="text-sm text-ink-muted">{t.sign}</p>
            </div>
            <div className="flex items-center gap-2" role="group" aria-label={`${t.label} count`}>
              <button type="button" aria-label={`Decrease ${t.label}`} onClick={() => change(t.key, -1)}
                className="h-11 w-11 rounded-full border border-line-strong text-lg text-ink hover:bg-paper-sunk">−</button>
              <output className="tabular w-8 text-center text-lg font-semibold" aria-live="polite" aria-label={`${t.label}: ${counts[t.key]}`}>{counts[t.key]}</output>
              <button type="button" aria-label={`Increase ${t.label}`} onClick={() => change(t.key, 1)}
                className="h-11 w-11 rounded-full border border-line-strong text-lg text-ink hover:bg-paper-sunk">+</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 rounded-xl border border-brand/25 bg-brand-tint/40 p-5 text-[0.9375rem]" aria-live="polite" data-testid="mistake-result">
        {analysis.total === 0 ? (
          <p className="text-ink-soft">Your pattern will appear here once you start counting.</p>
        ) : analysis.dominant ? (
          <>
            <p className="font-semibold text-ink">
              Main pattern: {analysis.dominant.label} ({analysis.dominant.share}% of {analysis.total} mistakes)
            </p>
            <p className="mt-1 text-ink-soft">{analysis.dominant.response}</p>
          </>
        ) : (
          <p className="text-ink-soft">
            {analysis.total < 5
              ? `${analysis.total} mistake${analysis.total === 1 ? "" : "s"} counted — at least 5 are needed before a pattern means much.`
              : "No single type dominates (none is 40% or more). Address the top two types separately."}
          </p>
        )}
      </div>
      <Button variant="ghost" className="mt-3" onClick={() => setCounts(emptyCounts())}>Reset counts</Button>
    </ToolShell>
  );
}
