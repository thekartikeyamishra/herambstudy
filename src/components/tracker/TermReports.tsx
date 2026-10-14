"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { studentTermReports, type StudentTermReport, type TrackedTest } from "@/lib/tools/tracker";
import { statusFor, statusLabel } from "@/content/sampleData";
import { cn } from "@/lib/cn";

const fmt = (v: number | null) => (v === null ? "—" : `${v}%`);
const tone = { secure: "text-good", developing: "text-warn", gap: "text-gap" } as const;

function ReportBody({ r, className, tests, compact = false }: { r: StudentTermReport; className: string; tests: Array<{ name: string; date: string }>; compact?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#586076" }}>Term progress report · {className}</p>
      <h2 style={{ fontSize: compact ? 20 : 22, margin: "4px 0 2px" }}>{r.student}</h2>
      <p style={{ fontSize: 12, color: "#586076", margin: 0 }}>
        {r.testsTaken} of {tests.length} tests taken · {tests[0]?.date} to {tests[tests.length - 1]?.date}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 12 }}>
        <thead>
          <tr>
            {["Topic", "First", "Latest", "Change", "Now"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "2px solid #C8C1B2", padding: "6px 4px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.topics.filter((t) => t.attempts > 0).map((t) => (
            <tr key={t.topic}>
              <td style={{ borderBottom: "1px solid #E4DFD4", padding: "6px 4px" }}>{t.topic}</td>
              <td style={{ borderBottom: "1px solid #E4DFD4", padding: "6px 4px" }}>{fmt(t.first)}</td>
              <td style={{ borderBottom: "1px solid #E4DFD4", padding: "6px 4px" }}>{fmt(t.latest)}</td>
              <td style={{ borderBottom: "1px solid #E4DFD4", padding: "6px 4px" }}>{t.change === null ? "—" : `${t.change > 0 ? "+" : ""}${t.change}`}</td>
              <td style={{ borderBottom: "1px solid #E4DFD4", padding: "6px 4px" }}>{t.latest === null ? "—" : statusLabel[statusFor(t.latest)]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6 }}>
        <p style={{ margin: "4px 0" }}><strong>Strong:</strong> {r.strengths.join(", ") || "—"}</p>
        <p style={{ margin: "4px 0" }}><strong>Most improved:</strong> {r.improved.join(", ") || "—"}</p>
        <p style={{ margin: "4px 0" }}><strong>Focus next:</strong> {r.focus.join(", ") || "No topic below 50% — keep up mixed practice."}</p>
      </div>
      <p style={{ marginTop: 14, fontSize: 10, color: "#586076" }}>
        Secure ≥ 75%, developing 50–74%, gap &lt; 50%. Compares the student with their own earlier tests, not with classmates. Generated with Heramb.study.
      </p>
    </div>
  );
}

export function TermReports({ tests, className }: { tests: TrackedTest[]; className: string }) {
  const reports = useMemo(() => studentTermReports(tests), [tests]);
  const ordered = useMemo(() => [...tests].sort((a, b) => a.date.localeCompare(b.date)).map((t) => ({ name: t.name, date: t.date })), [tests]);
  const [selected, setSelected] = useState(reports[0]?.student ?? "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const clear = () => document.body.classList.remove("print-reports");
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  if (!reports.length) return null;
  const current = reports.find((r) => r.student === selected) ?? reports[0]!;

  return (
    <section aria-labelledby="term-title" data-testid="term-reports">
      <h3 id="term-title" className="font-sans text-lg font-semibold">Student term reports</h3>
      <p className="mt-1 text-sm text-ink-muted">
        One page per student across all {tests.length} saved test{tests.length === 1 ? "" : "s"} — each new test makes these richer. Ready to print or save as PDF for parent meetings.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="term-student" className="field-label">Preview student</label>
          <select id="term-student" className="field-input w-48" value={current.student} onChange={(e) => setSelected(e.target.value)}>
            {reports.map((r) => <option key={r.student} value={r.student}>{r.student}</option>)}
          </select>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            document.body.classList.add("print-reports");
            window.print();
          }}
        >
          Print all {reports.length} term reports
        </Button>
      </div>
      <div className="mt-4 rounded-xl border border-line-strong bg-white p-5" data-testid="term-preview">
        <ReportBody r={current} className={className} tests={ordered} compact />
        <p className={cn("mt-2 text-xs", current.focus.length ? tone.gap : tone.secure)}>
          {current.focus.length ? `${current.focus.length} topic${current.focus.length === 1 ? "" : "s"} to focus on` : "No focus topics right now"}
        </p>
      </div>
      {mounted
        ? createPortal(
            <div className="student-reports" aria-hidden="true">
              {reports.map((r) => (
                <section key={r.student} className="student-report">
                  <ReportBody r={r} className={className} tests={ordered} />
                </section>
              ))}
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
