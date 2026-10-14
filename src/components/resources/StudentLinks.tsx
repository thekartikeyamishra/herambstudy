"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/client/analytics";
import { todayIso } from "@/lib/client/workspace";
import { siteConfig } from "@/config/site";
import type { ClassAnalysis, Dataset } from "@/lib/tools/classAnalysis";
import { buildReports, linksAsCsv, linksAsMessageList, reportUrl } from "@/lib/tools/studentReport";
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

  useEffect(() => {
    // Prefer the configured production URL so links never point at a preview or local address.
    setOrigin(siteConfig.url.startsWith("https://") ? siteConfig.url : window.location.origin);
    try {
      setInstitute(isSample ? "Fictional Classes" : window.localStorage.getItem(SENDER_KEY) ?? "");
    } catch {
      /* storage unavailable */
    }
  }, [isSample]);

  const valid = institute.trim().length > 0 && test.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const reports = useMemo(
    () => (valid ? buildReports(data, analysis, { institute, test, date }) : []),
    [valid, data, analysis, institute, test, date],
  );

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

      {!valid ? (
        <p className="mt-4 text-sm text-ink-muted">Fill in all three fields to create the links.</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => copy(linksAsMessageList(origin, reports, test), "all")}>
              {copied === "all" ? "Copied ✓" : `Copy all ${reports.length} links`}
            </Button>
            <Button variant="secondary" onClick={() => { remember(); downloadText("heramb-student-report-links.csv", linksAsCsv(origin, reports)); }}>
              Download links (CSV)
            </Button>
          </div>
          {copied === "failed" ? <p role="alert" className="field-error">Copying isn't allowed in this browser — use the CSV download instead.</p> : null}
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
