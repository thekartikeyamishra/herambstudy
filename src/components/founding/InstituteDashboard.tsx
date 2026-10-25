"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Spinner } from "@/components/forms/Field";
import { Badge } from "@/components/ui/Primitives";
import { getInstitute, setInstitute, setUsageOptOut, usageOptedOut } from "@/lib/client/institute";
import { requestJson } from "@/lib/client/postJson";
import { normaliseCode } from "@/lib/institute/code";
import { HELPED_WITH, MINUTES_SAVED } from "@/lib/institute/events";
import { HEALTH_LABEL, type InstituteMetrics } from "@/lib/institute/metrics";
import { teacherInviteMessage, whatsappLink } from "@/lib/institute/share";
import { batchViews, chapterKey, type CityBenchmark, type StoredSummary } from "@/lib/institute/summary";
import { batchHistoryCsv, FREE_TESTS_PER_BATCH } from "@/lib/institute/plan";
import { cn } from "@/lib/cn";

type Institute = { code: string; name: string; city: string; seat: number | null; seatLabel: string | null; cap: number; createdAt: string; weeklyDigest: boolean };
type Reply = { ok: true; institute: Institute; metrics: InstituteMetrics; summaries?: StoredSummary[]; benchmark?: CityBenchmark; plan?: { pro: boolean; until: string | null } };

const healthTone = { not_activated: "neutral", active: "good", at_risk: "warn", dormant: "gap" } as const;

