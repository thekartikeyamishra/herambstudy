"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/forms/Field";
import { Badge } from "@/components/ui/Primitives";
import { requestJson } from "@/lib/client/postJson";
import { HEALTH_LABEL, type InstituteMetrics, type MetricKey } from "@/lib/institute/metrics";
import { nudgeMessage, whatsappLink, type NudgeKind } from "@/lib/institute/share";
import { cn } from "@/lib/cn";

type Row = {
  code: string; name: string; city: string; institutionType: string; seat: number | null; seatLabel: string | null; status: "active" | "paused" | "closed";
  createdAt: string; weeklyDigest: boolean; contactName: string; role: string; phone: string | null; email: string | null; source: string | null;
  notes: string | null; nextFollowUp: string | null; activatedAt: string | null; lastActiveAt: string | null; metrics: InstituteMetrics;
};
type ListReply = { ok: true; cap: number; today: string; totals: { institutes: number; foundingTaken: number; analysesReal: number; linksShared: number; reportsOpened: number; studentActions: number }; institutes: Row[] };

const METRIC_SHORT: Record<MetricKey, string> = { activation: "Activated", adoption: "Teacher returned", distribution: "Links shared", engagement: "Students engaged", repeat: "Repeat test", retention: "30-day retained", value: "Value reported" };
const healthTone = { not_activated: "neutral", active: "good", at_risk: "warn", dormant: "gap" } as const;
const FILTERS = ["all", "not_activated", "at_risk", "dormant", "follow_up"] as const;

export function suggestNudge(r: Row): NudgeKind {
  const m = r.metrics;
  if (m.health === "not_activated") return "not_activated";
  if (m.health === "dormant") return "dormant";
  if (m.health === "at_risk") return "at_risk";
  if (m.totals.links_shared === 0) return "no_links";
  if (!m.metrics.find((x) => x.key === "value")?.met) return "ask_value";
  return "thanks";
}

