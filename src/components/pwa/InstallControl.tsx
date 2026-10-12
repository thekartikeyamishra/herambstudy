"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/client/analytics";
import { cn } from "@/lib/cn";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState = "checking" | "available" | "ios" | "installed" | "unavailable";

export function detectIos(userAgent: string, maxTouchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/**
 * Web-app install control. Never forces or fakes a prompt:
 *  - Chromium browsers: uses the real beforeinstallprompt event ("Install Web App").
 *  - iOS/iPadOS Safari: no install API exists, so we explain "Add to Home Screen".
 *  - Everywhere else: states plainly that installation isn't available here.
 */
export function InstallControl({ inverse = false }: { inverse?: boolean }) {
  const [state, setState] = useState<InstallState>("checking");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setState("installed");
      return;
    }
    setState(detectIos(navigator.userAgent, navigator.maxTouchPoints ?? 0) ? "ios" : "unavailable");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setState("available");
      track("pwa_install_prompt_shown", { platform: "chromium" });
    };
    const onInstalled = () => {
      setState("installed");
      setDeferred(null);
      track("pwa_install_completed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const btn = cn(
    "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
    inverse ? "border-white/25 text-white hover:bg-white/10" : "border-line-strong text-ink hover:bg-paper-sunk",
  );
  // min-h keeps the height identical to the pre-hydration placeholder (no layout shift).
  const note = cn("flex min-h-11 items-center text-sm", inverse ? "text-white/65" : "text-ink-muted");

  if (state === "checking") return <div className="min-h-11" aria-hidden="true" />;

  if (state === "installed") {
    return <p className={note} data-testid="install-state">Installed on this device.</p>;
  }

  if (state === "available" && deferred) {
    return (
      <button
        type="button"
        className={btn}
        data-testid="install-button"
        onClick={async () => {
          await deferred.prompt();
          const choice = await deferred.userChoice;
          if (choice.outcome !== "accepted") return;
          setDeferred(null);
        }}
      >
        <DownloadIcon />
        Install Web App
      </button>
    );
  }

  if (state === "ios") {
    return (
      <div>
        <button type="button" className={btn} aria-expanded={showIosHelp} onClick={() => setShowIosHelp((v) => !v)}>
          <DownloadIcon />
          Add to Home Screen
        </button>
        {showIosHelp ? (
          <div className={cn("mt-3 max-w-sm rounded-xl border p-3 text-sm", inverse ? "border-white/20 text-white/80" : "border-line text-ink-soft")}>
            <p>
              In Safari, tap the <strong>Share</strong> button, then choose <strong>Add to Home Screen</strong>. Some
              iOS versions and browsers may not offer this option.
            </p>
            <button type="button" className="mt-2 text-sm font-medium underline underline-offset-4" onClick={() => setShowIosHelp(false)}>
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <p className={note} data-testid="install-state">
      Web-app installation isn't available in this browser. The site works fully in your browser.
    </p>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
