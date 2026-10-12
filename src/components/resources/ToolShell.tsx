"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { track } from "@/lib/client/analytics";

export function ToolShell({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={`${id}-title`} className="not-prose card my-10 overflow-hidden">
      <header className="flex flex-col gap-2 border-b border-line bg-brand-tint/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h2 id={`${id}-title`} className="font-sans text-lg font-semibold">{title}</h2>
        <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          Runs in your browser — nothing you enter is sent to us
        </p>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

/** Fires resource_tool_started once, and resource_tool_completed once. */
export function useToolTracking(tool: string) {
  const started = useRef(false);
  const completed = useRef(false);
  const onStart = useCallback(() => {
    if (started.current) return;
    started.current = true;
    track("resource_tool_started", { tool });
  }, [tool]);
  const onComplete = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    track("resource_tool_completed", { tool });
  }, [tool]);
  return { onStart, onComplete };
}

export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
