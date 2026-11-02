"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FictionalDataLabel } from "@/components/ui/Primitives";
import { downloadText } from "@/components/resources/ToolShell";
import { recordUsage } from "@/lib/client/usage";
import { markDone } from "@/lib/client/onceStore";
import { emptyDoubts, loadDoubts, parseDoubtStore, saveDoubts, type DoubtStore } from "@/lib/client/doubtStore";
import { loadStore } from "@/lib/client/testStore";
import { doubtsCsv, heatmap, MAX_DOUBTS, retestHref, topChapters, type Doubt } from "@/lib/tools/doubts";
import { newId } from "@/lib/tests/question";
import { cn } from "@/lib/cn";

const SAMPLE_BATCH = "Sample batch (fictional)";

/** One-tap doubt log + chapter heatmap. Everything stays in this browser. */
export function DoubtLog() {
  const [store, setStore] = useState<DoubtStore>(emptyDoubts());
  const [status, setStatus] = useState<"loading" | "ok" | "unavailable" | "damaged">("loading");
  const [bankChapters, setBankChapters] = useState<string[]>([]);
  const [batch, setBatch] = useState("");
  const [chapter, setChapter] = useState("");
  const [note, setNote] = useState("");
  const [view, setView] = useState("*");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    const r = loadDoubts();
    setStore(r.store);
    setStatus(r.status);
    setBatch(r.store.lastBatch);
    setBankChapters([...new Set(loadStore().store.questions.map((q) => q.chapter))].sort());
  }, []);

  function commit(next: DoubtStore, ok?: string) {
    const err = saveDoubts(next);
    setStore(next);
    setMsg(err ? { kind: "error", text: err } : ok ? { kind: "ok", text: ok } : null);
  }

  function log(ch: string, n = "") {
    const c = ch.trim().slice(0, 80);
    if (!c) return setMsg({ kind: "error", text: "Write the chapter first." });
    const b = batch.trim().slice(0, 40);
    const d: Doubt = { id: newId(), at: new Date().toISOString(), batch: b, chapter: c, note: n.trim().slice(0, 200) };
    commit({ v: 1, doubts: [...store.doubts, d].slice(-MAX_DOUBTS), lastBatch: b }, `Logged: ${c}${b ? ` · ${b}` : ""}.`);
    if (b !== SAMPLE_BATCH && markDone("heramb.doubts-day.v1", new Date().toISOString().slice(0, 10))) recordUsage("doubts_logged");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    log(chapter, note);
    setNote("");
  }

  function sample() {
    const now = Date.now();
    const DAY = 86_400_000;
    const plan: Array<[string, number[]]> = [
      ["Optics", [1, 2, 2, 4, 5, 6]],
      ["Waves", [3, 2, 2, 1, 1, 0]],
      ["Thermodynamics", [0, 1, 1, 2, 2, 3]],
      ["Kinematics", [1, 0, 1, 0, 1, 0]],
    ];
    const out: Doubt[] = [];
    plan.forEach(([ch, weeks]) => weeks.forEach((count, w) => {
      for (let k = 0; k < count; k++) out.push({ id: newId(), at: new Date(now - (5 - w) * 7 * DAY - k * 3_600_000).toISOString(), batch: SAMPLE_BATCH, chapter: ch, note: "" });
    }));
    commit({ ...store, doubts: [...store.doubts, ...out].slice(-MAX_DOUBTS) }, "Loaded six weeks of fictional doubts so you can see the heatmap.");
    setView(SAMPLE_BATCH);
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || file.size > 5_000_000) return;
    try {
      const r = parseDoubtStore(JSON.parse(await file.text()));
      const seen = new Set(store.doubts.map((d) => d.id));
      const add = r.store.doubts.filter((d) => !seen.has(d.id));
      commit({ ...store, doubts: [...store.doubts, ...add].sort((a, b) => a.at.localeCompare(b.at)).slice(-MAX_DOUBTS) }, `Imported ${add.length} doubts.`);
    } catch {
      setMsg({ kind: "error", text: "That file isn't a Heramb doubt-log backup." });
    }
  }

  const batches = useMemo(() => [...new Set(store.doubts.map((d) => d.batch).filter(Boolean))].sort(), [store.doubts]);
  const recent = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of [...store.doubts].reverse()) if (!seen.has(d.chapter.toLowerCase())) seen.set(d.chapter.toLowerCase(), d.chapter);
    return [...seen.values()].slice(0, 8);
  }, [store.doubts]);
  const map = useMemo(() => heatmap(store.doubts, { weeks: 6, batch: view }), [store.doubts, view]);
  const top = useMemo(() => topChapters(store.doubts, { days: 14, limit: 5, batch: view }), [store.doubts, view]);
  const chapterOptions = useMemo(() => [...new Set([...recent, ...bankChapters])], [recent, bankChapters]);

  if (status === "loading") return <div className="min-h-[40vh]" aria-busy="true" />;

  return (
    <div className="space-y-8" data-testid="doubt-log">
      {status === "unavailable" ? <p role="alert" className="field-error">This browser isn't allowing saving (private mode?). Doubts will be lost when the tab closes.</p> : null}
      {status === "damaged" ? <p role="status" className="text-sm text-warn">Some saved doubts were damaged and were skipped; everything else loaded.</p> : null}

      <section aria-labelledby="log-title" className="card p-5">
        <h2 id="log-title" className="font-sans text-lg font-semibold">Log a doubt</h2>
        <p className="mt-1 text-sm text-ink-soft">When a student asks a doubt in class, tap its chapter. A note is optional. Keep this page open on your phone during class.</p>
        {recent.length ? (
          <div className="mt-3">
            <p className="field-label">One tap: same chapter again</p>
            <div className="flex flex-wrap gap-2" data-testid="quick-chapters">
              {recent.map((c) => (
                <button key={c} type="button" onClick={() => log(c)} className="min-h-11 rounded-full border border-brand/50 bg-brand-tint/40 px-4 text-sm font-medium">+1 {c}</button>
              ))}
            </div>
          </div>
        ) : null}
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_1fr_auto] sm:items-end">
          <div><label htmlFor="d-batch" className="field-label">Batch</label><input id="d-batch" className="field-input" maxLength={40} value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="11 JEE A" list="d-batches" /></div>
          <datalist id="d-batches">{batches.map((b) => <option key={b} value={b} />)}</datalist>
          <div><label htmlFor="d-chapter" className="field-label">Chapter</label><input id="d-chapter" className="field-input" maxLength={80} value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Optics" list="d-chapters" /></div>
          <datalist id="d-chapters">{chapterOptions.map((c) => <option key={c} value={c} />)}</datalist>
          <div><label htmlFor="d-note" className="field-label">Note (optional)</label><input id="d-note" className="field-input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="lens sign convention" /></div>
          <Button type="submit">Log doubt</Button>
        </form>
        {msg ? <p role={msg.kind === "error" ? "alert" : "status"} className={cn("mt-3 text-sm", msg.kind === "error" ? "text-gap" : "text-good")}>{msg.text}</p> : null}
        {!store.doubts.length ? <Button variant="ghost" className="mt-3" onClick={sample}>See an example with fictional data</Button> : null}
      </section>

      {store.doubts.length ? (
        <section aria-labelledby="map-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="map-title" className="font-sans text-lg font-semibold">Where students are getting stuck</h2>
              <p className="mt-1 text-sm text-ink-soft">Doubts per chapter, week by week. Rising rows are chapters to revise before the next test.</p>
            </div>
            {batches.length ? (
              <div>
                <label htmlFor="d-view" className="field-label">Batch</label>
                <select id="d-view" className="field-input" value={view} onChange={(e) => setView(e.target.value)}>
                  <option value="*">All batches</option>
                  {batches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            ) : null}
          </div>
          {view === SAMPLE_BATCH ? <FictionalDataLabel className="mt-2" /> : null}
          {map.rows.length ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm" data-testid="doubt-heatmap">
                <thead className="bg-paper-raised text-xs text-ink-muted">
                  <tr><th className="px-3 py-2">Chapter</th>{map.weeks.map((w) => <th key={w.label} className="px-2 py-2 text-center">wk of {w.label}</th>)}<th className="px-3 py-2">Total</th><th className="px-3 py-2">Trend</th></tr>
                </thead>
                <tbody>
                  {map.rows.map((r) => (
                    <tr key={r.chapter} className="border-t border-line">
                      <td className="px-3 py-1.5 font-medium">{r.chapter}</td>
                      {r.counts.map((c, i) => (
                        <td key={i} className="px-1 py-1 text-center">
                          <span className="tabular inline-flex h-8 w-10 items-center justify-center rounded-md text-xs"
                            style={{ background: c ? `rgb(180 35 64 / ${0.1 + 0.6 * (c / map.max)})` : "transparent", color: c / map.max > 0.6 ? "#fff" : undefined }}>
                            {c || ""}
                          </span>
                        </td>
                      ))}
                      <td className="tabular px-3 py-1.5">{r.total}</td>
                      <td className={cn("px-3 py-1.5 text-xs font-medium", r.trend === "rising" ? "text-gap" : r.trend === "falling" ? "text-good" : "text-ink-muted")}>
                        {r.trend === "rising" ? "▲ rising" : r.trend === "falling" ? "▼ easing" : "steady"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="mt-3 text-sm text-ink-muted">No doubts in the last six weeks for this batch.</p>}

          {top.length ? (
            <div className="mt-5 rounded-xl border border-brand/30 bg-brand-tint/30 p-4" data-testid="doubt-top">
              <p className="font-semibold text-ink">Most doubts in the last 14 days</p>
              <p className="mt-1 text-sm text-ink-soft">{top.map((t) => `${t.chapter} (${t.count})`).join(" · ")}</p>
              <Link href={retestHref(top.map((t) => t.chapter))} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-medium text-white">
                Make a short test on these chapters →
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="d-data" className="text-sm">
        <h2 id="d-data" className="font-sans text-base font-semibold">Your data</h2>
        <p className="mt-1 text-ink-muted">{store.doubts.length} doubts saved in this browser only. Nothing is sent to Heramb.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!store.doubts.length} onClick={() => downloadText(`heramb-doubts-${new Date().toISOString().slice(0, 10)}.csv`, doubtsCsv(store.doubts), "text/csv")}>Download CSV</Button>
          <Button variant="secondary" disabled={!store.doubts.length} onClick={() => downloadText(`heramb-doubts-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ v: 1, doubts: store.doubts, lastBatch: store.lastBatch }), "application/json")}>Export backup</Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong bg-paper-raised px-5 text-[0.9375rem] font-medium text-ink hover:bg-paper-sunk has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
            Import backup<input type="file" accept=".json,application/json" className="sr-only" onChange={onImport} />
          </label>
          {store.doubts.some((d) => d.batch === SAMPLE_BATCH) ? (
            <Button variant="ghost" onClick={() => { commit({ ...store, doubts: store.doubts.filter((d) => d.batch !== SAMPLE_BATCH) }, "Removed the fictional example."); setView("*"); }}>Remove the example</Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
