"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge, FictionalDataLabel } from "@/components/ui/Primitives";
import { statusFor, statusLabel } from "@/content/sampleData";
import {
  analyseClass,
  buildDataset,
  groupsToCsv,
  LIMITS,
  parseTable,
  sampleCsv,
  templateCsv,
  type ClassAnalysis,
  type Dataset,
  type ParseIssue,
} from "@/lib/tools/classAnalysis";
import { cn } from "@/lib/cn";
import { ClassFollowUp } from "./ClassFollowUp";
import { StudentLinks } from "./StudentLinks";
import { TeachingSummary } from "./TeachingSummary";
import { SaveToTracker } from "@/components/tracker/SaveToTracker";
import { ToolShell, downloadText, useToolTracking } from "./ToolShell";
import { ImportPanel, tidyTable, type ImportResult } from "./ImportPanel";
import { PaperMapPanel, looksQuestionWise } from "./PaperMapPanel";
import { InstituteBar } from "@/components/founding/InstituteBar";
import { ShareSummary } from "@/components/founding/ShareSummary";
import { recordUsage } from "@/lib/client/usage";
import { ANALYSER_TEXT, TEACHER_LANG_KEY, type TeacherLang } from "@/lib/i18n/analyser";
import { markDone, textHash } from "@/lib/client/onceStore";

const actionTone = { whole_class: "gap", small_group: "warn", maintain: "good", no_data: "neutral" } as const;

const cellTone = { secure: "bg-good-tint text-good", developing: "bg-warn-tint text-warn", gap: "bg-gap-tint text-gap" } as const;