const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function OwnerDashboard() {
  const [phase, setPhase] = useState<"checking" | "login" | "ready" | "disabled">("checking");
  const [data, setData] = useState<ListReply | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    const r = await requestJson<ListReply>("/api/admin/institutes");
    if (r.kind === "success") {
      setData(r.data);
      setPhase("ready");
    } else if (r.status === 404) setPhase("disabled");
    else if (r.status === 401) setPhase("login");
    else {
      setError(r.message);
      setPhase("login");
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    void load();
  }, [load]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await requestJson<{ ok: true }>("/api/admin/session", { body: { password } });
    setBusy(false);
    if (r.kind === "success") {
      setPassword("");
      await load();
    } else if (r.status === 404) setPhase("disabled");
    else setError(r.message);
  }

  async function logout() {
    await requestJson("/api/admin/session", { method: "DELETE", body: {} });
    setData(null);
    setPhase("login");
  }

  const rows = useMemo(() => {
    if (!data) return [];
    return data.institutes.filter((r) => {
      if (filter === "all") return true;
      if (filter === "follow_up") return Boolean(r.nextFollowUp && r.nextFollowUp <= data.today);
      return r.metrics.health === filter;
    });
  }, [data, filter]);

  function exportCsv() {
    if (!data) return;
    const header = ["Seat", "Code", "Institute", "City", "Type", "Contact", "Role", "Phone", "Email", "Source", "Status", "Health", "Goals met", ...Object.values(METRIC_SHORT), "Tests analysed", "Links shared", "Reports opened", "Teacher devices", "Student devices", "Registered", "Activated", "Last active", "Next follow-up", "Notes"];
    const lines = data.institutes.map((r) => [
      r.seat ?? "", r.code, r.name, r.city, r.institutionType, r.contactName, r.role, r.phone ?? "", r.email ?? "", r.source ?? "", r.status, HEALTH_LABEL[r.metrics.health], r.metrics.metCount,
      ...r.metrics.metrics.map((m) => (m.met ? "Yes" : m.pending ? "Pending" : "No")),
      r.metrics.totals.analysis_real, r.metrics.totals.links_shared, r.metrics.totals.report_opened, r.metrics.teacherDevices, r.metrics.studentDevices,
      r.createdAt.slice(0, 10), r.activatedAt?.slice(0, 10) ?? "", r.lastActiveAt?.slice(0, 10) ?? "", r.nextFollowUp ?? "", r.notes ?? "",
    ].map(csvCell).join(","));
    const blob = new Blob(["﻿" + [header.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `heramb-founding-institutes-${data.today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (phase === "checking") return <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Checking access…</p>;
  if (phase === "disabled") {
    return (
      <div className="card max-w-xl p-6 text-ink-soft">
        <p className="font-semibold text-ink">The owner dashboard is switched off.</p>
        <p className="mt-2 text-sm">Set <code>OWNER_DASHBOARD_PASSWORD</code> (12+ characters) in the server environment and redeploy. Storage (Firestore) must be configured too.</p>
      </div>
    );
  }
  if (phase === "login" || !data) {
    return (
      <form onSubmit={login} className="card max-w-md space-y-4 p-6" noValidate>
        <div>
          <label htmlFor="owner-password" className="field-label">Owner password</label>
          <input id="owner-password" type="password" autoComplete="current-password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)} aria-describedby={error ? "owner-error" : undefined} />
          {error ? <p id="owner-error" role="alert" className="field-error">{error}</p> : null}
        </div>
        <Button type="submit" disabled={busy || !password}>{busy ? (<><Spinner /> Signing in…</>) : "Sign in"}</Button>
      </form>
    );
  }

  const activated = data.institutes.filter((r) => r.activatedAt).length;
  const metricCounts = (Object.keys(METRIC_SHORT) as MetricKey[]).map((k) => [k, data.institutes.filter((r) => r.metrics.metrics.find((m) => m.key === k)?.met).length] as const);

  return (
    <div className="space-y-8" data-testid="owner-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">Today: {data.today}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
          <Button variant="ghost" onClick={() => void load()}>Refresh</Button>
          <Button variant="ghost" onClick={logout}>Sign out</Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-4" aria-label="Programme totals">
        {[
          ["Founding seats", `${data.totals.foundingTaken} / ${data.cap}`],
          ["Activated institutes", `${activated} / ${data.institutes.length}`],
          ["Real tests analysed", data.totals.analysesReal],
          ["Reports opened", data.totals.reportsOpened],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-line bg-paper-raised p-4">
            <p className="text-xs text-ink-muted">{k}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-line p-4" aria-label="Institutes meeting each goal">
        <p className="text-sm font-semibold text-ink">Institutes meeting each goal</p>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-7">
          {metricCounts.map(([k, n]) => (
            <li key={k} className="rounded-lg bg-paper-sunk px-3 py-2"><span className="tabular block text-lg font-semibold">{n}</span><span className="text-xs text-ink-muted">{METRIC_SHORT[k]}</span></li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter institutes">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={cn("min-h-11 rounded-full border px-4 text-sm", filter === f ? "border-brand bg-brand-tint/60 font-medium" : "border-line-strong")}>
            {f === "all" ? "All" : f === "follow_up" ? "Follow-up due" : HEALTH_LABEL[f]}
          </button>
        ))}
      </div>

      {rows.length === 0 ? <p className="text-ink-muted">No institutes here yet.</p> : null}
      <ul className="space-y-4">
        {rows.map((r) => <InstituteRow key={r.code} row={r} origin={origin} today={data.today} onChanged={load} />)}
      </ul>
    </div>
  );
}

function InstituteRow({ row: r, origin, today, onChanged }: { row: Row; origin: string; today: string; onChanged: () => Promise<void> }) {
  const [notes, setNotes] = useState(r.notes ?? "");
  const [follow, setFollow] = useState(r.nextFollowUp ?? "");
  const [status, setStatus] = useState(r.status);
  const [kind, setKind] = useState<NudgeKind>(suggestNudge(r));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const due = r.nextFollowUp && r.nextFollowUp <= today;

  async function save() {
    setSaving(true);
    const res = await requestJson("/api/admin/institutes", { method: "PATCH", body: { code: r.code, notes: notes.trim() || null, nextFollowUp: follow || null, status } });
    setSaving(false);
    setMsg(res.kind === "success" ? "Saved" : res.message);
    if (res.kind === "success") void onChanged();
  }

  async function remove() {
    if (!window.confirm(`Delete ${r.name} and all its usage data? This can't be undone.`)) return;
    const res = await requestJson("/api/admin/institutes", { method: "DELETE", body: { code: r.code, confirm: true } });
    if (res.kind === "success") void onChanged();
    else setMsg(res.message);
  }

  return (
    <li className="card p-5" data-testid="owner-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{r.seatLabel ? `Seat ${r.seatLabel}` : "No seat"} · {r.code}{r.source ? ` · via ${r.source}` : ""}</p>
          <p className="mt-1 text-lg font-semibold text-ink">{r.name} <span className="font-normal text-ink-muted">· {r.city}</span></p>
          <p className="text-sm text-ink-soft">
            {r.contactName} ({r.role})
            {r.phone ? <> · <a className="text-brand underline underline-offset-4" href={`tel:${r.phone}`}>{r.phone}</a></> : null}
            {r.email ? <> · <a className="text-brand underline underline-offset-4" href={`mailto:${r.email}`}>{r.email}</a></> : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Badge tone={healthTone[r.metrics.health]}>{HEALTH_LABEL[r.metrics.health]}</Badge>
          <span className="tabular text-ink-soft">{r.metrics.metCount}/7 goals</span>
          <span className="text-xs text-ink-muted">{r.metrics.daysSinceActive === null ? "No activity yet" : r.metrics.daysSinceActive === 0 ? "Active today" : `Last active ${r.metrics.daysSinceActive}d ago`}</span>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Goals">
        {r.metrics.metrics.map((m) => (
          <li key={m.key} title={`${m.question} — ${m.headline}. ${m.detail}`}
            className={cn("rounded-full px-3 py-1 text-xs font-medium", m.met ? "bg-good-tint text-good" : m.pending ? "bg-paper-sunk text-ink-muted" : "bg-warn-tint text-warn")}>
            {m.met ? "✓" : m.pending ? "…" : "✗"} {METRIC_SHORT[m.key]}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-ink-soft"><strong className="text-ink">Next:</strong> {r.metrics.nextStep}</p>
      <p className="tabular mt-1 text-xs text-ink-muted">
        {r.metrics.totals.analysis_real} tests · {r.metrics.totals.links_shared} links · {r.metrics.totals.report_opened} opened · {r.metrics.teacherDevices} teacher / {r.metrics.studentDevices} student devices · {r.weeklyDigest ? "weekly email on" : "no weekly email"}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <div>
          <label htmlFor={`nudge-${r.code}`} className="field-label">WhatsApp nudge</label>
          <select id={`nudge-${r.code}`} className="field-input" value={kind} onChange={(e) => setKind(e.target.value as NudgeKind)}>
            <option value="not_activated">First test</option>
            <option value="no_links">Send report links</option>
            <option value="at_risk">Restart rhythm</option>
            <option value="dormant">Check in</option>
            <option value="ask_value">Ask for value</option>
            <option value="thanks">Thank you</option>
          </select>
        </div>
        {r.phone ? (
          <a className="inline-flex min-h-11 items-center rounded-full bg-good px-5 text-sm font-medium text-white hover:opacity-90" target="_blank" rel="noopener"
            href={whatsappLink(nudgeMessage(kind, r, origin), r.phone)}>Open WhatsApp<span className="sr-only"> (new tab)</span></a>
        ) : <span className="text-sm text-ink-muted">No phone number</span>}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <label htmlFor={`notes-${r.code}`} className="field-label">Notes</label>
          <textarea id={`notes-${r.code}`} rows={2} maxLength={2000} className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`follow-${r.code}`} className={cn("field-label", due && "text-gap")}>Next follow-up{due ? " (due)" : ""}</label>
          <input id={`follow-${r.code}`} type="date" className="field-input" value={follow} onChange={(e) => setFollow(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`status-${r.code}`} className="field-label">Status</label>
          <select id={`status-${r.code}`} className="field-input" value={status} onChange={(e) => setStatus(e.target.value as Row["status"])}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={save} disabled={saving}>{saving ? (<><Spinner /> Saving…</>) : "Save"}</Button>
        <a href={`/institute#${r.code}`} target="_blank" rel="noopener" className="text-sm text-brand underline underline-offset-4">Their dashboard</a>
        <button type="button" onClick={remove} className="text-sm text-gap underline underline-offset-4">Delete institute</button>
        {msg ? <span role="status" className="text-sm text-ink-muted">{msg}</span> : null}
      </div>
    </li>
  );
}
