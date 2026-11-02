"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { recordUsage } from "@/lib/client/usage";
import { markDone } from "@/lib/client/onceStore";
import { decodeOnlineTest, encodeResponse, type OnlineTest } from "@/lib/tests/paper";
import { whatsappLink } from "@/lib/institute/share";
import { cn } from "@/lib/cn";

type Attempt = { roll: string; startedAt: number; answers: string[]; submitted: string | null };
const attemptKey = (t: OnlineTest) => `heramb.attempt.v1.${t.p}.${t.s}`;
const LETTERS = "ABCDE";

/** A student's online test: questions from the link, timer, and a response code for the teacher. */
export function OnlineTestView() {
  const [test, setTest] = useState<OnlineTest | null>(null);
  const [state, setState] = useState<"loading" | "invalid" | "ready">("loading");
  const [roll, setRoll] = useState("");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    void (async () => {
      const t = await decodeOnlineTest(window.location.hash);
      if (!t) return setState("invalid");
      setTest(t);
      try {
        const saved = JSON.parse(localStorage.getItem(attemptKey(t)) ?? "null") as Attempt | null;
        if (saved && typeof saved.roll === "string" && Array.isArray(saved.answers)) setAttempt(saved);
      } catch {
        /* no saved attempt */
      }
      setState("ready");
    })();
  }, []);

  const persist = useCallback((t: OnlineTest, a: Attempt) => {
    setAttempt(a);
    try {
      localStorage.setItem(attemptKey(t), JSON.stringify(a));
    } catch {
      /* private mode: the attempt still works until the tab closes */
    }
  }, []);

  const submit = useCallback(() => {
    if (!test || !attempt || attempt.submitted || submitting.current) return;
    submitting.current = true;
    const code = encodeResponse({ p: test.p, s: test.s, r: attempt.roll, a: test.q.map((_, i) => attempt.answers[i] || "-").join(""), t: Math.round((Date.now() - attempt.startedAt) / 1000), ...(test.b ? { b: test.b } : {}) });
    persist(test, { ...attempt, submitted: code });
    if (markDone("heramb.tests-taken.v1", `${test.p}.${test.s}`)) recordUsage("online_test_taken", { role: "student", code: test.c ?? null });
  }, [test, attempt, persist]);

  const deadline = test && attempt && test.d > 0 ? attempt.startedAt + test.d * 60_000 : null;
  const left = deadline ? Math.max(0, deadline - now) : null;

  useEffect(() => {
    if (!attempt || attempt.submitted) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [attempt]);
  useEffect(() => {
    if (left === 0) submit();
  }, [left, submit]);

  if (state === "loading") return <div className="min-h-[50vh]" aria-busy="true" />;
  if (state === "invalid" || !test) {
    return (
      <div className="card p-6" role="alert" data-testid="test-invalid">
        <h1 className="text-display-md">This test link is incomplete</h1>
        <p className="mt-3 text-ink-soft">The test is stored inside the link, so the whole link is needed. Ask your teacher to send it again. यह लिंक अधूरा है — शिक्षक से दोबारा भेजने को कहें।</p>
      </div>
    );
  }

  const header = (
    <header className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{test.i || "Online test"}{test.b ? ` · ${test.b}` : ""} · Set {test.s}</p>
      <h1 className="mt-1 text-display-md">{test.n}</h1>
      <p className="tabular mt-1 text-sm text-ink-soft">{test.q.length} questions · {test.d ? `${test.d} minutes` : "no time limit"} · +{test.m[0]} correct, −{test.m[1]} wrong, 0 if left blank</p>
    </header>
  );

  if (attempt?.submitted) {
    const message = `${test.n}${test.b ? ` · ${test.b}` : ""} · Set ${test.s} · Roll ${attempt.roll}\n${attempt.submitted}`;
    return (
      <div className="space-y-5" data-testid="test-submitted">
        {header}
        <section className="card border-good/40 p-5">
          <h2 className="font-sans text-lg font-semibold">Submitted ✓ Now send this code to your teacher</h2>
          <p className="mt-1 text-sm text-ink-soft">Your answers are inside this code. Your teacher's answer key is not on your phone, so marks are calculated by your teacher. उत्तर इस कोड में हैं — इसे शिक्षक को भेजें।</p>
          <p className="mt-3 break-all rounded-lg bg-paper-sunk p-3 font-mono text-xs" data-testid="response-code">{attempt.submitted}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a className="inline-flex min-h-11 items-center rounded-full bg-good px-5 text-sm font-medium text-white" href={whatsappLink(message)} target="_blank" rel="noopener">Send on WhatsApp</a>
            <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(message); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Copied ✓" : "Copy code"}</Button>
          </div>
        </section>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="space-y-5">
        {header}
        <section className="card p-5">
          <label htmlFor="roll" className="field-label">Your roll number (as your teacher uses it)</label>
          <input id="roll" className="field-input" maxLength={40} value={roll} onChange={(e) => setRoll(e.target.value)} autoComplete="off" />
          <p className="field-hint">The timer starts when you press Start. If the page reloads, your answers are kept on this phone.</p>
          <Button className="mt-4" disabled={!roll.trim()} onClick={() => persist(test, { roll: roll.trim().slice(0, 40), startedAt: Date.now(), answers: [], submitted: null })}>Start test</Button>
        </section>
      </div>
    );
  }

  const answered = attempt.answers.filter(Boolean).length;
  const mm = left !== null ? Math.floor(left / 60000) : 0;
  const ss = left !== null ? Math.floor((left % 60000) / 1000) : 0;

  return (
    <div className="space-y-5" data-testid="test-running">
      {header}
      <div className="sticky top-2 z-10 flex items-center justify-between rounded-full border border-line bg-paper-raised px-4 py-2 text-sm shadow-sm">
        <span>Roll {attempt.roll} · {answered}/{test.q.length} answered</span>
        {left !== null ? <span className={cn("tabular font-semibold", left < 60_000 ? "text-gap" : "text-ink")} role="timer" aria-live="off">{mm}:{String(ss).padStart(2, "0")}</span> : null}
      </div>
      <ol className="space-y-4">
        {test.q.map((q, i) => (
          <li key={i} className="card p-4">
            <fieldset>
              <legend className="font-medium text-ink"><span className="tabular mr-1 text-ink-muted">{i + 1}.</span>{q.t}</legend>
              <div className="mt-3 grid gap-2">
                {q.o.map((o, k) => {
                  const letter = LETTERS[k]!;
                  const checked = attempt.answers[i] === letter;
                  return (
                    <label key={k} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-3 text-[0.9375rem]", checked ? "border-brand bg-brand-tint/50" : "border-line-strong")}>
                      <input type="radio" name={`q${i}`} className="h-4 w-4" checked={checked} onChange={() => { const a = [...attempt.answers]; a[i] = letter; persist(test, { ...attempt, answers: a }); }} />
                      <span><span className="font-semibold">({letter.toLowerCase()})</span> {o}</span>
                    </label>
                  );
                })}
              </div>
              {attempt.answers[i] ? (
                <button type="button" className="mt-2 text-xs text-ink-muted underline underline-offset-4" onClick={() => { const a = [...attempt.answers]; a[i] = ""; persist(test, { ...attempt, answers: a }); }}>Clear answer</button>
              ) : null}
            </fieldset>
          </li>
        ))}
      </ol>
      <Button onClick={() => { if (window.confirm(`Submit now? ${test.q.length - answered} question(s) unanswered.`)) submit(); }}>Submit test</Button>
    </div>
  );
}
