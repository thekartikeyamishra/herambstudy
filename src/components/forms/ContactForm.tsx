"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { describedBy, Field, Honeypot, Spinner } from "@/components/forms/Field";
import { track } from "@/lib/client/analytics";
import { postJson } from "@/lib/client/postJson";
import { CONTACT_TOPICS, contactMessageSchema, fieldErrors as toFieldErrors } from "@/lib/validation/schemas";

const initial = { name: "", email: "", topic: "", message: "", privacyAcknowledged: false };
const ORDER = ["name", "email", "topic", "message", "privacyAcknowledged"];

export function ContactForm({ defaultTopic }: { defaultTopic?: string }) {
  const [values, setValues] = useState({ ...initial, topic: defaultTopic ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(0);
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    // Pre-select a topic from ?topic=… links (e.g. "Discuss a pilot").
    const t = new URLSearchParams(window.location.search).get("topic");
    if (t && CONTACT_TOPICS.some((x) => x.value === t)) setValues((v) => (v.topic ? v : { ...v, topic: t }));
  }, []);
  useEffect(() => {
    if (status === "success" || status === "error") focusRef.current?.focus();
  }, [status]);

  function update(key: keyof typeof initial, value: string | boolean) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _r, ...rest }) => rest);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const payload = { ...values, website: honeypot, startedAt: startedAt.current || undefined };
    const parsed = contactMessageSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = toFieldErrors(parsed.error);
      setErrors(errs);
      const first = ORDER.find((f) => errs[f]);
      if (first) document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    setStatus("submitting");
    const result = await postJson("/api/contact", payload);
    if (result.kind === "success") {
      setStatus("success");
      setMessage(result.message);
      track("contact_message_submitted", { outcome: "success" });
    } else {
      setErrors(result.fieldErrors ?? {});
      setMessage(result.message);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div ref={focusRef} tabIndex={-1} role="status" className="card p-6 focus:outline-none sm:p-8">
        <h2 className="text-display-md">Message sent</h2>
        <p className="mt-3 text-ink-soft">{message}</p>
      </div>
    );
  }

  const err = (k: string) => errors[k];
  const submitting = status === "submitting";

  return (
    <form noValidate onSubmit={onSubmit} className="card relative space-y-5 p-6 sm:p-8">
      {status === "error" && message ? (
        <div ref={focusRef} tabIndex={-1} role="alert" className="rounded-xl border border-gap/30 bg-gap-tint px-4 py-3 text-sm font-medium text-gap focus:outline-none">
          {message}
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="contact-name" label="Your name" error={err("name")}>
          <input id="contact-name" type="text" autoComplete="name" className="field-input" value={values.name}
            aria-invalid={Boolean(err("name"))} aria-describedby={describedBy("contact-name", false, err("name"))}
            onChange={(e) => update("name", e.target.value)} />
        </Field>
        <Field id="contact-email" label="Email address" error={err("email")}>
          <input id="contact-email" type="email" inputMode="email" autoComplete="email" className="field-input" value={values.email}
            aria-invalid={Boolean(err("email"))} aria-describedby={describedBy("contact-email", false, err("email"))}
            onChange={(e) => update("email", e.target.value)} />
        </Field>
      </div>
      <Field id="contact-topic" label="Topic" error={err("topic")}>
        <select id="contact-topic" className="field-input" value={values.topic} aria-invalid={Boolean(err("topic"))}
          aria-describedby={describedBy("contact-topic", false, err("topic"))} onChange={(e) => update("topic", e.target.value)}>
          <option value="" disabled>Choose a topic</option>
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </Field>
      <Field id="contact-message" label="Message" hint="Please don't include student records or other sensitive personal data." error={err("message")}>
        <textarea id="contact-message" rows={6} maxLength={2000} className="field-input resize-y" value={values.message}
          aria-invalid={Boolean(err("message"))} aria-describedby={describedBy("contact-message", true, err("message"))}
          onChange={(e) => update("message", e.target.value)} />
      </Field>
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem] text-ink-soft">
          <input id="contact-privacyAcknowledged" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--brand))]"
            checked={values.privacyAcknowledged} aria-invalid={Boolean(err("privacyAcknowledged"))}
            aria-describedby={err("privacyAcknowledged") ? "contact-privacyAcknowledged-error" : undefined}
            onChange={(e) => update("privacyAcknowledged", e.target.checked)} />
          <span>
            I agree that my message and contact details are stored so you can respond, as described in the{" "}
            <Link href="/privacy" className="font-medium text-brand underline underline-offset-4">privacy policy</Link>.
          </span>
        </label>
        {err("privacyAcknowledged") ? <p id="contact-privacyAcknowledged-error" className="field-error">{err("privacyAcknowledged")}</p> : null}
      </div>
      <Honeypot value={honeypot} onChange={setHoneypot} />
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? (<><Spinner /> Sending…</>) : "Send message"}
      </Button>
    </form>
  );
}
