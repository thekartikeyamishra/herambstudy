"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { statusFor } from "@/content/sampleData";
import { loadHistory, removeReport, topicHistory, type StudentHistory } from "@/lib/client/studentStore";
import { encodeReport, focusTopics } from "@/lib/tools/studentReport";
import { cn } from "@/lib/cn";

const cellTone = { secure: "bg-good-tint text-good", developing: "bg-warn-tint text-warn", gap: "bg-gap-tint text-gap" } as const;

/** The student's saved reports and per-topic history, all on this device. */
export function MyProgress() {
  const [history, setHistory] = useState<StudentHistory | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    const r = loadHistory();
    setHistory(r.history);
    setAvailable(r.ok);
  }, []);

  if (!history) return <div className="min-h-[40vh]" aria-busy="true" />;

  if (!history.reports.length) {
    return (
      <div className="card p-6 sm:p-8" data-testid="progress-empty">
        <h2 className="text-display-md">No saved reports yet</h2>
        <p className="mt-3 text-ink-soft">
          When your teacher sends you a Heramb report link, open it and press <strong>Save to my progress</strong>. Each report you save
          appears here, and you'll see every topic change over time.
        </p>
        {!available ? <p className="mt-3 text-sm text-gap">This browser isn't allowing saving (for example private mode).</p> : null}
        <p className="mt-5 text-sm text-ink-muted">
          No report yet? Try the <Link href="/resources/assessment-readiness-diagnostic" className="font-medium text-brand underline underline-offset-4">3-minute readiness check</Link> or{" "}
          <Link href="/resources/learning-gap-analysis" className="font-medium text-brand underline underline-offset-4">find your weak topics</Link> yourself.
        </p>
      </div>
    );
  }

  const reports = [...history.reports].sort((a, b) => b.report.d.localeCompare(a.report.d));
  const topics = topicHistory(history);
  const improving = topics.filter((t) => t.points.length >= 2 && t.points[t.points.length - 1]!.pct - t.points[t.points.length - 2]!.pct > 5);
  const latestFocus = focusTopics(reports[0]!.report);

  return (
    <div className="space-y-8" data-testid="progress">
      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Reports saved", String(reports.length)],
          ["Topics tracked", String(topics.length)],
          ["Improving", String(improving.length)],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <dt className="text-xs text-ink-muted">{k}</dt>
            <dd className="tabular mt-1 text-2xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {latestFocus.length ? (
        <div className="rounded-xl border border-brand/25 bg-brand-tint/40 p-5">
          <p className="font-semibold text-ink">Focus now</p>
          <p className="mt-1 text-ink-soft">From your latest report: <strong>{latestFocus.join(", ")}</strong>.</p>
        </div>
      ) : null}

      <section aria-labelledby="topic-history-title">
        <h2 id="topic-history-title" className="font-sans text-lg font-semibold">Each topic over time</h2>
        <ul className="mt-3 space-y-2" data-testid="topic-history">
          {topics.map((t) => (
            <li key={t.topic} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3 text-sm">
              <span className="font-medium text-ink">{t.topic}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                {t.points.map((p, i) => (
                  <span key={i} title={`${p.test} · ${p.date}`} className={cn("tabular rounded-md px-2 py-0.5 font-medium", cellTone[statusFor(p.pct)])}>
                    {p.pct}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-muted">Oldest on the left. Topics are matched by name across reports.</p>
      </section>

      <section aria-labelledby="saved-title">
        <h2 id="saved-title" className="font-sans text-lg font-semibold">Saved reports</h2>
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
          {reports.map(({ id, report }) => (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span>
                <a href={`/r#${encodeReport(report)}`} className="font-medium text-brand underline underline-offset-4">{report.t}</a>
                <span className="text-ink-muted"> · {report.i} · {report.d}</span>
              </span>
              <Button
                variant="ghost"
                aria-label={`Delete ${report.t}`}
                onClick={() => {
                  if (removeReport(id)) setHistory(loadHistory().history);
                }}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-ink-muted">Saved only in this browser on this device. Clearing browser data removes them.</p>
    </div>
  );
}
