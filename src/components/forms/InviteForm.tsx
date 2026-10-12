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
  inviteRequestSchema,
  ROLES,
  ROLES_WITH_INSTITUTE,
  USE_CASES,
  type Role,
} from "@/lib/validation/schemas";

type Values = {
  name: string;
  email: string;
  role: Role | "";
  country: string;
  useCase: string;
  useCaseNote: string;
  instituteName: string;
  instituteSize: string;
  privacyAcknowledged: boolean;
  marketingConsent: boolean;
};

const initial: Values = {
  name: "",
  email: "",
  role: "",
  country: "",
  useCase: "",
  useCaseNote: "",
  instituteName: "",
  instituteSize: "",
  privacyAcknowledged: false,
  marketingConsent: false, // never pre-checked
};

const FIELD_ORDER = ["email", "name", "role", "country", "useCase", "useCaseNote", "instituteName", "instituteSize", "privacyAcknowledged"];

export function InviteForm() {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef<number>(0);
  const startedTracked = useRef(false);
  const source = useRef<{ campaign?: string; landingPage?: string }>({});
  const successRef = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    const params = new URLSearchParams(window.location.search);
    const campaign = params.get("utm_campaign") ?? undefined;
    let landingPage: string | undefined;
    try {
      if (document.referrer) {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) landingPage = ref.pathname;
      }
    } catch {
      /* ignore malformed referrer */
    }
    source.current = {
      campaign: campaign && /^[a-zA-Z0-9_.-]{1,64}$/.test(campaign) ? campaign : undefined,
      landingPage: landingPage && /^\/[a-zA-Z0-9/_-]{0,199}$/.test(landingPage) ? landingPage : undefined,
    };
  }, []);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
    if (status === "error") alertRef.current?.focus();
  }, [status]);

  const showInstitute = values.role !== "" && ROLES_WITH_INSTITUTE.has(values.role);

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    if (!startedTracked.current) {
      startedTracked.current = true;
      track("invite_form_started");
    }
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _removed, ...rest }) => rest);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return; // prevent double submission

    const payload = {
      ...values,
      source: source.current,
      website: honeypot,
      startedAt: startedAt.current || undefined,
    };
    const parsed = inviteRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = toFieldErrors(parsed.error);
      setErrors(errs);
      setStatus("idle");
      const first = FIELD_ORDER.find((f) => errs[f]);
      if (first) document.getElementById(`invite-${first}`)?.focus();
      return;
    }

    setStatus("submitting");
    setMessage("");
    const result = await postJson("/api/invite", payload);
    if (result.kind === "success") {
      setStatus("success");
      setMessage(result.message);
      track("invite_request_submitted", { role: values.role, country: values.country });
    } else {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.message);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="card p-6 sm:p-8" role="status" aria-live="polite" data-testid="invite-success">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-good-tint text-good">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="m5 11.5 4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 ref={successRef} tabIndex={-1} className="text-display-md focus:outline-none">
          Request received
        </h2>
        <p className="mt-3 text-ink-soft">{message}</p>
        <p className="mt-4 text-sm text-ink-muted">
          You can ask us to delete your request at any time from the{" "}
          <Link href="/contact" className="font-medium text-brand underline underline-offset-4">
            contact page
          </Link>
          .
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/resources" className="font-medium text-brand underline underline-offset-4">
            Explore the free resources while you wait →
          </Link>
        </div>
      </div>
    );
  }

  const err = (k: string) => errors[k];
  const submitting = status === "submitting";

  return (
    <form noValidate onSubmit={onSubmit} className="card relative space-y-6 p-6 sm:p-8" aria-describedby="invite-intro">
      <p id="invite-intro" className="text-sm text-ink-muted">
        Fields marked optional can be left blank. We only ask for what helps us prioritise invitations.
      </p>

      {status === "error" && message ? (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          data-testid="invite-error"
          className="rounded-xl border border-gap/30 bg-gap-tint px-4 py-3 text-sm font-medium text-gap focus:outline-none"
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="invite-email" label="Email address" error={err("email")}>
          <input
            id="invite-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className="field-input"
            value={values.email}
            aria-invalid={Boolean(err("email"))}
            aria-describedby={describedBy("invite-email", false, err("email"))}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <Field id="invite-name" label="Name" optional error={err("name")}>
          <input
            id="invite-name"
            name="name"
            type="text"
            autoComplete="name"
            className="field-input"
            value={values.name}
            aria-invalid={Boolean(err("name"))}
            aria-describedby={describedBy("invite-name", false, err("name"))}
            onChange={(e) => update("name", e.target.value)}
          />
        </Field>
      </div>

      <fieldset aria-describedby={err("role") ? "invite-role-error" : undefined}>
        <legend className="field-label">I am a…</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((r, i) => (
            <label
              key={r.value}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-control border px-3.5 py-2.5 text-[0.9375rem] transition-colors",
                values.role === r.value ? "border-brand bg-brand-tint/50 text-ink" : "border-line-strong hover:border-ink-muted",
              )}
            >
              <input
                id={i === 0 ? "invite-role" : undefined}
                type="radio"
                name="role"
                value={r.value}
                checked={values.role === r.value}
                onChange={() => update("role", r.value)}
                className="h-4 w-4 accent-[rgb(var(--brand))]"
              />
              {r.label}
            </label>
          ))}
        </div>
        {err("role") ? (
          <p id="invite-role-error" className="field-error">
            {err("role")}
          </p>
        ) : null}
        {values.role === "student" ? (
          <p className="field-hint" role="note">
            If you're under 18, please ask a parent or guardian to fill in this form on your behalf, using their email
            address.
          </p>
        ) : null}
      </fieldset>

      {showInstitute ? (
        <div className="grid gap-5 rounded-2xl border border-line bg-paper-sunk/60 p-4 sm:grid-cols-2">
          <Field id="invite-instituteName" label="Institute name" optional error={err("instituteName")}>
            <input
              id="invite-instituteName"
              name="instituteName"
              type="text"
              autoComplete="organization"
              className="field-input"
              value={values.instituteName}
              aria-invalid={Boolean(err("instituteName"))}
              onChange={(e) => update("instituteName", e.target.value)}
            />
          </Field>
          <Field id="invite-instituteSize" label="Approximate number of students" optional error={err("instituteSize")}>
            <select
              id="invite-instituteSize"
              name="instituteSize"
              className="field-input"
              value={values.instituteSize}
              onChange={(e) => update("instituteSize", e.target.value)}
            >
              <option value="">Prefer not to say</option>
              {INSTITUTE_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="invite-country" label="Country" error={err("country")}>
          <select
            id="invite-country"
            name="country"
            className="field-input"
            value={values.country}
            aria-invalid={Boolean(err("country"))}
            aria-describedby={describedBy("invite-country", false, err("country"))}
            onChange={(e) => update("country", e.target.value)}
          >
            <option value="" disabled>
              Choose a country
            </option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="invite-useCase" label="Main reason you're interested" error={err("useCase")}>
          <select
            id="invite-useCase"
            name="useCase"
            className="field-input"
            value={values.useCase}
            aria-invalid={Boolean(err("useCase"))}
            aria-describedby={describedBy("invite-useCase", false, err("useCase"))}
            onChange={(e) => update("useCase", e.target.value)}
          >
            <option value="" disabled>
              Choose one
            </option>
            {USE_CASES.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id="invite-useCaseNote"
        label="Anything we should know?"
        optional
        hint="For example, the exam you prepare for or the problem you'd like solved. Please don't include student records."
        error={err("useCaseNote")}
      >
        <textarea
          id="invite-useCaseNote"
          name="useCaseNote"
          rows={3}
          maxLength={500}
          className="field-input resize-y"
          value={values.useCaseNote}
          aria-invalid={Boolean(err("useCaseNote"))}
          aria-describedby={describedBy("invite-useCaseNote", true, err("useCaseNote"))}
          onChange={(e) => update("useCaseNote", e.target.value)}
        />
      </Field>

      <div className="space-y-3 border-t border-line pt-5">
        <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem] text-ink-soft">
          <input
            id="invite-privacyAcknowledged"
            type="checkbox"
            name="privacyAcknowledged"
            className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]"
            checked={values.privacyAcknowledged}
            aria-invalid={Boolean(err("privacyAcknowledged"))}
            aria-describedby={err("privacyAcknowledged") ? "invite-privacyAcknowledged-error" : undefined}
            onChange={(e) => update("privacyAcknowledged", e.target.checked)}
          />
          <span>
            I agree that Heramb.study may store these details to process my invite request, as described in the{" "}
            <Link href="/privacy" className="font-medium text-brand underline underline-offset-4" target="_blank">
              privacy policy
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
            .
          </span>
        </label>
        {err("privacyAcknowledged") ? (
          <p id="invite-privacyAcknowledged-error" className="field-error">
            {err("privacyAcknowledged")}
          </p>
        ) : null}
        <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem] text-ink-soft">
          <input
            id="invite-marketingConsent"
            type="checkbox"
            name="marketingConsent"
            className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]"
            checked={values.marketingConsent}
            onChange={(e) => update("marketingConsent", e.target.checked)}
          />
          <span>
            <span className="font-medium text-ink">Optional:</span> email me occasional product updates. You can
            unsubscribe at any time. Your invite request doesn't depend on this.
          </span>
        </label>
      </div>

      <Honeypot value={honeypot} onChange={setHoneypot} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={submitting} aria-disabled={submitting}>
          {submitting ? (
            <>
              <Spinner /> Sending request…
            </>
          ) : (
            "Request an invite"
          )}
        </Button>
        <p className="text-sm text-ink-muted">No payment, no app download, no fixed launch date promised.</p>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {submitting ? "Sending your request" : ""}
      </p>
    </form>
  );
}
