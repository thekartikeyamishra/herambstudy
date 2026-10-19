"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/forms/Field";
import { connectCodeFromHash, getInstitute, INSTITUTE_EVENT, setInstitute, type ConnectedInstitute } from "@/lib/client/institute";
import { requestJson } from "@/lib/client/postJson";
import { normaliseCode } from "@/lib/institute/code";

type StatsReply = { ok: true; institute: { code: string; name: string; seatLabel: string | null } };

export async function lookupInstitute(code: string): Promise<{ ok: true; institute: ConnectedInstitute } | { ok: false; message: string }> {
  const r = await requestJson<StatsReply>("/api/institutes/stats", { body: { code } });
  if (r.kind === "error") return { ok: false, message: r.message };
  const i = r.data.institute;
  return { ok: true, institute: { code: i.code, name: i.name, seatLabel: i.seatLabel } };
}

/** Subscribes to the connected institute (updates across tabs/components). */
export function useConnectedInstitute(): ConnectedInstitute | null {
  const [inst, setInst] = useState<ConnectedInstitute | null>(null);
  useEffect(() => {
    const read = () => setInst(getInstitute());
    read();
    window.addEventListener(INSTITUTE_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(INSTITUTE_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return inst;
}

/**
 * Shows which founding institute this browser's work counts towards, and lets a
 * teacher connect with a code (or a "#connect=CODE" invite link).
 */
export function InstituteBar() {
  const inst = useConnectedInstitute();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fromHash = connectCodeFromHash(window.location.hash);
    if (!fromHash) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    void (async () => {
      setState("working");
      const r = await lookupInstitute(fromHash);
      if (r.ok) {
        setInstitute(r.institute);
        setState("idle");
      } else {
        setOpen(true);
        setCode(fromHash);
        setMessage(r.message);
        setState("error");
      }
    })();
  }, []);

  async function connect(e: FormEvent) {
    e.preventDefault();
    const c = normaliseCode(code);
    if (!c) {
      setState("error");
      setMessage("Institute codes look like HRB-7KQ4-M2XA.");
      return;
    }
    setState("working");
    const r = await lookupInstitute(c);
    if (r.ok) {
      setInstitute(r.institute);
      setOpen(false);
      setCode("");
      setState("idle");
    } else {
      setState("error");
      setMessage(r.message);
    }
  }

  if (inst) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-good/30 bg-good-tint/50 px-4 py-3 text-sm" data-testid="institute-connected">
        <p className="text-ink-soft">
          <span className="font-semibold text-ink">Connected to {inst.name}</span>
          {inst.seatLabel ? <span className="ml-2 rounded-full bg-paper-raised px-2 py-0.5 text-xs font-medium text-good">Founding institute {inst.seatLabel}</span> : null}
          <span className="block text-xs text-ink-muted">Only anonymous counts are shared with your institute — never marks or names.</span>
        </p>
        <span className="flex items-center gap-3">
          <Link href={`/institute#${inst.code}`} className="font-medium text-brand underline underline-offset-4">Institute dashboard</Link>
          <button type="button" className="text-ink-muted underline underline-offset-4 hover:text-ink" onClick={() => setInstitute(null)}>Disconnect</button>
        </span>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-line bg-paper-sunk/60 px-4 py-3 text-sm" data-testid="institute-connect">
      {state === "working" && !open ? (
        <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Connecting to your institute…</p>
      ) : !open ? (
        <p className="text-ink-soft">
          Teaching at a founding institute?{" "}
          <button type="button" className="font-medium text-brand underline underline-offset-4" onClick={() => setOpen(true)}>Enter your institute code</button>
          {" · "}
          <Link href="/founding" className="font-medium text-brand underline underline-offset-4">Register your institute (free)</Link>
        </p>
      ) : (
        <form onSubmit={connect} className="flex flex-wrap items-end gap-3" noValidate>
          <div>
            <label htmlFor="institute-code" className="field-label">Institute code</label>
            <input id="institute-code" className="field-input w-48 font-mono uppercase" placeholder="HRB-XXXX-XXXX" autoComplete="off" maxLength={20} value={code}
              aria-invalid={state === "error"} aria-describedby={state === "error" ? "institute-code-error" : undefined}
              onChange={(e) => { setCode(e.target.value); setState("idle"); }} />
          </div>
          <Button type="submit" variant="secondary" disabled={state === "working"}>{state === "working" ? (<><Spinner /> Checking…</>) : "Connect"}</Button>
          <button type="button" className="min-h-11 text-ink-muted underline underline-offset-4" onClick={() => setOpen(false)}>Cancel</button>
          {state === "error" ? <p id="institute-code-error" role="alert" className="field-error w-full">{message}</p> : null}
        </form>
      )}
    </div>
  );
}