export function ClassAnalyser() {
  const [text, setText] = useState("");
  const [isSample, setIsSample] = useState(false);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [data, setData] = useState<Dataset | null>(null);
  const [result, setResult] = useState<ClassAnalysis | null>(null);
  /** The exact text behind the current result (the box may be edited afterwards). */
  const [analysedRaw, setAnalysedRaw] = useState("");
  const [importNotes, setImportNotes] = useState<string[]>([]);
  const [needsReview, setNeedsReview] = useState(false);
  const [questionWise, setQuestionWise] = useState(false);
  const [tidy, setTidy] = useState<{ text: string; notes: string[] } | null>(null);
  const [mounted, setMounted] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const issuesRef = useRef<HTMLDivElement>(null);
  const { onStart, onComplete } = useToolTracking("class_test_analyser");
  const [lang, setLang] = useState<TeacherLang>("en");
  const t = ANALYSER_TEXT[lang];
  useEffect(() => {
    try {
      if (localStorage.getItem(TEACHER_LANG_KEY) === "hi") setLang("hi");
    } catch {
      /* ignore */
    }
  }, []);
  function chooseLang(l: TeacherLang) {
    setLang(l);
    try {
      localStorage.setItem(TEACHER_LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    setMounted(true);
    const clear = () => document.body.classList.remove("print-reports");
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  function analyse(source = text, sample = isSample) {
    const { dataset, issues: found, warnings: notes } = buildDataset(parseTable(source));
    setIssues(found);
    setWarnings(notes);
    setNeedsReview(false);
    if (!dataset) {
      setData(null);
      setResult(null);
      // A raw export (title rows, names, totals…) often fails; offer a one-tap clean-up.
      const t = tidyTable(source);
      setTidy(t.changed ? { text: t.text, notes: t.notes } : null);
      requestAnimationFrame(() => issuesRef.current?.focus());
      return;
    }
    setTidy(null);
    setData(dataset);
    setAnalysedRaw(source);
    setResult(analyseClass(dataset));
    // The same marks analysed again (re-clicks, edits of the name only) count once per device.
    if (sample) recordUsage("analysis_sample");
    else if (markDone("heramb.analysed.v1", textHash(source))) recordUsage("analysis_real");
    onComplete();
    requestAnimationFrame(() => resultsRef.current?.focus());
  }

  function onImported(r: ImportResult) {
    setText(r.text);
    setIsSample(false);
    setImportNotes(r.notes);
    if (r.review) {
      // AI-read marks are shown for checking first — never analysed blind.
      setNeedsReview(true);
      setIssues([]);
      setData(null);
      setResult(null);
      return;
    }
    if (looksQuestionWise(r.text)) {
      // Question-wise sheets need the paper map first; analysing Q1…Qn as "topics" would mislead.
      setQuestionWise(true);
      setIssues([]);
      setData(null);
      setResult(null);
      return;
    }
    analyse(r.text, false);
  }

  function printReports() {
    document.body.classList.add("print-reports");
    window.print();
  }

  return (
    <ToolShell id="class-analyser" title="Class test analyser">
      <InstituteBar />
      <div className="mb-3 flex justify-end gap-1 text-sm" role="group" aria-label="Language / भाषा">
        {(["en", "hi"] as const).map((l) => (
          <button key={l} type="button" onClick={() => chooseLang(l)} aria-pressed={lang === l} lang={l === "hi" ? "hi" : "en"}
            className={cn("min-h-9 rounded-full border px-3", lang === l ? "border-brand bg-brand-tint/60 font-medium" : "border-line-strong")}>
            {l === "en" ? "English" : "हिंदी"}
          </button>
        ))}
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-[0.9375rem] text-ink-soft" lang={lang}>
        <li>{t.step1}</li>
        <li>{t.step2a}<strong>MAX</strong>{t.step2b}</li>
        <li>{t.step3a}<strong>AB</strong>{t.step3b}</li>
      </ol>
      <p className="mt-2 text-sm text-ink-muted" lang={lang} data-testid="totals-only-hint">{t.totalsOnly}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            const s = sampleCsv();
            setText(s);
            setIsSample(true);
            setImportNotes([]);
            onStart();
            analyse(s, true);
          }}
        >
          Load a fictional class
        </Button>
        <Button variant="ghost" onClick={() => downloadText("heramb-class-template.csv", templateCsv())}>
          Download template
        </Button>
      </div>
      <ImportPanel onImported={onImported} onStart={onStart} />

      <label htmlFor="class-data" className="field-label mt-5">{t.pasteLabel}</label>
      <textarea
        id="class-data"
        rows={8}
        spellCheck={false}
        className="field-input font-mono text-sm"
        placeholder={"Roll no\tKinematics\tLaws of motion\nMAX\t20\t20\nR01\t14\t9"}
        value={text}
        onChange={(e) => {
          onStart();
          setIsSample(false);
          setText(e.target.value);
          if (looksQuestionWise(e.target.value)) setQuestionWise(true);
        }}
        aria-describedby="class-data-hint"
      />
      <p id="class-data-hint" className="field-hint">
        Up to {LIMITS.students} students and {LIMITS.topics} topics. Everything stays in your browser.
      </p>
      {isSample ? <FictionalDataLabel className="mt-3" /> : null}
      {importNotes.length ? (
        <ul className="mt-3 space-y-1 text-sm text-ink-soft" role="status" data-testid="import-notes">
          {importNotes.map((n) => <li key={n}>• {n}</li>)}
        </ul>
      ) : null}
      <PaperMapPanel
        text={text}
        open={questionWise}
        onConverted={(converted, notes) => {
          setText(converted);
          setImportNotes(notes);
          setQuestionWise(false);
          analyse(converted, false);
        }}
      />
      {needsReview ? (
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn-tint/60 p-3 text-sm text-ink" data-testid="import-review">
          Check the numbers above against the marksheet, correct anything that's wrong, then press <strong>Analyse class</strong>.
        </p>
      ) : null}
      <div className="mt-4">
        <Button onClick={() => analyse()} disabled={!text.trim()}>{t.analyse}</Button>
      </div>

      {issues.length ? (
        <div ref={issuesRef} tabIndex={-1} role="alert" className="mt-6 rounded-xl border border-gap/30 bg-gap-tint/60 p-4 text-sm focus:outline-none" data-testid="class-issues">
          <p className="font-semibold text-gap">Please fix {issues.length === 1 ? "this" : `these ${issues.length}`} before analysing:</p>
          <p className="mt-1 text-xs text-ink-muted">Row numbers count non-empty rows, starting with the header as row 1.</p>
          <ul className="mt-2 space-y-1 text-ink-soft">
            {issues.map((i, n) => (
              <li key={n}>
                Row {i.row}
                {i.column ? `, column ${i.column}` : ""}: {i.message}
              </li>
            ))}
          </ul>
          {tidy ? (
            <div className="mt-3 border-t border-gap/20 pt-3">
              <p className="text-ink">This looks like an exported result sheet. Heramb can tidy it for you:</p>
              <ul className="mt-1 text-ink-soft">{tidy.notes.map((n) => <li key={n}>• {n}</li>)}</ul>
              <Button className="mt-2" variant="secondary" onClick={() => { const t = tidy.text; setText(t); setImportNotes(tidy.notes); analyse(t, false); }}>
                Tidy and analyse
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {result && data ? (
        <div ref={resultsRef} tabIndex={-1} className="mt-10 border-t border-line pt-8 focus:outline-none" data-testid="class-results">
          <h3 className="font-sans text-xl font-semibold" lang={lang}>{t.overview}</h3>
          {warnings.map((w) => (
            <p key={w} role="status" className="mt-1 text-sm text-warn" data-testid="class-warning">{w}</p>
          ))}
          {data.assumedPercent ? (
            <p className="mt-1 text-sm text-ink-muted">No MAX row found, so values were read as percentages.</p>
          ) : null}
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t.students, String(result.students.length)],
              [t.topics, String(result.topics.length)],
              [t.average, result.classAverage === null ? "—" : `${result.classAverage}%`],
              [t.wholeClass, String(result.topics.filter((x) => x.action === "whole_class").length)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-paper p-3">
                <dt className="text-xs text-ink-muted">{k}</dt>
                <dd className="tabular mt-1 text-xl font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-10 font-sans text-xl font-semibold" lang={lang}>{t.plan}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {t.planHint}
          </p>
          <ol className="mt-4 space-y-3" data-testid="teaching-plan">
            {result.plan.map((p) => (
              <li key={p.name} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{p.name}</span>
                  <Badge tone={actionTone[p.action]}>{t.actions[p.action]}</Badge>
                </div>
                <p className="tabular mt-1 text-sm text-ink-soft">
                  {t.avgLine(p.average, p.belowHalf.length, p.attempted, Math.round(p.shareBelowHalf * 100))}
                </p>
                {p.belowHalf.length && p.action !== "whole_class" ? (
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-medium text-ink">{t.recap}</span> {p.belowHalf.join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>

          <h3 className="mt-10 font-sans text-xl font-semibold" lang={lang}>{t.gapMap}</h3>
          <p className="mt-1 text-sm text-ink-muted">{t.gapHint}</p>
          <div className="mt-4 max-h-[32rem] overflow-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Percent score of each student in each topic</caption>
              <thead className="sticky top-0 z-10 bg-paper-raised">
                <tr>
                  <th scope="col" className="sticky left-0 z-20 border-b border-line bg-paper-raised px-3 py-2 font-medium">Student</th>
                  {data.topics.map((t) => (
                    <th key={t.name} scope="col" className="whitespace-nowrap border-b border-line px-3 py-2 font-medium">{t.name}</th>
                  ))}
                  <th scope="col" className="border-b border-line px-3 py-2 font-medium">Overall</th>
                </tr>
              </thead>
              <tbody>
                {result.students.map((s) => (
                  <tr key={s.id}>
                    <th scope="row" className="sticky left-0 border-b border-line bg-paper-raised px-3 py-1.5 font-medium">
                      {s.id}
                      {s.needsAttention ? <span className="ml-1 text-gap" aria-label="needs attention">●</span> : null}
                    </th>
                    {s.percents.map((p, i) => (
                      <td key={i} className={cn("tabular border-b border-line px-3 py-1.5 text-center font-medium", p === null ? "text-ink-muted" : cellTone[statusFor(p)])}>
                        {p === null ? "—" : p}
                      </td>
                    ))}
                    <td className="tabular border-b border-line px-3 py-1.5 text-center font-semibold">{s.overall ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.students.some((s) => s.needsAttention) ? (
            <p className="mt-3 text-sm text-ink-soft">
              <span className="text-gap">●</span> Below 50% in at least half of their attempted topics:{" "}
              <strong>{result.students.filter((s) => s.needsAttention).map((s) => s.id).join(", ")}</strong>. Consider a one-to-one conversation.
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => downloadText("heramb-reteach-groups.csv", groupsToCsv(result))}>Download reteach groups (CSV)</Button>
            <Button variant="secondary" onClick={printReports}>Print individual student reports</Button>
          </div>

          <ShareSummary key={`share-${analysedRaw.length}-${analysedRaw.slice(0, 40)}`} analysis={result} isSample={isSample} />

          <TeachingSummary key={`sum-${analysedRaw.length}-${analysedRaw.slice(0, 40)}`} analysis={result} />

          <StudentLinks key={`links-${analysedRaw.length}-${analysedRaw.slice(0, 40)}`} data={data} analysis={result} isSample={isSample} />

          <SaveToTracker key={`save-${analysedRaw.length}-${analysedRaw.slice(0, 40)}`} raw={analysedRaw} isSample={isSample} />

          <ClassFollowUp key={`${data.students.length}:${data.topics.map((t) => t.name).join("|")}`} first={data} firstIsSample={isSample} />

          <div className="mt-8 rounded-xl border border-brand/25 bg-brand-tint/40 p-5 text-[0.9375rem] text-ink-soft">
            <p className="font-semibold text-ink">Want this after every test, with mistake types and follow-up checks?</p>
            <p className="mt-1">
              That's what the full platform does.{" "}
              <Link href="/founding" className="font-medium text-brand underline underline-offset-4">Join as a founding institute</Link> — free, no accounts.
            </p>
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            A single test is a small sample, especially for topics with few questions. Use this to decide where to look
            first, then confirm with the answer sheets.
          </p>

          {mounted
            ? createPortal(
                <div className="student-reports" aria-hidden="true">
                  {result.students.map((s) => (
                    <section key={s.id} className="student-report">
                      <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#586076" }}>Student test report</p>
                      <h2 style={{ fontSize: 22, margin: "4px 0 12px" }}>{s.id}</h2>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", borderBottom: "2px solid #C8C1B2", padding: "6px 4px" }}>Topic</th>
                            <th style={{ textAlign: "left", borderBottom: "2px solid #C8C1B2", padding: "6px 4px" }}>Score</th>
                            <th style={{ textAlign: "left", borderBottom: "2px solid #C8C1B2", padding: "6px 4px" }}>Status</th>
                            <th style={{ textAlign: "left", borderBottom: "2px solid #C8C1B2", padding: "6px 4px" }}>Class average</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topics.map((t, i) => {
                            const p = s.percents[i];
                            return (
                              <tr key={t.name}>
                                <td style={{ borderBottom: "1px solid #E4DFD4", padding: "6px 4px" }}>{t.name}</td>
                                <td style={{ borderBottom: "1px solid #E4DFD4", padding: "6px 4px" }}>{p === null || p === undefined ? "Absent" : `${p}%`}</td>
                                <td style={{ borderBottom: "1px solid #E4DFD4", padding: "6px 4px" }}>{p === null || p === undefined ? "—" : statusLabel[statusFor(p)]}</td>
                                <td style={{ borderBottom: "1px solid #E4DFD4", padding: "6px 4px" }}>{result.topics[i]?.average ?? "—"}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p style={{ marginTop: 14, fontSize: 13 }}>
                        <strong>Focus next:</strong>{" "}
                        {s.gaps.length ? s.gaps.slice(0, 2).map((g) => g.topic).join(" and ") : "No topic below 50% — keep up mixed practice."}
                      </p>
                      <p style={{ marginTop: 18, fontSize: 10, color: "#586076" }}>
                        Secure ≥ 75%, developing 50–74%, gap &lt; 50%. One test is a small sample — discuss with your teacher. Generated with Heramb.study.
                      </p>
                    </section>
                  ))}
                </div>,
                document.body,
              )
            : null}
        </div>
      ) : null}
    </ToolShell>
  );
}
