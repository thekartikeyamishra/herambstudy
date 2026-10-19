"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InstallControl } from "@/components/pwa/InstallControl";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";
import { statusFor, statusLabel } from "@/content/sampleData";
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

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** A student's personal test report, decoded from the URL fragment. */
export function ReportView() {
  const [state, setState] = useState<"loading" | "invalid" | "ready">("loading");
  const [report, setReport] = useState<StudentReport | null>(null);
  const [saved, setSaved] = useState<SaveOutcome | "no">("no");
  const [savedCount, setSavedCount] = useState(0);
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
        <p className="mt-4"><Link href="/me" className="font-medium text-brand underline underline-offset-4">See reports you've saved on this device →</Link></p>
      </div>
    );
  }

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
    <div className="space-y-6" data-testid="student-report">
      <header className="card overflow-hidden">
        <div className="border-b border-line bg-paper-sunk/60 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Shared by {report.i}</p>
          <h1 className="mt-1 text-display-md">{report.t}</h1>
          <p className="mt-1 text-sm text-ink-muted">{report.s} · {fmt(report.d)}</p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line">
          <div className="bg-paper-raised p-4">
            <p className="text-xs text-ink-muted">Your average</p>
            <p className="tabular mt-1 text-2xl font-semibold">{overall === null ? "—" : `${overall}%`}</p>
          </div>
          <div className="bg-paper-raised p-4">
            <p className="text-xs text-ink-muted">Topics to focus on</p>
            <p className="tabular mt-1 text-2xl font-semibold">{focus.length}</p>
          </div>
        </div>
      </header>

      <section className="card p-5 sm:p-6" aria-labelledby="topics-title">
        <h2 id="topics-title" className="font-sans text-lg font-semibold">Your topics</h2>
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
                    <span className="tabular text-ink-soft">{typeof p === "number" ? `${p}%` : "Absent"}</span>
                    {st ? <Badge tone={tone[st]}>{statusLabel[st]}</Badge> : null}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-sunk" aria-hidden="true">
                  {st && typeof p === "number" ? <div className={cn("h-full rounded-full", bar[st])} style={{ width: `${Math.max(p, 2)}%` }} /> : null}
                </div>
                {typeof avg === "number" ? <p className="tabular mt-1 text-xs text-ink-muted">Class average {avg}%</p> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="next-title">
        <h2 id="next-title" className="font-sans text-lg font-semibold">Your next steps</h2>
        {focus.length ? (
          <p className="mt-2 text-ink-soft">
            Start with <strong className="text-ink">{focus.length > 1 ? `${focus.slice(0, -1).join(", ")} and ${focus[focus.length - 1]}` : focus[0]}</strong>. Before practising, look at your wrong answers and
            work out <em>why</em> they were wrong — the fix is different for a concept gap, a careless slip or running out of time.
          </p>
        ) : (
          <p className="mt-2 text-ink-soft">No topic below 50% — keep it that way with mixed, timed practice before the next test.</p>
        )}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li><Link href="/resources/interpreting-repeated-mistakes" className="block rounded-xl border border-line p-4 text-sm hover:bg-paper-sunk"><span className="font-semibold text-ink">Understand your mistakes →</span><span className="mt-1 block text-ink-muted">Find your main mistake type and its fix.</span></Link></li>
          <li><Link href="/resources/assessment-readiness-diagnostic" className="block rounded-xl border border-line p-4 text-sm hover:bg-paper-sunk"><span className="font-semibold text-ink">3-minute readiness check →</span><span className="mt-1 block text-ink-muted">The one study habit to fix before your next test.</span></Link></li>
        </ul>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="remind-title" data-testid="report-reminder">
        <h2 id="remind-title" className="font-sans text-lg font-semibold">Remind me to revise before the next test</h2>
        <p className="mt-2 text-[0.9375rem] text-ink-soft">Adds a 45-minute revision slot to your phone's calendar at 6 pm the day before, with your focus topics.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="next-test" className="field-label">Next test date (optional)</label>
            <input id="next-test" type="date" className="field-input" min={todayIso()} value={nextTest} onChange={(e) => setNextTest(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={remind}>{reminded ? "Added ✓ — download again" : "Add to calendar"}</Button>
        </div>
        {!nextTest ? <p className="mt-2 text-xs text-ink-muted">No date chosen: the reminder is set for 6 days from now.</p> : null}
      </section>

      <section className="card border-brand/30 bg-brand-tint/30 p-5 sm:p-6" aria-labelledby="save-title">
        <h2 id="save-title" className="font-sans text-lg font-semibold">Track your progress across tests</h2>
        <p className="mt-2 text-[0.9375rem] text-ink-soft">
          Save this report on your phone. Each time your teacher sends a new one, save it too — you'll see each topic improve over time.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {saved === "saved" || saved === "already_saved" ? (
            <p role="status" className="font-medium text-good" data-testid="report-saved">
              ✓ Saved on this device{savedCount > 1 ? ` · ${savedCount} reports` : ""}
            </p>
          ) : (
            <Button onClick={onSave}>Save to my progress</Button>
          )}
          <Link href="/me" className="font-medium text-brand underline underline-offset-4">My progress →</Link>
        </div>
        {saved === "unavailable" ? <p role="alert" className="field-error">This browser isn't allowing saving (for example private mode).</p> : null}
        {saved === "full" ? <p role="alert" className="field-error">You've saved the maximum number of reports. Delete old ones in My progress.</p> : null}
        <div className="mt-5 border-t border-brand/20 pt-4">
          <p className="mb-2 text-sm text-ink-muted">Open it like an app next time:</p>
          <InstallControl />
        </div>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="useful-title" data-testid="report-useful">
        <h2 id="useful-title" className="font-sans text-lg font-semibold">Was this report useful?</h2>
        {rated ? (
          <p role="status" className="mt-2 text-ink-soft">{thanks === "no" ? "Thanks for telling us — we'll keep improving it." : "Thanks — your teacher's institute sees only the total count, never who answered."}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => rate(true)}>Yes, it helped</Button>
            <Button variant="ghost" onClick={() => rate(false)}>Not really</Button>
          </div>
        )}
      </section>

      <p className="text-xs text-ink-muted">
        This report is stored inside the link and on your device only — not on Heramb's servers. Heramb counts opens, saves and the useful/not-useful taps as totals for the
        sender's institute — never your marks or name. “Shared by” shows the name the
        sender typed; Heramb doesn't verify it. Thresholds: secure ≥ 75%, developing 50–74%, gap &lt; 50%. One test is a small
        sample — talk to your teacher about it.
      </p>
    </div>
  );
}
