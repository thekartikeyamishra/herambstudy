"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InstallControl } from "@/components/pwa/InstallControl";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";
import { statusFor } from "@/content/sampleData";
import { REPORT_LANGS, formatReportDate, reportText, type ReportLang } from "@/lib/i18n/report";
import { track } from "@/lib/client/analytics";
import { isSaved, loadHistory, saveReport, type SaveOutcome } from "@/lib/client/studentStore";
import { decodeReport, focusTopics, reportId, type StudentReport } from "@/lib/tools/studentReport";
import { recordUsage } from "@/lib/client/usage";
import { getInstitute } from "@/lib/client/institute";
import { doneBefore, markDone } from "@/lib/client/onceStore";
import { addDays, revisionReminderIcs } from "@/lib/tools/ics";
import { todayIso } from "@/lib/client/workspace";
import { cn } from "@/lib/cn";

const tone = { secure: "good", developing: "warn", gap: "gap" } as const;
const bar = { secure: "bg-good", developing: "bg-warn", gap: "bg-gap" } as const;

const OPENED_KEY = "heramb.reports-opened.v1";
const HELPFUL_KEY = "heramb.reports-rated.v1";

/** Student-side counts go to the institute code carried in the link (if any). Counts only. */
const studentUsage = (r: StudentReport, type: Parameters<typeof recordUsage>[0]) => {
  // A teacher previewing links on a device connected to the same institute isn't a student.
  if (r.c && getInstitute()?.code === r.c) return;
  recordUsage(type, { role: "student", code: r.c ?? null });
};

const LANG_PREF_KEY = "heramb.reader-lang.v1";