export function InstituteDashboard() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<Reply | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");

  const load = useCallback(async (c: string) => {
    setState("loading");
    const r = await requestJson<Reply>("/api/institutes/stats", { body: { code: c } });
    if (r.kind === "success") {
      setData(r.data);
      setState("idle");
      if (window.location.hash.slice(1) !== r.data.institute.code) history.replaceState(null, "", `#${r.data.institute.code}`);
    } else {
      setData(null);
      setMessage(r.message);
      setState("error");
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    const fromHash = normaliseCode(decodeURIComponent(window.location.hash.slice(1)));
    const c = fromHash ?? getInstitute()?.code ?? null;
    if (c) void load(c);
  }, [load]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const c = normaliseCode(input);
    if (!c) {
      setState("error");
      setMessage("Institute codes look like HRB-7KQ4-M2XA.");
      return;
    }
    void load(c);
  }

  if (!data) {
    return (
      <div className="card max-w-xl p-6 sm:p-8">
        {state === "loading" ? (
          <p className="flex items-center gap-2 text-ink-muted" aria-busy="true"><Spinner /> Loading your institute…</p>
        ) : (
          <form onSubmit={submit} noValidate>
            <label htmlFor="dash-code" className="field-label">Institute code</label>
            <div className="flex flex-wrap gap-3">
              <input id="dash-code" className="field-input w-56 font-mono uppercase" placeholder="HRB-XXXX-XXXX" autoComplete="off" maxLength={20}
                value={input} onChange={(e) => setInput(e.target.value)} aria-invalid={state === "error"} aria-describedby={state === "error" ? "dash-code-error" : undefined} />
              <Button type="submit">Open dashboard</Button>
            </div>
            {state === "error" ? <p id="dash-code-error" role="alert" className="field-error">{message}</p> : null}
            <p className="mt-4 text-sm text-ink-muted">No code yet? <Link href="/founding" className="font-medium text-brand underline underline-offset-4">Register your institute</Link> — it's free.</p>
          </form>
        )}
      </div>
    );
  }

  const { institute: inst, metrics: m } = data;
  const connected = getInstitute()?.code === inst.code;
  const maxWeek = Math.max(1, ...m.weeks.map((w) => w.analyses));

  return (
    <div className="space-y-8" data-testid="institute-dashboard">
      <header className="card flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{inst.seatLabel ? `Founding institute ${inst.seatLabel}` : "Institute"}</p>
          <h2 className="mt-1 text-display-md">{inst.name}</h2>
          <p className="mt-1 text-sm text-ink-muted">{inst.city} · code <span className="font-mono font-semibold text-ink">{inst.code}</span></p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={healthTone[m.health]}>{HEALTH_LABEL[m.health]}</Badge>
          <p className="tabular text-sm text-ink-soft"><strong className="text-ink">{m.metCount} of 7</strong> programme goals</p>
        </div>
      </header>

      <section className="card border-brand/30 bg-brand-tint/30 p-5 sm:p-6" aria-labelledby="next-title">
        <h3 id="next-title" className="font-sans text-lg font-semibold">Next step</h3>
        <p className="mt-1 text-ink-soft">{m.nextStep}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href={`/resources/class-test-analyser#connect=${inst.code}`}>Analyse a test</LinkButton>
          <a href={whatsappLink(teacherInviteMessage(origin, inst))} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-paper-raised px-5 text-[0.9375rem] font-medium text-ink hover:bg-paper-sunk">
            Invite a teacher on WhatsApp<span className="sr-only"> (opens WhatsApp)</span>
          </a>
          {!connected ? (
            <Button variant="ghost" onClick={() => { setInstitute({ code: inst.code, name: inst.name, seatLabel: inst.seatLabel }); setData({ ...data }); }}>Connect this device</Button>
          ) : null}
        </div>
      </section>

      <BatchResults summaries={data.summaries ?? []} benchmark={data.benchmark ?? {}} city={inst.city} />

      <BatchHistory summaries={data.summaries ?? []} plan={data.plan ?? { pro: false, until: null }} name={inst.name} />

      <section aria-labelledby="goals-title">
        <h3 id="goals-title" className="font-sans text-lg font-semibold">Programme goals</h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="metrics">
          {m.metrics.map((x) => (
            <li key={x.key} className={cn("rounded-xl border p-4", x.met ? "border-good/30 bg-good-tint/40" : "border-line bg-paper-raised")}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-ink">{x.question}</p>
                <span aria-hidden="true" className={cn("mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", x.met ? "bg-good text-white" : x.pending ? "bg-paper-sunk text-ink-muted" : "bg-warn-tint text-warn")}>
                  {x.met ? "✓" : x.pending ? "…" : "!"}
                </span>
              </div>
              <p className="mt-2 font-semibold text-ink"><span className="sr-only">{x.met ? "Yes. " : x.pending ? "Not yet. " : "No. "}</span>{x.headline}</p>
              <p className="mt-1 text-xs text-ink-muted">{x.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="rhythm-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="rhythm-title" className="font-sans text-lg font-semibold">Weekly rhythm</h3>
          <p className="text-sm text-ink-soft">{m.weeklyStreak ? `${m.weeklyStreak} week${m.weeklyStreak === 1 ? "" : "s"} in a row` : "Start a streak: one test a week"}</p>
        </div>
        <ol className="mt-5 flex h-28 items-end gap-2" aria-label="Real tests analysed per week, last 8 weeks">
          {m.weeks.map((w) => (
            <li key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
              <span className="tabular text-xs text-ink-muted">{w.analyses || ""}</span>
              <span className={cn("w-full rounded-t-md", w.analyses ? "bg-brand" : "bg-paper-sunk")} style={{ height: `${Math.max(6, (w.analyses / maxWeek) * 80)}px` }} aria-hidden="true" />
              <span className="sr-only">Week of {w.weekStart}: {w.analyses} tests</span>
              <span className="text-[10px] text-ink-muted" aria-hidden="true">{w.weekStart.slice(8)}/{w.weekStart.slice(5, 7)}</span>
            </li>
          ))}
        </ol>
        <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-4">
          {[
            ["Tests analysed", m.totals.analysis_real],
            ["Links sent", m.totals.links_shared],
            ["Reports opened", m.totals.report_opened],
            ["Teachers · students", `${m.teacherDevices} · ${m.studentDevices}`],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="text-xs text-ink-muted">{k}</dt>
              <dd className="tabular mt-1 text-xl font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-muted">Teachers and students are counted by device. Counts only — no names or roll numbers are ever sent. Batch results appear only when a teacher shares a class summary.</p>
      </section>

      <ValueFeedback code={inst.code} onSaved={() => void load(inst.code)} />

      <UsageSettings />
    </div>
  );
}

function ValueFeedback({ code, onSaved }: { code: string; onSaved: () => void }) {
  const [minutes, setMinutes] = useState("");
  const [helped, setHelped] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const ref = useRef<HTMLParagraphElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!minutes || !helped.length) {
      setState("error");
      setMessage("Please choose the time saved and at least one thing it helped with.");
      return;
    }
    setState("saving");
    const r = await requestJson<{ ok: true; message: string }>("/api/institutes/feedback", { body: { code, minutes, helped, note } });
    if (r.kind === "success") {
      setState("done");
      setMessage(r.data.message);
      onSaved();
    } else {
      setState("error");
      setMessage(r.message);
    }
    requestAnimationFrame(() => ref.current?.focus());
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="value-title">
      <h3 id="value-title" className="font-sans text-lg font-semibold">What did Heramb help with?</h3>
      <p className="mt-1 text-sm text-ink-muted">Two taps, after any test. It decides what we build next.</p>
      {state === "done" ? (
        <p ref={ref} tabIndex={-1} role="status" className="mt-4 rounded-xl border border-good/30 bg-good-tint px-4 py-3 text-ink focus:outline-none">{message}</p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-5" noValidate>
          <fieldset>
            <legend className="field-label">Time saved per test (roughly)</legend>
            <div className="flex flex-wrap gap-2">
              {MINUTES_SAVED.map((o) => (
                <label key={o.value} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm", minutes === o.value ? "border-brand bg-brand-tint/60" : "border-line-strong")}>
                  <input type="radio" name="minutes" className="sr-only" checked={minutes === o.value} onChange={() => setMinutes(o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="field-label">It helped us…</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {HELPED_WITH.map((o) => {
                const on = helped.includes(o.value);
                return (
                  <label key={o.value} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 text-sm", on ? "border-brand bg-brand-tint/50" : "border-line-strong")}>
                    <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={on} onChange={(e) => setHelped((h) => (e.target.checked ? [...h, o.value] : h.filter((x) => x !== o.value)))} />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div>
            <label htmlFor="value-note" className="field-label">One line, in your words <span className="font-normal text-ink-muted">(optional)</span></label>
            <input id="value-note" className="field-input" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Parents finally saw chapter-wise progress" />
            <p className="field-hint">Please don't include student names or marks.</p>
          </div>
          {state === "error" ? <p ref={ref} tabIndex={-1} role="alert" className="field-error">{message}</p> : null}
          <Button type="submit" variant="secondary" disabled={state === "saving"}>{state === "saving" ? (<><Spinner /> Saving…</>) : "Send"}</Button>
        </form>
      )}
    </section>
  );
}

export function UsageSettings() {
  const [out, setOut] = useState(false);
  useEffect(() => setOut(usageOptedOut()), []);
  return (
    <section className="rounded-xl border border-line px-4 py-3 text-sm text-ink-soft" aria-label="Usage counts on this device">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--brand))]" checked={!out} onChange={(e) => { setUsageOptOut(!e.target.checked); setOut(!e.target.checked); }} />
        <span>
          <strong className="text-ink">Share anonymous usage counts from this device.</strong> Counts like "a test was analysed" help your institute's dashboard and our
          programme. Never marks, names or roll numbers. Turning this off changes nothing else.
        </span>
      </label>
    </section>
  );
}

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const change = (n: number | null) => (n === null || n === 0 ? null : <span className={cn("tabular text-xs font-semibold", n > 0 ? "text-good" : "text-gap")}>{n > 0 ? `▲ ${n}` : `▼ ${-n}`}</span>);

/** What the head actually cares about: each batch's latest test, weakest chapters and direction. */
function BatchResults({ summaries, benchmark, city }: { summaries: StoredSummary[]; benchmark: CityBenchmark; city: string }) {
  const views = batchViews(summaries);
  const hasBench = Object.keys(benchmark).length > 0;
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="batches-title" data-testid="batch-results">
      <h3 id="batches-title" className="font-sans text-lg font-semibold">Batch results</h3>
      {views.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">
          No batch results yet. After analysing a test, a teacher taps <strong>Share with the head</strong> — then each batch's chapter
          averages and weakest chapters appear here. Only class-level numbers, never student names.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {views.map((v) => (
            <li key={v.batch} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-ink">{v.batch}</p>
                <p className="text-xs text-ink-muted">{v.latest.test} · {fmtDate(v.latest.date)} · {v.tests} test{v.tests === 1 ? "" : "s"} shared</p>
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                Class average <strong className="tabular text-ink">{v.latest.average === null ? "—" : `${v.latest.average}%`}</strong> {change(v.averageChange)}
                <span className="text-ink-muted"> · {v.latest.students} students</span>
              </p>
              {v.weakest.length ? (
                <ol className="mt-3 space-y-1.5 text-sm">
                  {v.weakest.map((t) => (
                    <li key={t.n} className="flex items-center justify-between gap-2">
                      <span className="text-ink">{t.n}</span>
                      <span className="flex items-center gap-2">
                        <span className={cn("tabular font-semibold", t.avg < 50 ? "text-gap" : t.avg < 75 ? "text-warn" : "text-good")}>{t.avg}%</span>
                        {change(t.change)}
                        <span className="tabular text-xs text-ink-muted">{t.below}/{t.att} below 50%</span>
                        {benchmark[chapterKey(t.n)] ? (
                          <span className="tabular rounded-full bg-paper-sunk px-2 py-0.5 text-xs text-ink-soft" title={`Average of ${benchmark[chapterKey(t.n)]!.institutes} other institutes in ${city}`}>
                            {city}: {benchmark[chapterKey(t.n)]!.avg}%
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {views.length ? (
        <p className="mt-4 text-xs text-ink-muted" data-testid="benchmark-note">
          {hasBench
            ? `“${city}: X%” is the average of other founding institutes in ${city} for the same chapter (latest test, last 4 months). No institute is named.`
            : `A ${city} comparison appears per chapter once at least 5 founding institutes in ${city} share results for it — no institute is ever named.`}
        </p>
      ) : null}
    </section>
  );
}

/** Pro: every shared test per batch, plus a CSV export. Free: the latest few, and an honest note. */
function BatchHistory({ summaries, plan, name }: { summaries: StoredSummary[]; plan: { pro: boolean; until: string | null }; name: string }) {
  if (!summaries.length) return null;
  function exportCsv() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([batchHistoryCsv(summaries)], { type: "text/csv;charset=utf-8" }));
    a.download = `${name.replace(/[^\w]+/g, "-").toLowerCase()}-batch-history.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const rows = [...summaries].sort((a, b) => a.batch.localeCompare(b.batch) || b.date.localeCompare(a.date));
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="history-title" data-testid="batch-history">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="history-title" className="font-sans text-lg font-semibold">Batch history</h3>
        {plan.pro ? <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand">Pro{plan.until ? ` · until ${plan.until}` : ""}</span> : null}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="text-xs text-ink-muted"><th className="py-1 pr-3 font-medium">Batch</th><th className="py-1 pr-3 font-medium">Test</th><th className="py-1 pr-3 font-medium">Date</th><th className="py-1 font-medium">Class average</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line"><td className="py-1.5 pr-3">{r.batch}</td><td className="py-1.5 pr-3">{r.test}</td><td className="tabular py-1.5 pr-3">{r.date}</td><td className="tabular py-1.5">{r.average === null ? "—" : `${r.average}%`}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {plan.pro ? (
        <Button variant="secondary" className="mt-4" onClick={exportCsv}>Export batch history (CSV)</Button>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">
          The free plan shows each batch's latest {FREE_TESTS_PER_BATCH} shared tests. The <strong className="text-ink">Institute plan</strong> keeps the whole
          year for every batch, with a CSV export for reviews and parent meetings.{" "}
          <Link href="/pricing" className="font-medium text-brand underline underline-offset-4">See plans</Link>
        </p>
      )}
    </section>
  );
}
