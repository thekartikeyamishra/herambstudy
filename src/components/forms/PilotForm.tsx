"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { describedBy, Field, Honeypot, Spinner } from "@/components/forms/Field";
import { COUNTRIES } from "@/content/countries";
import { track } from "@/lib/client/analytics";
import { postJson } from "@/lib/client/postJson";
import { cn } from "@/lib/cn";
import {
  fieldErrors as toFieldErrors,
  INSTITUTE_SIZES,
  INSTITUTION_TYPES,
  PILOT_EXAMS,
  PILOT_ROLES,
  pilotApplicationSchema,
  PRICE_COMFORT,
  START_WINDOWS,
  TEST_FREQUENCIES,
} from "@/lib/validation/schemas";

type Values = {
  contactName: string;
  role: string;
  email: string;
  phone: string;
  institutionType: string;
  instituteName: string;
  city: string;
  country: string;
  studentCount: string;
  exams: string[];
  testFrequency: string;
  currentTools: string;
  startWindow: string;
  priceComfort: string;
  notes: string;
  privacyAcknowledged: boolean;
};

const initial: Values = {
  contactName: "",
  role: "",
  email: "",
  phone: "",
  institutionType: "",
  instituteName: "",
  city: "",
  country: "IN",
  studentCount: "",
  exams: [],
  testFrequency: "",
  currentTools: "",
  startWindow: "",
  priceComfort: "",
  notes: "",
  privacyAcknowledged: false,
};

const ORDER = ["contactName", "role", "email", "phone", "institutionType", "instituteName", "city", "country", "studentCount", "exams", "testFrequency", "startWindow", "privacyAcknowledged"];

