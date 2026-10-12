"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Honest language selector. Only English content exists today; Hindi and German
 * are listed as planned and cannot be selected, so we never imply a language is
 * supported when only navigation is translated.
 */
const languages = [
  { code: "en", label: "English", native: "English", status: "available" as const },
  { code: "hi", label: "Hindi", native: "हिन्दी", status: "in preparation" as const },
  { code: "de", label: "German", native: "Deutsch", status: "planned" as const },
];

export function LanguageMenu({ fullWidth = false }: { fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative", fullWidth && "w-full")}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Language: English. Change language"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-3.5 text-sm text-ink-soft hover:bg-ink/5",
          fullWidth && "w-full justify-between",
        )}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M1.5 8h13M8 1.5c2 2.2 2 10.8 0 13M8 1.5c-2 2.2-2 10.8 0 13" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        EN
      </button>
      <div
        id={menuId}
        hidden={!open}
        className={cn(
          "absolute z-50 mt-2 w-64 rounded-2xl border border-line bg-paper-raised p-2 shadow-lift",
          fullWidth ? "left-0 right-0 w-auto" : "right-0",
        )}
      >
        <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-ink-muted">Language</p>
        <ul>
          {languages.map((lang) => (
            <li key={lang.code}>
              <div
                lang={lang.code}
                aria-current={lang.status === "available" ? "true" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm",
                  lang.status === "available" ? "bg-brand-tint/60 font-medium text-ink" : "text-ink-muted",
                )}
              >
                <span>{lang.native}</span>
                <span className="text-xs" lang="en">
                  {lang.status === "available" ? "Current" : lang.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="px-3 pb-2 pt-2 text-xs leading-relaxed text-ink-muted">
          We'll add a language only when its full content is ready — not just the menus.
        </p>
      </div>
    </div>
  );
}