/** A student's personal test report, decoded from the URL fragment. */
export function ReportView() {
  const [state, setState] = useState<"loading" | "invalid" | "ready">("loading");
  const [report, setReport] = useState<StudentReport | null>(null);
  const [saved, setSaved] = useState<SaveOutcome | "no">("no");
  const [savedCount, setSavedCount] = useState(0);
  const [lang, setLang] = useState<ReportLang>("en");
  const [rated, setRated] = useState(false);
  const [thanks, setThanks] = useState<"" | "yes" | "no">("");
  const [nextTest, setNextTest] = useState("");
  const [reminded, setReminded] = useState(false);

  useEffect(() => {
    const read = () => {
      const r = decodeReport(window.location.hash);
      setReport(r);
      setState(r ? "ready" : "invalid");
      if (r) {
        setSaved(isSaved(r) ? "already_saved" : "no");
        let pref: string | null = null;
        try {
          pref = localStorage.getItem(LANG_PREF_KEY);
        } catch {
          /* ignore */
        }
        setLang(pref === "hi" || pref === "en" ? pref : r.l === "hi" ? "hi" : "en");
        setSavedCount(loadHistory().history.reports.length);
        const id = reportId(r);
        setRated(doneBefore(HELPFUL_KEY, id));
        if (markDone(OPENED_KEY, id)) studentUsage(r, "report_opened");
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (state === "loading") return <div className="min-h-[50vh]" aria-busy="true" />;

  if (state === "invalid" || !report) {
    return (
      <div className="card p-6 sm:p-8" role="alert" data-testid="report-invalid">
        <h1 className="text-display-md">This report link is incomplete</h1>
        <p className="mt-3 text-ink-soft">
          The report is stored inside the link itself, so the whole link is needed. Ask your teacher to send it again, or copy the
          complete link from the message.
        </p>
        <p className="mt-2 text-ink-soft" lang="hi">यह रिपोर्ट लिंक अधूरा है। पूरी रिपोर्ट लिंक के अंदर ही होती है — अपने शिक्षक से लिंक दोबारा भेजने को कहें।</p>
        <p className="mt-4"><Link href="/me" className="font-medium text-brand underline underline-offset-4">See reports you've saved on this device →</Link></p>
      </div>
    );
  }

  const tx = reportText(lang);
  const focus = focusTopics(report);
  const present = report.p.filter((p): p is number => typeof p === "number");
  const overall = present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : null;

  function onSave() {
    if (!report) return;
    const r = saveReport(report);
    setSaved(r);
    if (r === "saved") {
      setSavedCount((c) => c + 1);
      track("student_report_saved");
      studentUsage(report, "report_saved");
    }
  }

  function rate(helpful: boolean) {
    if (!report) return;
    if (markDone(HELPFUL_KEY, reportId(report))) studentUsage(report, helpful ? "student_helpful_yes" : "student_helpful_no");
    setRated(true);
    setThanks(helpful ? "yes" : "no");
  }

  function remind() {
    if (!report) return;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(nextTest) && nextTest > todayIso() ? nextTest : addDays(todayIso(), 7);
    const ics = revisionReminderIcs({ testDate: date, testName: "your next test", focus: focusTopics(report), uid: `${reportId(report)}-${date}` });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    a.download = "heramb-revision-reminder.ics";
    a.click();
    URL.revokeObjectURL(a.href);
    if (!reminded) studentUsage(report, "reminder_added");
    setReminded(true);
  }

  return (
    <div className="space-y-6" data-testid="student-report" lang={lang}>
      <header className="card overflow-hidden">
        <div className="border-b border-line bg-paper-sunk/60 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{tx.sharedBy(report.i)}</p>
            <div role="group" aria-label={tx.language} className="flex gap-1 text-xs">
              {REPORT_LANGS.map((o) => (
                <button key={o.value} type="button" aria-pressed={lang === o.value} lang={o.value}
                  className={cn("min-h-9 rounded-full border px-3", lang === o.value ? "border-brand bg-brand-tint/60 font-semibold" : "border-line-strong")}
                  onClick={() => { setLang(o.value); try { localStorage.setItem(LANG_PREF_KEY, o.value); } catch { /* ignore */ } }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <h1 className="mt-1 text-display-md">{report.t}</h1>
          <p className="mt-1 text-sm text-ink-muted">{report.s} · {formatReportDate(report.d, lang)}</p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line">
          <div className="bg-paper-raised p-4">
            <p className="text-xs text-ink-muted">{tx.yourAverage}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{overall === null ? "—" : `${overall}%`}</p>
          </div>
          <div className="bg-paper-raised p-4">
            <p className="text-xs text-ink-muted">{tx.focusCount}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{focus.length}</p>
          </div>
        </div>
      </header>

      <section className="card p-5 sm:p-6" aria-labelledby="topics-title">
        <h2 id="topics-title" className="font-sans text-lg font-semibold">{tx.yourTopics}</h2>
        <ul className="mt-4 space-y-4">
          {report.n.map((name, i) => {
            const p = report.p[i];
            const avg = report.a[i];
            const st = typeof p === "number" ? statusFor(p) : null;
            return (
              <li key={`${name}-${i}`}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{name}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular text-ink-soft">{typeof p === "number" ? `${p}%` : tx.absent}</span>
                    {st ? <Badge tone={tone[st]}>{tx.status[st]}</Badge> : null}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-sunk" aria-hidden="true">
                  {st && typeof p === "number" ? <div className={cn("h-full rounded-full", bar[st])} style={{ width: `${Math.max(p, 2)}%` }} /> : null}
                </div>
                {typeof avg === "number" ? <p className="tabular mt-1 text-xs text-ink-muted">{tx.classAverage(avg)}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="next-title">
        <h2 id="next-title" className="font-sans text-lg font-semibold">{tx.nextSteps}</h2>
        {focus.length ? (
          <p className="mt-2 text-ink-soft">
            <strong className="text-ink">{tx.startWith(focus)}</strong> {tx.whyWrong}
          </p>
        ) : (
          <p className="mt-2 text-ink-soft">{tx.noGap}</p>
        )}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li><Link href="/resources/interpreting-repeated-mistakes" className="block rounded-xl border border-line p-4 text-sm hover:bg-paper-sunk"><span className="font-semibold text-ink">{tx.mistakesLink}</span><span className="mt-1 block text-ink-muted">{tx.mistakesHint}</span></Link></li>
          <li><Link href="/resources/assessment-readiness-diagnostic" className="block rounded-xl border border-line p-4 text-sm hover:bg-paper-sunk"><span className="font-semibold text-ink">{tx.readinessLink}</span><span className="mt-1 block text-ink-muted">{tx.readinessHint}</span></Link></li>
        </ul>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="remind-title" data-testid="report-reminder">
        <h2 id="remind-title" className="font-sans text-lg font-semibold">{tx.remindTitle}</h2>
        <p className="mt-2 text-[0.9375rem] text-ink-soft">{tx.remindBody}</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="next-test" className="field-label">{tx.nextTestDate}</label>
            <input id="next-test" type="date" className="field-input" min={todayIso()} value={nextTest} onChange={(e) => setNextTest(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={remind}>{reminded ? tx.addedAgain : tx.addToCalendar}</Button>
        </div>
        {!nextTest ? <p className="mt-2 text-xs text-ink-muted">{tx.noDateHint}</p> : null}
      </section>

      <section className="card border-brand/30 bg-brand-tint/30 p-5 sm:p-6" aria-labelledby="save-title">
        <h2 id="save-title" className="font-sans text-lg font-semibold">{tx.saveTitle}</h2>
        <p className="mt-2 text-[0.9375rem] text-ink-soft">
          {tx.saveBody}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {saved === "saved" || saved === "already_saved" ? (
            <p role="status" className="font-medium text-good" data-testid="report-saved">
              {tx.saved(savedCount)}
            </p>
          ) : (
            <Button onClick={onSave}>{tx.saveButton}</Button>
          )}
          <Link href="/me" className="font-medium text-brand underline underline-offset-4">{tx.myProgress}</Link>
        </div>
        {saved === "unavailable" ? <p role="alert" className="field-error">{tx.saveUnavailable}</p> : null}
        {saved === "full" ? <p role="alert" className="field-error">{tx.saveFull}</p> : null}
        <div className="mt-5 border-t border-brand/20 pt-4">
          <p className="mb-2 text-sm text-ink-muted">{tx.installLine}</p>
          <InstallControl />
        </div>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="useful-title" data-testid="report-useful">
        <h2 id="useful-title" className="font-sans text-lg font-semibold">{tx.usefulTitle}</h2>
        {rated ? (
          <p role="status" className="mt-2 text-ink-soft">{thanks === "no" ? tx.thanksNo : tx.thanksYes}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => rate(true)}>{tx.usefulYes}</Button>
            <Button variant="ghost" onClick={() => rate(false)}>{tx.usefulNo}</Button>
          </div>
        )}
      </section>

      <p className="text-xs text-ink-muted">{tx.footer}</p>
    </div>
  );
}
