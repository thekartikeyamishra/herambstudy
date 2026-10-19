"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { describedBy, Field, Honeypot, Spinner } from "@/components/forms/Field";
import { setInstitute } from "@/lib/client/institute";
import { requestJson } from "@/lib/client/postJson";
import { teacherInviteMessage, whatsappLink } from "@/lib/institute/share";
import { cn } from "@/lib/cn";
import { fieldErrors as toFieldErrors, INSTITUTION_TYPES, instituteJoinSchema, PILOT_ROLES } from "@/lib/validation/schemas";

type Values = {
  instituteName: string;
  city: string;
  institutionType: string;
  contactName: string;
  role: string;
  phone: string;
  email: string;
  weeklyDigest: boolean;
  privacyAcknowledged: boolean;
};

const initial: Values = { instituteName: "", city: "", institutionType: "coaching", contactName: "", role: "", phone: "", email: "", weeklyDigest: false, privacyAcknowledged: false };
const ORDER = ["instituteName", "city", "institutionType", "contactName", "role", "phone", "email", "privacyAcknowledged"];

type Joined = { code: string; seat: number | null; seatLabel: string | null; cap: number; name: string };

export function JoinForm() {
  const [v, setV] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const [joined, setJoined] = useState<Joined | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [source, setSource] = useState<"meeting" | "self" | "referral">("self");
  const [copied, setCopied] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [origin, setOrigin] = useState("");
  const startedAt = useRef(0);
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    setOrigin(window.location.origin);
    const s = new URLSearchParams(window.location.search).get("source");
    if (s === "meeting" || s === "referral") setSource(s);
  }, []);
  useEffect(() => {
    if (joined || status === "error") focusRef.current?.focus();
  }, [joined, status]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setV((s) => ({ ...s, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _r, ...rest }) => rest);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const payload = { ...v, source, website: honeypot, startedAt: startedAt.current || undefined };
    const parsed = instituteJoinSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = toFieldErrors(parsed.error);
      setErrors(errs);
      const first = ORDER.find((f) => errs[f]);
      if (first) document.getElementById(`join-${first}`)?.focus();
      return;
    }
    setStatus("submitting");
    const r = await requestJson<Joined & { ok: true }>("/api/institutes", { body: payload });
    if (r.kind === "success") {
      setJoined(r.data);
      setInstitute({ code: r.data.code, name: r.data.name, seatLabel: r.data.seatLabel });
      setStatus("idle");
    } else {
      setErrors(r.fieldErrors ?? {});
      setMessage(r.message);
      setStatus("error");
    }
  }

  if (joined) {
    const invite = teacherInviteMessage(origin, joined);
    return (
      <div ref={focusRef} tabIndex={-1} role="status" className="card p-6 focus:outline-none sm:p-8" data-testid="join-success">
        <p className="eyebrow">{joined.seatLabel ? `Founding institute ${joined.seatLabel}` : "Registered"}</p>
        <h2 className="mt-2 text-display-md">{joined.name} is in.</h2>
        {!joined.seatLabel ? (
          <p className="mt-2 text-sm text-ink-soft">All {joined.cap} founding seats are taken, so this registration has no founding seat — everything else works the same, and today's free tools stay free.</p>
        ) : null}
        <p className="mt-4 text-sm text-ink-muted">Your institute code</p>
        <p className="mt-1 select-all font-mono text-3xl font-bold tracking-wider text-ink" data-testid="join-code">{joined.code}</p>
        <p className="mt-3 text-[0.9375rem] text-ink-soft">
          Save it, and share it with your teachers. It connects their analyses and your students' report links to {joined.name}.
          No passwords. Usage is counted anonymously — marks and student names are never part of it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href={`/resources/class-test-analyser#connect=${joined.code}`}>Analyse your first test</LinkButton>
          <a href={whatsappLink(invite)} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-paper-raised px-5 text-[0.9375rem] font-medium text-ink hover:bg-paper-sunk">
            Invite teachers on WhatsApp<span className="sr-only"> (opens WhatsApp)</span>
          </a>
          <Button variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(joined.code); setCopied(true); } catch { setCopied(false); } }}>
            {copied ? "Copied ✓" : "Copy code"}
          </Button>
        </div>
        <p className="mt-4 text-sm text-ink-muted">
          This device is now connected to {joined.name}, so tests analysed here count for it.{" "}
          <button type="button" className="underline underline-offset-4" onClick={() => { setInstitute(null); setDisconnected(true); }}>
            {disconnected ? "Disconnected ✓" : "Not your device? Disconnect it"}
          </button>
        </p>
        <ol className="mt-8 space-y-2 border-t border-line pt-6 text-[0.9375rem] text-ink-soft">
          <li><strong className="text-ink">1.</strong> Analyse one real test — paste, upload Excel, link a Google Sheet or photograph the marksheet.</li>
          <li><strong className="text-ink">2.</strong> Send each student their report link.</li>
          <li><strong className="text-ink">3.</strong> Do the same after the next test. Your <Link href={`/institute#${joined.code}`} className="font-medium text-brand underline underline-offset-4">institute dashboard</Link> shows progress.</li>
        </ol>
      </div>
    );
  }

  const err = (k: string) => errors[k];
  const text = (key: keyof Values, label: string, opts: { optional?: boolean; type?: string; auto?: string; hint?: string; max?: number } = {}) => (
    <Field id={`join-${key}`} label={label} optional={opts.optional} hint={opts.hint} error={err(key)}>
      <input id={`join-${key}`} type={opts.type ?? "text"} autoComplete={opts.auto} maxLength={opts.max ?? 120} className="field-input"
        value={v[key] as string} aria-invalid={Boolean(err(key))} aria-describedby={describedBy(`join-${key}`, Boolean(opts.hint), err(key))}
        onChange={(e) => set(key, e.target.value as never)} />
    </Field>
  );
  const submitting = status === "submitting";

  return (
    <form noValidate onSubmit={onSubmit} className="card relative space-y-6 p-6 sm:p-8" data-testid="join-form">
      {status === "error" && message ? (
        <div ref={focusRef} tabIndex={-1} role="alert" className="rounded-xl border border-gap/30 bg-gap-tint px-4 py-3 text-sm font-medium text-gap focus:outline-none">{message}</div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        {text("instituteName", "Institute name", { auto: "organization" })}
        {text("city", "City", { auto: "address-level2", max: 80 })}
      </div>
      <fieldset>
        <legend className="field-label">Type</legend>
        <div className="grid gap-2 sm:grid-cols-4">
          {INSTITUTION_TYPES.map((t, i) => (
            <label key={t.value} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 text-[0.9375rem]", v.institutionType === t.value ? "border-brand bg-brand-tint/50" : "border-line-strong hover:border-ink-muted")}>
              <input id={i === 0 ? "join-institutionType" : undefined} type="radio" name="institutionType" className="h-4 w-4 accent-[rgb(var(--brand))]"
                checked={v.institutionType === t.value} onChange={() => set("institutionType", t.value)} />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        {text("contactName", "Contact person", { auto: "name", max: 80 })}
        <Field id="join-role" label="Their role" error={err("role")}>
          <select id="join-role" className="field-input" value={v.role} aria-invalid={Boolean(err("role"))} aria-describedby={describedBy("join-role", false, err("role"))} onChange={(e) => set("role", e.target.value)}>
            <option value="" disabled>Choose one</option>
            {PILOT_ROLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        {text("phone", "Phone / WhatsApp", { type: "tel", auto: "tel", max: 20, optional: true, hint: "For setup help only. Phone or email is needed." })}
        {text("email", "Email", { type: "email", auto: "email", max: 254, optional: true, hint: "We'll email the institute code here." })}
      </div>
      <label className={cn("flex items-start gap-3 text-[0.9375rem]", v.email.trim() ? "cursor-pointer text-ink-soft" : "text-ink-muted")}>
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]" checked={v.weeklyDigest} disabled={!v.email.trim()}
          onChange={(e) => set("weeklyDigest", e.target.checked)} />
        <span>Send a short Monday summary: last week's numbers and a reminder to analyse this week's test. Stop any time.</span>
      </label>
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem] text-ink-soft">
          <input id="join-privacyAcknowledged" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]" checked={v.privacyAcknowledged}
            aria-invalid={Boolean(err("privacyAcknowledged"))} aria-describedby={err("privacyAcknowledged") ? "join-privacyAcknowledged-error" : undefined}
            onChange={(e) => set("privacyAcknowledged", e.target.checked)} />
          <span>
            I agree that Heramb.study may store these contact details to run the founding programme, and record anonymous usage counts for this institute, as described in the{" "}
            <Link href="/privacy" className="font-medium text-brand underline underline-offset-4">privacy policy</Link>.
          </span>
        </label>
        {err("privacyAcknowledged") ? <p id="join-privacyAcknowledged-error" className="field-error">{err("privacyAcknowledged")}</p> : null}
      </div>
      <Honeypot value={honeypot} onChange={setHoneypot} />
      <Button type="submit" size="lg" disabled={submitting}>{submitting ? (<><Spinner /> Registering…</>) : "Get our institute code"}</Button>
      <p className="text-xs text-ink-muted">Free. No card, no contract. Takes 30 seconds.</p>
    </form>
  );
}
