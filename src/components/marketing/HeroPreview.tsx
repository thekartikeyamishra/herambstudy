"use client";

import { useEffect, useState } from "react";
import { sampleStudent, statusFor, workflowSteps } from "@/content/sampleData";
import { cn } from "@/lib/cn";

const STEP_MS = 3200;

const stageNotes: Record<string, { title: string; body: string }> = {
  assess: { title: "Unit test 3 marked", body: "Each question is tagged to a topic, so marks become a topic map." },
  diagnose: { title: "Gap found: Rotational motion", body: "41% — most errors are conceptual (torque direction), not careless." },
  practise: { title: "12 targeted questions assigned", body: "Only the two weakest topics, about 25 minutes of work." },
  verify: { title: "Follow-up check, 3 weeks later", body: "Rotational motion moves from 41% to 63% on comparable questions." },
  improve: { title: "Next step suggested", body: "Keep practising rotation; Gravitation dipped slightly under time pressure." },
};

const barTone = {
  secure: "bg-good",
  developing: "bg-warn",
  gap: "bg-gap",
} as const;

/**
 * Animated, original product concept preview. Uses fictional data and is
 * clearly labelled. Auto-advance can be paused (WCAG 2.2.2) and is disabled
 * entirely for people who prefer reduced motion.
 */
export function HeroPreview() {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      if (mq.matches) setPlaying(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setStage((s) => (s + 1) % workflowSteps.length), STEP_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  const current = workflowSteps[stage] ?? workflowSteps[0];
  const showAfter = stage >= 3;
  const note = stageNotes[current.key] ?? stageNotes.assess!;

  return (
    <figure className="relative" aria-labelledby="hero-preview-caption">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand/10 via-transparent to-good/10 blur-2xl" aria-hidden="true" />
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-sunk/70 px-4 py-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </div>
          <span className="truncate text-xs font-medium text-ink-muted">Concept preview · fictional data</span>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-medium text-ink-soft hover:bg-paper"
            aria-label={playing ? "Pause preview animation" : "Play preview animation"}
            disabled={reduced}
          >
            {playing ? "Pause" : "Play"}
          </button>
        </div>

        {/* Stepper */}
        <ol className="grid grid-cols-5 border-b border-line text-center" aria-label="Workflow stages">
          {workflowSteps.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => {
                  setStage(i);
                  setPlaying(false);
                }}
                aria-current={i === stage ? "step" : undefined}
                className={cn(
                  "relative w-full px-1 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider transition-colors sm:text-xs",
                  i === stage ? "text-brand" : "text-ink-muted hover:text-ink",
                )}
              >
                {s.title}
                <span
                  className={cn(
                    "absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors",
                    i === stage ? "bg-brand" : i < stage ? "bg-brand/30" : "bg-transparent",
                  )}
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ol>

        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{sampleStudent.name}</p>
            <p className="text-xs text-ink-muted">{showAfter ? "Before → after" : "Unit test 3"}</p>
          </div>

          <ul className="mt-4 space-y-3" aria-label="Topic results (fictional)">
            {sampleStudent.topics.map((t) => {
              const value = showAfter ? t.after : t.before;
              const st = statusFor(value);
              const highlight = stage === 1 && t.topic === "Rotational motion";
              return (
                <li key={t.topic} className={cn("rounded-lg transition-colors", highlight && "bg-gap-tint/70 ring-1 ring-gap/30")}>
                  <div className="flex items-center justify-between gap-3 px-1 text-[0.8125rem]">
                    <span className="truncate text-ink-soft">{t.topic}</span>
                    <span className="tabular shrink-0 font-semibold text-ink">
                      {showAfter ? (
                        <>
                          <span className="font-normal text-ink-muted">{t.before}% → </span>
                          {t.after}%
                        </>
                      ) : (
                        `${t.before}%`
                      )}
                    </span>
                  </div>
                  <div className="mx-1 mt-1.5 h-2 overflow-hidden rounded-full bg-paper-sunk">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-700 ease-calm", barTone[st])}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <div key={current.key} className="animate-rise mt-5 rounded-xl border border-line bg-paper px-4 py-3" aria-live="polite">
            <p className="text-sm font-semibold text-ink">{note.title}</p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-soft">{note.body}</p>
          </div>
        </div>
      </div>
      <figcaption id="hero-preview-caption" className="mt-3 text-center text-xs text-ink-muted">
        Illustrative concept of the planned product. Student, topics and numbers are fictional.
      </figcaption>
    </figure>
  );
}
