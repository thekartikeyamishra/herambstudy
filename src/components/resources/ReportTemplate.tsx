"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";
import { statusFor, statusLabel } from "@/content/sampleData";
import { ToolShell, useToolTracking } from "./ToolShell";

type Row = { topic: string; before: string; after: string };
type Form = {
  student: string;
  group: string;
  firstTest: string;
  secondTest: string;
  strengths: string;
  nextSteps: string;
  teacher: string;
  rows: Row[];
};

const fictional: Form = {
  student: "Meera S. (fictional)",
  group: "Class 12 · Mathematics (fictional)",
  firstTest: "Unit test 2 — 14 Aug",
  secondTest: "Follow-up check — 4 Sep",
  strengths: "Consistent method in integration by parts; neat, well-checked working.",
  nextSteps: "Two short sets on definite-integral properties; one timed mixed set before the next unit test.",
  teacher: "Subject teacher (fictional)",
  rows: [
    { topic: "Integration by parts", before: "78", after: "84" },
    { topic: "Definite-integral properties", before: "44", after: "61" },
    { topic: "Area under curves", before: "55", after: "58" },
    { topic: "Differential equations", before: "70", after: "76" },
  ],
};
const empty: Form = { student: "", group: "", firstTest: "", secondTest: "", strengths: "", nextSteps: "", teacher: "", rows: [{ topic: "", before: "", after: "" }] };
const tone = { secure: "good", developing: "warn", gap: "gap" } as const;

function pct(v: string): number | null {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : null;
}

export function ReportTemplate() {
  const [form, setForm] = useState<Form>(fictional);
  const [isExample, setIsExample] = useState(true);
  const { onStart, onComplete } = useToolTracking("progress_report_template");

  const set = (key: Exclude<keyof Form, "rows">, value: string) => {
    onStart();
    setIsExample(false);
    setForm((f) => ({ ...f, [key]: value }));
  };
  const setRow = (i: number, key: keyof Row, value: string) => {
    onStart();
    setIsExample(false);
    setForm((f) => ({ ...f, rows: f.rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)) }));
  };

  const input = "field-input";
  const validRows = form.rows.filter((r) => r.topic.trim());

  return (
    <ToolShell id="report-template" title="Progress report template">
      <div className="no-print">
        <p className="text-[0.9375rem] text-ink-soft">
          Edit the fields — the report below updates as you type. Use percentages (0–100) from two comparable
          assessments. Then print it or save it as a PDF from the print dialog.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { setForm(empty); setIsExample(false); }}>Start blank</Button>
          <Button variant="ghost" onClick={() => { setForm(fictional); setIsExample(true); }}>Restore example</Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {([
            ["student", "Student name"],
            ["group", "Class / batch / subject"],
            ["firstTest", "First assessment"],
            ["secondTest", "Follow-up assessment"],
            ["teacher", "Prepared by"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`rt-${key}`} className="field-label">{label}</label>
              <input id={`rt-${key}`} className={input} maxLength={100} value={form[key]} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
        </div>

        <fieldset className="mt-6">
          <legend className="field-label">Topics (percent)</legend>
          <div className="space-y-2">
            {form.rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_5rem_2.75rem] gap-2">
                <input aria-label={`Topic ${i + 1}`} className={input} maxLength={80} placeholder="Topic" value={r.topic} onChange={(e) => setRow(i, "topic", e.target.value)} />
                <input aria-label={`Topic ${i + 1} first assessment percent`} className={`${input} tabular`} inputMode="numeric" placeholder="1st %" value={r.before} onChange={(e) => setRow(i, "before", e.target.value)} />
                <input aria-label={`Topic ${i + 1} follow-up percent`} className={`${input} tabular`} inputMode="numeric" placeholder="2nd %" value={r.after} onChange={(e) => setRow(i, "after", e.target.value)} />
                <button type="button" aria-label={`Remove topic ${i + 1}`} disabled={form.rows.length <= 1}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-line text-ink-muted hover:bg-paper-sunk disabled:opacity-40"
                  onClick={() => setForm((f) => ({ ...f, rows: f.rows.filter((_, j) => j !== i) }))}>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </button>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-3" disabled={form.rows.length >= 15}
            onClick={() => setForm((f) => ({ ...f, rows: [...f.rows, { topic: "", before: "", after: "" }] }))}>+ Add topic</Button>
        </fieldset>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rt-strengths" className="field-label">Strengths observed</label>
            <textarea id="rt-strengths" rows={3} maxLength={400} className={input} value={form.strengths} onChange={(e) => set("strengths", e.target.value)} />
          </div>
          <div>
            <label htmlFor="rt-next" className="field-label">Agreed next steps</label>
            <textarea id="rt-next" rows={3} maxLength={400} className={input} value={form.nextSteps} onChange={(e) => set("nextSteps", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Live report */}
      <article className="mt-8 rounded-2xl border border-line-strong bg-white p-5 sm:p-7" aria-label="Report preview" data-testid="report-preview">
        <header className="flex flex-col justify-between gap-2 border-b border-line pb-4 sm:flex-row">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Student progress report</p>
            <h3 className="mt-1 font-sans text-xl font-semibold">{form.student || "Student name"}</h3>
            <p className="text-sm text-ink-muted">{form.group || "Class / batch / subject"}</p>
          </div>
          {isExample ? <Badge tone="warn" className="self-start">Example — fictional data</Badge> : null}
        </header>
        <table className="mt-4 w-full text-left text-sm">
          <caption className="sr-only">Topic progress</caption>
          <thead><tr className="border-b border-line text-xs uppercase tracking-wider text-ink-muted">
            <th scope="col" className="py-2 pr-2 font-medium">Topic</th>
            <th scope="col" className="py-2 pr-2 font-medium">{form.firstTest || "First"}</th>
            <th scope="col" className="py-2 pr-2 font-medium">{form.secondTest || "Follow-up"}</th>
            <th scope="col" className="py-2 font-medium">Now</th>
          </tr></thead>
          <tbody>
            {validRows.length === 0 ? (
              <tr><td colSpan={4} className="py-4 text-ink-muted">Add topics above to fill this table.</td></tr>
            ) : validRows.map((r, i) => {
              const a = pct(r.before);
              const b = pct(r.after);
              const st = b !== null ? statusFor(b) : null;
              return (
                <tr key={i} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-2 font-medium">{r.topic}</th>
                  <td className="tabular py-2 pr-2">{a !== null ? `${a}%` : "—"}</td>
                  <td className="tabular py-2 pr-2">
                    {b !== null ? `${b}%` : "—"}
                    {a !== null && b !== null ? <span className={b - a >= 0 ? " text-good" : " text-gap"}> ({b - a >= 0 ? "+" : "−"}{Math.abs(b - a)})</span> : null}
                  </td>
                  <td className="py-2">{st ? <Badge tone={tone[st]}>{statusLabel[st]}</Badge> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div><p className="font-semibold">Strengths</p><p className="mt-1 whitespace-pre-line text-ink-soft">{form.strengths || "—"}</p></div>
          <div><p className="font-semibold">Next steps</p><p className="mt-1 whitespace-pre-line text-ink-soft">{form.nextSteps || "—"}</p></div>
        </div>
        <footer className="mt-5 border-t border-line pt-3 text-xs text-ink-muted">
          Prepared by {form.teacher || "—"} · Secure ≥ 75%, developing 50–74%, gap &lt; 50% · Template from Heramb.study
        </footer>
      </article>
      <div className="no-print mt-4">
        <Button onClick={() => { onComplete(); window.print(); }}>Print or save as PDF</Button>
      </div>
    </ToolShell>
  );
}
