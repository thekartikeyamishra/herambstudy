import type { ReactNode } from "react";
import { workflowSteps } from "@/content/sampleData";
import { cn } from "@/lib/cn";

const icons: Record<string, ReactNode> = {
  assess: <path d="M6 4h12v16H6zM9 9h6M9 13h6M9 17h3" />,
  diagnose: <path d="M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Zm4.6-1.9L20 20M8 10.5h5M10.5 8v5" />,
  practise: <path d="M5 19 19 5M14 5h5v5M5 9V5h4" />,
  verify: <path d="M4 12.5 9 17.5 20 6.5" />,
  improve: <path d="M4 18 10 12l4 4 6-8M15 8h5v5" />,
};

/** The ASSESS → DIAGNOSE → PRACTISE → VERIFY → IMPROVE loop as an accessible ordered list. */
export function WorkflowDiagram({ dark = false, detailed = false }: { dark?: boolean; detailed?: boolean }) {
  return (
    <div>
      <ol className="grid gap-3 md:grid-cols-5 md:gap-0">
        {workflowSteps.map((step, i) => (
          <li key={step.key} className="relative md:px-2">
            {i < workflowSteps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-7 top-14 h-[calc(100%-2.5rem)] w-px md:left-[calc(50%+1.75rem)] md:top-7 md:h-px md:w-[calc(100%-3.5rem)]",
                  dark ? "bg-white/20" : "bg-line-strong",
                )}
              />
            ) : null}
            <div className="flex gap-4 md:flex-col md:items-center md:text-center">
              <span
                className={cn(
                  "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border",
                  dark ? "border-white/15 bg-night-raised text-white" : "border-line bg-paper-raised text-brand shadow-card",
                )}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {icons[step.key]}
                </svg>
              </span>
              <div className="pb-4 md:pb-0 md:pt-4">
                <p className={cn("text-xs font-semibold uppercase tracking-[0.14em]", dark ? "text-white/50" : "text-ink-muted")}>
                  Step {i + 1}
                </p>
                <h3 className={cn("mt-1 font-sans text-lg font-semibold", dark ? "text-white" : "text-ink")}>{step.title}</h3>
                <p className={cn("mt-1 text-[0.9375rem] leading-relaxed", dark ? "text-white/70" : "text-ink-soft")}>
                  {detailed ? step.detail : step.short}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className={cn("mt-6 flex items-center gap-2 text-sm md:justify-center", dark ? "text-white/60" : "text-ink-muted")}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M14.5 9a5.5 5.5 0 1 1-1.6-3.9M14.5 3v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Then the loop repeats with the next topic.
      </p>
    </div>
  );
}