export function PilotForm() {
  const [v, setV] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(0);
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    // Pre-select from ?type=school|college|coaching|tutor (links from the audience pages).
    const t = new URLSearchParams(window.location.search).get("type");
    if (t && INSTITUTION_TYPES.some((x) => x.value === t)) setV((s) => (s.institutionType ? s : { ...s, institutionType: t }));
  }, []);
  useEffect(() => {
    if (status === "success" || status === "error") focusRef.current?.focus();
  }, [status]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setV((s) => ({ ...s, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _r, ...rest }) => rest);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const payload = { ...v, website: honeypot, startedAt: startedAt.current || undefined };
    const parsed = pilotApplicationSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = toFieldErrors(parsed.error);
      setErrors(errs);
      const first = ORDER.find((f) => errs[f]);
      if (first) document.getElementById(`pilot-${first}`)?.focus();
      return;
    }
    setStatus("submitting");
    const result = await postJson("/api/pilot", payload);
    if (result.kind === "success") {
      setStatus("success");
      setMessage(result.message);
      track("pilot_application_submitted", { country: v.country });
    } else {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.message);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div ref={focusRef} tabIndex={-1} role="status" className="card p-6 focus:outline-none sm:p-8" data-testid="pilot-success">
        <h2 className="text-display-md">Application received</h2>
        <p className="mt-3 text-ink-soft">{message}</p>
        <p className="mt-4 text-sm text-ink-muted">
          While you wait, try the{" "}
          <Link href="/resources/class-test-analyser" className="font-medium text-brand underline underline-offset-4">class test analyser</Link>{" "}
          with your latest test.
        </p>
      </div>
    );
  }

  const err = (k: string) => errors[k];
  const text = (key: keyof Values, label: string, opts: { optional?: boolean; type?: string; auto?: string; hint?: string; max?: number } = {}) => (
    <Field id={`pilot-${key}`} label={label} optional={opts.optional} hint={opts.hint} error={err(key)}>
      <input
        id={`pilot-${key}`}
        type={opts.type ?? "text"}
        autoComplete={opts.auto}
        maxLength={opts.max ?? 120}
        className="field-input"
        value={v[key] as string}
        aria-invalid={Boolean(err(key))}
        aria-describedby={describedBy(`pilot-${key}`, Boolean(opts.hint), err(key))}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </Field>
  );
  const select = (key: keyof Values, label: string, options: ReadonlyArray<{ value: string; label: string }>, opts: { optional?: boolean; placeholder?: string } = {}) => (
    <Field id={`pilot-${key}`} label={label} optional={opts.optional} error={err(key)}>
      <select
        id={`pilot-${key}`}
        className="field-input"
        value={v[key] as string}
        aria-invalid={Boolean(err(key))}
        aria-describedby={describedBy(`pilot-${key}`, false, err(key))}
        onChange={(e) => set(key, e.target.value as never)}
      >
        <option value="" disabled={!opts.optional}>{opts.placeholder ?? "Choose one"}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
  const submitting = status === "submitting";

  return (
    <form noValidate onSubmit={onSubmit} className="card relative space-y-8 p-6 sm:p-8">
      {status === "error" && message ? (
        <div ref={focusRef} tabIndex={-1} role="alert" data-testid="pilot-error" className="rounded-xl border border-gap/30 bg-gap-tint px-4 py-3 text-sm font-medium text-gap focus:outline-none">
          {message}
        </div>
      ) : null}

      <fieldset className="space-y-5">
        <legend className="font-sans text-base font-semibold">About you</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("contactName", "Your name", { auto: "name", max: 80 })}
          {select("role", "Your role", PILOT_ROLES)}
          {text("email", "Work email", { type: "email", auto: "email", max: 254 })}
          {text("phone", "Phone / WhatsApp", { optional: true, type: "tel", auto: "tel", max: 20, hint: "Only used to arrange the pilot call." })}
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-sans text-base font-semibold">Your institution</legend>
        <fieldset aria-describedby={err("institutionType") ? "pilot-institutionType-error" : undefined}>
          <legend className="field-label">Type of institution</legend>
          <div className="grid gap-2 sm:grid-cols-4">
            {INSTITUTION_TYPES.map((t, i) => (
              <label key={t.value} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 text-[0.9375rem]", v.institutionType === t.value ? "border-brand bg-brand-tint/50" : "border-line-strong hover:border-ink-muted")}>
                <input
                  id={i === 0 ? "pilot-institutionType" : undefined}
                  type="radio"
                  name="institutionType"
                  className="h-4 w-4 accent-[rgb(var(--brand))]"
                  checked={v.institutionType === t.value}
                  onChange={() => set("institutionType", t.value)}
                />
                {t.label}
              </label>
            ))}
          </div>
          {err("institutionType") ? <p id="pilot-institutionType-error" className="field-error">{err("institutionType")}</p> : null}
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("instituteName", "Institution name", { auto: "organization" })}
          {text("city", "City", { auto: "address-level2", max: 80 })}
          {select("country", "Country", COUNTRIES.map((c) => ({ value: c.code, label: c.name })))}
          {select("studentCount", "Number of students", INSTITUTE_SIZES)}
        </div>
        <fieldset aria-describedby={err("exams") ? "pilot-exams-error" : undefined}>
          <legend className="field-label">Exams or courses your students take</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {PILOT_EXAMS.map((ex, i) => {
              const checked = v.exams.includes(ex.value);
              return (
                <label key={ex.value} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 text-[0.9375rem]", checked ? "border-brand bg-brand-tint/50" : "border-line-strong hover:border-ink-muted")}>
                  <input
                    id={i === 0 ? "pilot-exams" : undefined}
                    type="checkbox"
                    className="h-4 w-4 accent-[rgb(var(--brand))]"
                    checked={checked}
                    onChange={(e) => set("exams", e.target.checked ? [...v.exams, ex.value] : v.exams.filter((x) => x !== ex.value))}
                  />
                  {ex.label}
                </label>
              );
            })}
          </div>
          {err("exams") ? <p id="pilot-exams-error" className="field-error">{err("exams")}</p> : null}
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          {select("testFrequency", "How often do batches take tests?", TEST_FREQUENCIES)}
          {text("currentTools", "Software you use for tests today", { optional: true, max: 300, hint: "e.g. your test-series provider or LMS. Helps us fit around it." })}
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-sans text-base font-semibold">Timing and fit</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          {select("startWindow", "When would you like to start?", START_WINDOWS)}
          {select("priceComfort", "If it works, what feels reasonable per student per month?", PRICE_COMFORT, { optional: true, placeholder: "Prefer not to say" })}
        </div>
        <p className="text-sm text-ink-muted">
          The price question is optional and only helps us plan fair pricing. Pilots are not charged without a written agreement.
        </p>
        <Field id="pilot-notes" label="Anything else we should know?" optional error={err("notes")} hint="Please don't include student names or marks.">
          <textarea id="pilot-notes" rows={4} maxLength={1000} className="field-input resize-y" value={v.notes}
            aria-describedby={describedBy("pilot-notes", true, err("notes"))} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </fieldset>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem] text-ink-soft">
          <input id="pilot-privacyAcknowledged" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]"
            checked={v.privacyAcknowledged} aria-invalid={Boolean(err("privacyAcknowledged"))}
            aria-describedby={err("privacyAcknowledged") ? "pilot-privacyAcknowledged-error" : undefined}
            onChange={(e) => set("privacyAcknowledged", e.target.checked)} />
          <span>
            I agree that Heramb.study may store these details to assess and arrange a pilot, as described in the{" "}
            <Link href="/privacy" className="font-medium text-brand underline underline-offset-4">privacy policy</Link>.
          </span>
        </label>
        {err("privacyAcknowledged") ? <p id="pilot-privacyAcknowledged-error" className="field-error">{err("privacyAcknowledged")}</p> : null}
      </div>

      <Honeypot value={honeypot} onChange={setHoneypot} />
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? (<><Spinner /> Sending application…</>) : "Apply for a pilot"}
      </Button>
      <p className="sr-only" role="status" aria-live="polite">{submitting ? "Sending your application" : ""}</p>
    </form>
  );
}
