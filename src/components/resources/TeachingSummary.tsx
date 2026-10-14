"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";
import { Spinner } from "@/components/forms/Field";
import { ruleBasedSummary, toSummaryInput, type Summary } from "@/lib/ai/summary";
import type { ClassAnalysis } from "@/lib/tools/classAnalysis";
import { track } from "@/lib/client/analytics";

/**
 * One-click teaching summary + parent note. Sends only topic names and class
 * averages (never students). If the server can't be reached, the same
 * rule-based summary is produced locally — the button always works.
 */
export function TeachingSummary({ analysis }: { analysis: ClassAnalysis }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    setState("loading");
    const input = toSummaryInput(analysis);
    let s: Summary;
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { ok: boolean; summary?: Summary };
      s = data.ok && data.summary ? data.summary : ruleBasedSummary(input);
    } catch {
      s = { ...ruleBasedSummary(input), note: "You're offline, so this summary was made on your device from your numbers." };
    }
    setSummary(s);
    setState("done");
    track("resource_tool_completed", { tool: s.source === "ai" ? "teaching_summary_ai" : "teaching_summary_rules" });
  }

  async function copyParentNote() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.parentNote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-line p-5" aria-labelledby="summary-title" data-testid="teaching-summary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="summary-title" className="font-sans text-lg font-semibold">Teaching summary and parent note</h3>
        {summary ? <Badge tone={summary.source === "ai" ? "brand" : "neutral"}>{summary.source === "ai" ? "Written by AI" : "Made from your numbers"}</Badge> : null}
      </div>
      {state !== "done" ? (
        <>
          <p className="mt-1 text-[0.9375rem] text-ink-soft">
            Get a three-point plan for this week and a short note you can forward to parents. Only topic names and class averages are used — never students' marks or roll numbers.
          </p>
          <Button className="mt-3" onClick={run} disabled={state === "loading"}>
            {state === "loading" ? (<><Spinner /> Writing…</>) : "Write my summary"}
          </Button>
        </>
      ) : summary ? (
        <div className="mt-3 space-y-4 text-[0.9375rem]" aria-live="polite">
          {summary.note ? <p className="text-sm text-ink-muted">{summary.note}</p> : null}
          <p className="font-semibold text-ink">{summary.headline}</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-ink-soft">
            {summary.priorities.map((p) => <li key={p}>{p}</li>)}
          </ol>
          <div className="rounded-xl bg-paper-sunk p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Note for parents</p>
            <p className="mt-1 text-ink">{summary.parentNote}</p>
            <Button variant="secondary" className="mt-3" onClick={copyParentNote}>{copied ? "Copied" : "Copy parent note"}</Button>
          </div>
          {summary.caution ? <p className="text-sm text-ink-muted">{summary.caution}</p> : null}
          <p className="text-xs text-ink-muted">
            {summary.source === "ai" ? "AI can make mistakes — read it before sharing." : "Generated instantly by Heramb's rules from your class averages."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
