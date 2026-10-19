"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConnectedInstitute } from "@/components/founding/InstituteBar";
import { recordUsage } from "@/lib/client/usage";
import { markDone } from "@/lib/client/onceStore";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/client/analytics";
import { todayIso } from "@/lib/client/workspace";
import type { ClassAnalysis, Dataset } from "@/lib/tools/classAnalysis";
import { isRealIsoDate } from "@/lib/dates";
import { buildReports, decodeReport, encodeReport, reportId, isSafeReportText, linksAsCsv, linksAsMessageList, reportUrl, type StudentReport } from "@/lib/tools/studentReport";
import { downloadText } from "./ToolShell";

const SENDER_KEY = "heramb.sender-name.v1";

/** Generates a personal report link for every student, ready to send on WhatsApp. */
export function StudentLinks({ data, analysis, isSample }: { data: Dataset; analysis: ClassAnalysis; isSample: boolean }) {
  const [open, setOpen] = useState(false);
  const [institute, setInstitute] = useState("");
  const [test, setTest] = useState(isSample ? "Unit test (fictional)" : "");
  const [date, setDate] = useState(todayIso());
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const connected = useConnectedInstitute();
  const createdLogged = useRef(false);
  const code = isSample ? null : connected?.code ?? null;

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      setInstitute(isSample ? "Fictional Classes" : window.localStorage.getItem(SENDER_KEY) || connected?.name || "");
    } catch {
      setInstitute(isSample ? "Fictional Classes" : connected?.name ?? "");
    }
  }, [isSample, connected?.name]);

  const textProblem = !isSafeReportText(institute) || !isSafeReportText(test);
  const valid = institute.trim().length > 0 && test.trim().length > 0 && isRealIsoDate(date) && !textProblem;
  const built = useMemo(
    () => (valid ? buildReports(data, analysis, { institute, test, date, code }) : []),
    [valid, data, analysis, institute, test, date, code],
  );
  // Every link must open correctly: each one is decoded exactly as the report page will,
  // and anything that wouldn't open is held back and explained.
  const reports = useMemo(() => built.filter((r) => decodeReport(encodeReport(r)) !== null), [built]);
  const rejected = built.length - reports.length;

  /**
   * Counts only (never names or marks), never for the fictional class, and each student's
   * link counts once per device however many times it is copied or downloaded.
   */
  function logShared(which: StudentReport[]) {
    if (isSample || !which.length) return;
    if (!createdLogged.current) {
      createdLogged.current = true;
      const fresh = reports.filter((r) => markDone("heramb.links-created.v1", reportId(r))).length;
      if (fresh) recordUsage("links_created", { n: fresh });
    }
    const fresh = which.filter((r) => markDone("heramb.links-shared.v1", reportId(r))).length;
    if (fresh) recordUsage("links_shared", { n: fresh });
  }

  function remember() {
    try {
      if (!isSample) window.localStorage.setItem(SENDER_KEY, institute.trim().slice(0, 80));
    } catch {
      /* ignore */
    }
  }

  async function copy(textToCopy: string, label: string) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(label);
      remember();
      logShared(label === "all" ? reports : reports.filter((r) => r.s === label));
      track("student_links_shared", { outcome: label === "all" ? "copy_all" : "copy_one" });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("failed");
    }
  }

  if (!open) {
    return (
      <div className="mt-6 rounded-xl border border-good/30 bg-good-tint/50 p-5">
        <p className="font-semibold text-ink">Send every student their own report</p>
        <p className="mt-1 text-[0.9375rem] text-ink-soft">
          One personal link per student — their topic results, focus topics and next steps, with your institute's name on it.
          Students can save each report and watch their own progress across tests.
        </p>
        <Button variant="secondary" className="mt-3" onClick={() => setOpen(true)}>Create student report links</Button>
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-good/30 p-5" aria-labelledby="links-title" data-testid="student-links">
      <h3 id="links-title" className="font-sans text-xl font-semibold">Student report links</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="links-institute" className="field-label">Your institute / school name</label>
          <input id="links-institute" className="field-input" maxLength={80} value={institute} onChange={(e) => setInstitute(e.target.value)} />
        </div>
        <div>
          <label htmlFor="links-test" className="field-label">Test name</label>
          <input id="links-test" className="field-input" maxLength={80} placeholder="e.g. Unit test 3" value={test} onChange={(e) => setTest(e.target.value)} />
        </div>
        <div>
          <label htmlFor="links-date" className="field-label">Test date</label>
          <input id="links-date" type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {textProblem ? (
        <p role="alert" className="field-error">Please remove web addresses from the institute and test names — report links can't contain links.</p>
      ) : null}
      {!valid ? (
        <p className="mt-4 text-sm text-ink-muted">Fill in all three fields to create the links.</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => copy(linksAsMessageList(origin, reports, test), "all")}>
              {copied === "all" ? "Copied ✓" : `Copy all ${reports.length} links`}
            </Button>
            <Button variant="secondary" onClick={() => { remember(); logShared(reports); downloadText("heramb-student-report-links.csv", linksAsCsv(origin, reports)); }}>
              Download links (CSV)
            </Button>
          </div>
          {copied === "failed" ? <p role="alert" className="field-error">Copying isn't allowed in this browser — use the CSV download instead.</p> : null}
          {rejected ? (
            <p role="alert" className="field-error" data-testid="links-rejected">
              {rejected} student{rejected === 1 ? "" : "s"} left out: a roll number or topic name contains a web address or hidden characters. Edit the sheet and analyse again.
            </p>
          ) : null}
          <ul className="mt-4 max-h-80 divide-y divide-line overflow-auto rounded-xl border border-line">
            {reports.map((r) => {
              const url = reportUrl(origin, r);
              return (
                <li key={r.s} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span className="font-medium text-ink">{r.s}</span>
                  <span className="flex items-center gap-3">
                    <a href={url} target="_blank" rel="noopener" className="text-brand underline underline-offset-4">Preview<span className="sr-only"> report for {r.s} (opens in a new tab)</span></a>
                    <button type="button" className="font-medium text-ink-soft underline underline-offset-4 hover:text-ink" onClick={() => copy(url, r.s)}>
                      {copied === r.s ? "Copied ✓" : "Copy link"}
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 space-y-1 text-sm text-ink-muted">
            <p><strong className="text-ink-soft">Privacy:</strong> each report is stored inside its link, not on Heramb's servers. Anyone with a link can open it, so send each link only to that student or their parent.</p>
            <p>Tip: send links in each student's personal chat, not the class group.</p>
          </div>
        </>
      )}
    </section>
  );
}
