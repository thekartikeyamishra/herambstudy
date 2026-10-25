"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { qrPath } from "@/lib/client/qr";
import { REPORT_LANGS, reportText, formatReportDate, type ReportLang } from "@/lib/i18n/report";
import { parsePhoneList, phoneFor } from "@/lib/tools/phoneList";
import { focusTopics } from "@/lib/tools/studentReport";
import { whatsappLink } from "@/lib/institute/share";
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
const LANG_KEY = "heramb.report-lang.v1";
const PHONES_KEY = "heramb.student-phones.v1";

const load = (k: string) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const save = (k: string, v: string | null) => {
  try {
    if (v === null) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, v);
  } catch {
    /* storage unavailable */
  }
};

/** Generates a personal report link for every student, ready to send on WhatsApp. */
export function StudentLinks({ data, analysis, isSample }: { data: Dataset; analysis: ClassAnalysis; isSample: boolean }) {
  const [open, setOpen] = useState(false);
  const [institute, setInstitute] = useState("");
  const [test, setTest] = useState(isSample ? "Unit test (fictional)" : "");
  const [date, setDate] = useState(todayIso());
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [lang, setLang] = useState<ReportLang>("en");
  const [phonesText, setPhonesText] = useState("");
  const [showPhones, setShowPhones] = useState(false);
  const [printing, setPrinting] = useState(false);
  const connected = useConnectedInstitute();
  const createdLogged = useRef(false);
  const code = isSample ? null : connected?.code ?? null;

  useEffect(() => {
    if (load(LANG_KEY) === "hi") setLang("hi");
    if (!isSample) setPhonesText(load(PHONES_KEY) ?? "");
  }, [isSample]);

  useEffect(() => {
    const clear = () => {
      document.body.classList.remove("print-slips");
      setPrinting(false);
    };
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

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
    () => (valid ? buildReports(data, analysis, { institute, test, date, code, lang }) : []),
    [valid, data, analysis, institute, test, date, code, lang],
  );
  // Every link must open correctly: each one is decoded exactly as the report page will,
  // and anything that wouldn't open is held back and explained.
  const reports = useMemo(() => built.filter((r) => decodeReport(encodeReport(r)) !== null), [built]);
  const rejected = built.length - reports.length;
  const phones = useMemo(() => parsePhoneList(phonesText), [phonesText]);
  const tx = reportText(lang);

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

  function sendOne(r: StudentReport) {
    remember();
    logShared([r]);
    track("student_links_shared", { outcome: "whatsapp_one" });
    window.open(whatsappLink(tx.message(r.s, test, institute.trim(), reportUrl(origin, r)), phoneFor(phones.phones, r.s)), "_blank", "noopener");
  }

  function printSlips() {
    remember();
    logShared(reports);
    track("student_links_shared", { outcome: "print_slips" });
    setPrinting(true);
    document.body.classList.add("print-slips");
    // Let the slips render before the print dialog opens.
    setTimeout(() => window.print(), 300);
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
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="links-lang" className="field-label">Report language</label>
              <select id="links-lang" className="field-input" value={lang} onChange={(e) => { const l = e.target.value as ReportLang; setLang(l); save(LANG_KEY, l); }}>
                {REPORT_LANGS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <button type="button" className="min-h-11 text-sm font-medium text-brand underline underline-offset-4" onClick={() => setShowPhones((x) => !x)} aria-expanded={showPhones}>
              {phones.phones.size ? `WhatsApp numbers: ${phones.phones.size} saved` : "Add WhatsApp numbers (optional)"}
            </button>
          </div>
          {showPhones ? (
            <div className="mt-3 rounded-xl border border-line p-4">
              <label htmlFor="links-phones" className="field-label">Roll number and WhatsApp number, one per line</label>
              <textarea id="links-phones" rows={5} className="field-input font-mono text-sm" spellCheck={false} value={phonesText}
                placeholder={"R01 9876543210\nR02 9876543211"} aria-describedby="links-phones-hint"
                onChange={(e) => { setPhonesText(e.target.value); save(PHONES_KEY, e.target.value.trim() ? e.target.value.slice(0, 60_000) : null); }} />
              <p id="links-phones-hint" className="field-hint">
                Paste from your register or sheet (a parent's number works too). Kept only on this device — never in the report link and never sent to Heramb. Each student's WhatsApp button then opens their chat directly.
              </p>
              {phones.bad.length ? <p className="field-error">Couldn't read: {phones.bad.join(" · ")}</p> : null}
              {phonesText ? <button type="button" className="mt-2 text-sm underline underline-offset-4" onClick={() => { setPhonesText(""); save(PHONES_KEY, null); }}>Clear numbers from this device</button> : null}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => copy(linksAsMessageList(origin, reports, test, lang), "all")}>
              {copied === "all" ? "Copied ✓" : `Copy all ${reports.length} links`}
            </Button>
            <Button variant="secondary" onClick={() => { remember(); logShared(reports); downloadText("heramb-student-report-links.csv", linksAsCsv(origin, reports)); }}>
              Download links (CSV)
            </Button>
            <Button variant="secondary" onClick={printSlips} disabled={printing}>Print report slips (QR)</Button>
          </div>
          <p className="mt-2 text-sm text-ink-muted">Big batch? Print slips — 8 per A4 page, each with the student's focus topics and a QR code to their full report. Hand them out in class.</p>
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
                  <span className="flex flex-wrap items-center gap-3">
                    <button type="button" className="inline-flex min-h-9 items-center rounded-full bg-good px-3 text-xs font-semibold text-white hover:opacity-90" onClick={() => sendOne(r)}
                      aria-label={`Send ${r.s}'s report on WhatsApp${phoneFor(phones.phones, r.s) ? "" : " (choose the chat)"}`}>
                      WhatsApp{phoneFor(phones.phones, r.s) ? "" : " →"}
                    </button>
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
            <p>Tip: send links in each student's personal chat, not the class group. Without a saved number, WhatsApp asks which chat to send to.</p>
            <p>Sending to many numbers that haven't saved yours can get a WhatsApp number restricted. Use the institute's usual number, send in batches of about 30 with short breaks, and use printed QR slips for the rest.</p>
          </div>
          {printing && typeof document !== "undefined"
            ? createPortal(<ReportSlips reports={reports} origin={origin} lang={lang} />, document.body)
            : null}
        </>
      )}
    </section>
  );
}

/** Printable slips: 8 per A4 page, each with the student's summary and a QR code to the full report. */
function ReportSlips({ reports, origin, lang }: { reports: StudentReport[]; origin: string; lang: ReportLang }) {
  const tx = reportText(lang);
  return (
    <div className="report-slips" aria-hidden="true">
      {reports.map((r) => {
        const url = reportUrl(origin, r);
        const qr = qrPath(url);
        const present = r.p.filter((p): p is number => typeof p === "number");
        const avg = present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : null;
        const focus = focusTopics(r);
        return (
          <section key={r.s} className="report-slip">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#586076", margin: 0 }}>{tx.sharedBy(r.i)}</p>
              <p style={{ fontSize: 15, fontWeight: 700, margin: "2px 0" }}>{r.s}</p>
              <p style={{ fontSize: 10, margin: 0, color: "#3A4256" }}>{r.t} · {formatReportDate(r.d, lang)}</p>
              <p style={{ fontSize: 11, margin: "6px 0 0" }}>{tx.slipAverage}: <strong>{avg === null ? "—" : `${avg}%`}</strong></p>
              <p style={{ fontSize: 11, margin: "2px 0 0" }}>{tx.slipFocus}: <strong>{focus.length ? focus.join(", ") : tx.slipNoGap}</strong></p>
            </div>
            <div style={{ width: 150, flexShrink: 0, textAlign: "center" }}>
              {qr ? (
                <svg viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`} width="150" height="150" shapeRendering="crispEdges" role="img" aria-label="QR code">
                  <rect x="-2" y="-2" width={qr.size + 4} height={qr.size + 4} fill="#fff" />
                  <path d={qr.d} fill="#000" />
                </svg>
              ) : (
                <p style={{ fontSize: 9 }}>{tx.slipNoQr}</p>
              )}
              <p style={{ fontSize: 8, margin: "2px 0 0", color: "#586076" }}>{tx.slipScan}</p>
            </div>
          </section>
        );
      })}
    </div>
  );
}
