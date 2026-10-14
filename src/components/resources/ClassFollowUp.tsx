"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, FictionalDataLabel } from "@/components/ui/Primitives";
import {
  buildDataset,
  compareClasses,
  comparisonToCsv,
  LIMITS,
  parseTable,
  sampleFollowUpCsv,
  type ClassComparison,
  type Dataset,
  type ParseIssue,
} from "@/lib/tools/classAnalysis";
import { downloadText } from "./ToolShell";

const verdict = {
  improved: { label: "Improved", tone: "good" as const },
  declined: { label: "Declined", tone: "gap" as const },
  no_clear_change: { label: "No clear change", tone: "neutral" as const },
};

/** The VERIFY step: compare the first test with a follow-up on the same topics. */
export function ClassFollowUp({ first, firstIsSample }: { first: Dataset; firstIsSample: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [margin, setMargin] = useState("5");
  const [isSample, setIsSample] = useState(false);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [result, setResult] = useState<ClassComparison | null>(null);
  const [fileError, setFileError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  function run(source = text) {
    const { dataset, issues: found } = buildDataset(parseTable(source));
    setIssues(found);
    if (!dataset) return setResult(null);
    const c = compareClasses(first, dataset, Number(margin));
    if (!c.topics.length) {
      setResult(null);
      setIssues([{ row: 1, message: "No topic names or students match the first test. Use the same topic names and roll numbers in both." }]);
      return;
    }
    setResult(c);
    requestAnimationFrame(() => ref.current?.focus());
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    setFileError("");
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > LIMITS.bytes) return setFileError("That file is larger than 1 MB.");
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) return setFileError("Please choose a .csv file.");
    const content = await file.text();
    setText(content);
    setIsSample(false);
    run(content);
  }

  if (!open) {
    return (
      <div className="mt-8 rounded-xl border border-line p-5">
        <p className="font-semibold text-ink">Did the reteaching work?</p>
        <p className="mt-1 text-[0.9375rem] text-ink-soft">
          After reteaching, run a short follow-up test on the same topics and compare it here. You'll see which gaps actually closed.
        </p>
        <Button variant="secondary" className="mt-3" onClick={() => setOpen(true)}>Compare with a follow-up test</Button>
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-brand/25 p-5" aria-labelledby="followup-title" data-testid="followup">
      <h3 id="followup-title" className="font-sans text-xl font-semibold">Follow-up check</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Use the same topic names and roll numbers as the first test. Topics or students that appear in only one test are left out.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        {firstIsSample ? (
          <Button variant="secondary" onClick={() => { const s = sampleFollowUpCsv(); setText(s); setIsSample(true); run(s); }}>
            Load the fictional follow-up
          </Button>
        ) : null}
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong bg-paper-raised px-5 text-[0.9375rem] font-medium text-ink hover:bg-paper-sunk has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
          Upload follow-up CSV
          <input type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={onFile} />
        </label>
        <div>
          <label htmlFor="followup-margin" className="field-label">Margin (± points)</label>
          <input id="followup-margin" type="number" min={0} max={50} className="field-input tabular w-24" value={margin} onChange={(e) => setMargin(e.target.value)} />
        </div>
      </div>
      {fileError ? <p role="alert" className="field-error">{fileError}</p> : null}
      <label htmlFor="followup-data" className="field-label mt-4">Or paste the follow-up marks</label>
      <textarea id="followup-data" rows={6} spellCheck={false} className="field-input font-mono text-sm" value={text}
        onChange={(e) => { setText(e.target.value); setIsSample(false); }} />
      {isSample ? <FictionalDataLabel className="mt-3" /> : null}
      <div className="mt-3"><Button onClick={() => run()} disabled={!text.trim()}>Compare tests</Button></div>

      {issues.length ? (
        <div role="alert" className="mt-4 rounded-xl border border-gap/30 bg-gap-tint/60 p-4 text-sm" data-testid="followup-issues">
          <ul className="space-y-1 text-ink-soft">
            {issues.map((i, n) => <li key={n}>Row {i.row}{i.column ? `, column ${i.column}` : ""}: {i.message}</li>)}
          </ul>
        </div>
      ) : null}

      {result ? (
        <div ref={ref} tabIndex={-1} className="mt-6 focus:outline-none" data-testid="followup-results">
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["Gaps closed", result.totals.closed, "text-good"],
              ["Still below 50%", result.totals.stillBelow, "text-gap"],
              ["Slipped below 50%", result.totals.slipped, "text-warn"],
            ].map(([k, v, c]) => (
              <div key={k as string} className="rounded-xl border border-line bg-paper p-3">
                <dt className="text-xs text-ink-muted">{k}</dt>
                <dd className={`tabular mt-1 text-2xl font-semibold ${c}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-ink-muted">
            Counted per student per topic, across {result.matchedStudents} students in both tests.
          </p>
          <ul className="mt-5 space-y-3">
            {result.topics.map((t) => (
              <li key={t.name} className="rounded-xl border border-line p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{t.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular text-ink-soft">{t.before}% → {t.after}% ({t.change > 0 ? "+" : ""}{t.change})</span>
                    <Badge tone={verdict[t.verdict].tone}>{verdict[t.verdict].label}</Badge>
                  </span>
                </div>
                {t.closed.length ? <p className="mt-1 text-ink-soft"><span className="font-medium text-good">Closed:</span> {t.closed.join(", ")}</p> : null}
                {t.stillBelow.length ? <p className="mt-1 text-ink-soft"><span className="font-medium text-gap">Still below 50%:</span> {t.stillBelow.join(", ")}</p> : null}
                {t.slipped.length ? <p className="mt-1 text-ink-soft"><span className="font-medium text-warn">Slipped:</span> {t.slipped.join(", ")}</p> : null}
              </li>
            ))}
          </ul>
          {result.unmatchedTopics.onlyFirst.length || result.unmatchedTopics.onlySecond.length || result.unmatchedStudents.onlyFirst || result.unmatchedStudents.onlySecond ? (
            <p className="mt-3 text-sm text-ink-muted">
              Not compared:{" "}
              {[
                result.unmatchedTopics.onlyFirst.length ? `topics only in test 1 (${result.unmatchedTopics.onlyFirst.join(", ")})` : "",
                result.unmatchedTopics.onlySecond.length ? `topics only in test 2 (${result.unmatchedTopics.onlySecond.join(", ")})` : "",
                result.unmatchedStudents.onlyFirst ? `${result.unmatchedStudents.onlyFirst} student(s) only in test 1` : "",
                result.unmatchedStudents.onlySecond ? `${result.unmatchedStudents.onlySecond} student(s) only in test 2` : "",
              ].filter(Boolean).join("; ")}.
            </p>
          ) : null}
          <Button variant="secondary" className="mt-4" onClick={() => downloadText("heramb-follow-up-check.csv", comparisonToCsv(result))}>
            Download comparison (CSV)
          </Button>
          <p className="mt-3 text-sm text-ink-muted">
            Only compare tests of similar difficulty on the same topics. A small change can be noise; the margin treats it as "no clear change".
          </p>
        </div>
      ) : null}
    </section>
  );
}
