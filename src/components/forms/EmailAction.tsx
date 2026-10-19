"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/forms/Field";
import { postJson } from "@/lib/client/postJson";

/**
 * Confirm / unsubscribe pages. The action needs an explicit click (POST), so
 * email security scanners that pre-fetch links can't change anyone's consent.
 */
export function EmailAction({ purpose }: { purpose: "confirm" | "unsubscribe" | "digest" }) {
  const [params, setParams] = useState<{ id: string; t: string } | null>(null);
  const [state, setState] = useState<"ready" | "missing" | "working" | "done" | "error">("ready");
  const [message, setMessage] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get("id");
    const t = q.get("t");
    if (id && t) setParams({ id, t });
    else setState("missing");
  }, []);

  useEffect(() => {
    if (state === "done" || state === "error") ref.current?.focus();
  }, [state]);

  async function act() {
    if (!params) return;
    setState("working");
    const r = await postJson(purpose === "digest" ? "/api/institutes/digest" : `/api/email/${purpose}`, params);
    setMessage(r.message);
    setState(r.kind === "success" ? "done" : "error");
  }

  const copy =
    purpose === "confirm"
      ? { button: "Yes, send me product updates", intro: "Please confirm you'd like occasional product updates from Heramb.study. You can unsubscribe at any time." }
      : purpose === "digest"
        ? { button: "Stop weekly emails", intro: "Stop the weekly summary for your institute. Your institute code, dashboard and data stay as they are." }
        : { button: "Unsubscribe from updates", intro: "Stop receiving product updates. Your invite request itself stays as it is." };

  if (state === "missing") {
    return (
      <p role="alert" className="mt-6 text-ink-soft">
        This link is incomplete. Please open the full link from your email, or{" "}
        <Link href="/contact" className="font-medium text-brand underline underline-offset-4">contact us</Link>.
      </p>
    );
  }

  return (
    <div className="mt-6">
      {state === "done" || state === "error" ? (
        <div ref={ref} tabIndex={-1} role={state === "error" ? "alert" : "status"} data-testid="email-action-result"
          className={state === "done" ? "rounded-xl border border-good/30 bg-good-tint px-4 py-3 text-ink focus:outline-none" : "rounded-xl border border-gap/30 bg-gap-tint px-4 py-3 text-gap focus:outline-none"}>
          {message}
        </div>
      ) : (
        <>
          <p className="text-ink-soft">{copy.intro}</p>
          <Button className="mt-6" onClick={act} disabled={state === "working" || !params}>
            {state === "working" ? (<><Spinner /> Working…</>) : copy.button}
          </Button>
        </>
      )}
    </div>
  );
}
