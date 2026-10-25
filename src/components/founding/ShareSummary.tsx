"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/forms/Field";
import { useConnectedInstitute } from "@/components/founding/InstituteBar";
import { requestJson } from "@/lib/client/postJson";
import { todayIso } from "@/lib/client/workspace";
import { summariseClass } from "@/lib/institute/summary";
import type { ClassAnalysis } from "@/lib/tools/classAnalysis";
import { isSafeReportText } from "@/lib/tools/studentReport";

const BATCH_KEY = "heramb.share-batch.v1";
const AUTO_KEY = "heramb.share-auto.v1";

/**
 * Lets a connected teacher share THIS class's chapter averages with the institute head
 * (opt-in, one tap). Aggregates only — no names, roll numbers or individual marks.
 */
export function ShareSummary({ analysis, isSample }: { analysis: ClassAnalysis; isSample: boolean }) {
  const inst = useConnectedInstitute();
  const [batch, setBatch] = useState("");
  const [test, setTest] = useState("");
  const [date, setDate] = useState(todayIso());
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [auto, setAuto] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const autoDone = useRef(false);

  useEffect(() => {
    try {
      setBatch(localStorage.getItem(BATCH_KEY) ?? "");
      setAuto(localStorage.getItem(AUTO_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  // Batch names already shared by this institute, so "11A" and "11 JEE A" don't split history.
  useEffect(() => {
    if (!inst || isSample) return;
    let live = true;
    void requestJson<{ ok: true; summaries?: Array<{ batch: string }> }>("/api/institutes/stats", { body: { code: inst.code } }).then((r) => {
      if (live && r.kind === "success") setKnown([...new Set((r.data.summaries ?? []).map((x) => x.batch))].slice(0, 30));
    });
    return () => {
      live = false;
    };
  }, [inst, isSample]);

  const valid = Boolean(batch.trim() && test.trim() && isSafeReportText(batch) && isSafeReportText(test) && /^\d{4}-\d{2}-\d{2}$/.test(date));

  // Auto-share (opt-in per device): once per analysis, with the remembered batch.
  useEffect(() => {
    if (!auto || autoDone.current || !inst || isSample || !batch.trim()) return;
    autoDone.current = true;
    const name = test.trim() || `Test ${date.split("-").reverse().join("-")}`;
    if (!test.trim()) setTest(name);
    void share(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, inst, isSample, batch]);

  if (!inst || isSample) return null;

  function toggleAuto(on: boolean) {
    setAuto(on);
    try {
      localStorage.setItem(AUTO_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  async function share(testName = test) {
    if (!inst) return;
    if (!(batch.trim() && testName.trim() && isSafeReportText(batch) && isSafeReportText(testName))) return;
    setState("working");
    const summary = summariseClass(analysis, { batch, test: testName, date });
    const r = await requestJson<{ ok: true; message: string }>("/api/institutes/summaries", { body: { code: inst.code, summary } });
    if (r.kind === "success") {
      setState("done");
      setMessage(r.data.message);
      try {
        localStorage.setItem(BATCH_KEY, batch.trim().slice(0, 60));
      } catch {
        /* ignore */
      }
    } else {
      setState("error");
      setMessage(r.message);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-brand/30 bg-brand-tint/30 p-5" aria-labelledby="share-head-title" data-testid="share-summary">
      <h3 id="share-head-title" className="font-sans text-lg font-semibold">Share batch results with {inst.name}</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Your head sees each batch's chapter averages and weakest chapters on the institute dashboard. Only class-level numbers are
        shared — never student names, roll numbers or individual marks.
      </p>
      {state === "done" ? (
        <p role="status" className="mt-3 font-medium text-good">✓ {message}</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="share-batch" className="field-label">Batch</label>
              <input id="share-batch" className="field-input" maxLength={60} placeholder="e.g. 11 JEE A" list="share-batch-known" value={batch} onChange={(e) => setBatch(e.target.value)} />
              <datalist id="share-batch-known">{known.map((b) => <option key={b} value={b} />)}</datalist>
              {known.length ? <p className="field-hint">Pick an existing batch name so its history stays together.</p> : null}
            </div>
            <div>
              <label htmlFor="share-test" className="field-label">Test name</label>
              <input id="share-test" className="field-input" maxLength={80} placeholder="e.g. Weekly test 6" value={test} onChange={(e) => setTest(e.target.value)} />
            </div>
            <div>
              <label htmlFor="share-date" className="field-label">Test date</label>
              <input id="share-date" type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          {state === "error" ? <p role="alert" className="field-error">{message}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button onClick={() => void share()} disabled={!valid || state === "working"}>
              {state === "working" ? (<><Spinner /> Sharing…</>) : "Share with the head"}
            </Button>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" className="h-4 w-4" checked={auto} onChange={(e) => toggleAuto(e.target.checked)} />
              Share automatically after every real test on this device
            </label>
          </div>
        </>
      )}
    </section>
  );
}
