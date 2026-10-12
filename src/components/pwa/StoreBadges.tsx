"use client";

import { siteConfig } from "@/config/site";
import { track } from "@/lib/client/analytics";
import { cn } from "@/lib/cn";

type Store = "google_play" | "app_store";

const stores: Array<{ id: Store; top: string; name: string; url: string | null }> = [
  { id: "google_play", top: "Android app", name: "Google Play", url: siteConfig.stores.googlePlay },
  { id: "app_store", top: "iPhone & iPad app", name: "App Store", url: siteConfig.stores.appStore },
];

function StoreIcon({ id }: { id: Store }) {
  // Generic, original glyphs — official store artwork is only used once real listings exist.
  return id === "google_play" ? (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" fill="none">
      <path d="M6 3.5v15l12-7.5-12-7.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" fill="none">
      <rect x="6" y="2.5" width="10" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 16.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Future native app badges.
 * Without a configured https URL they are non-navigating, aria-disabled buttons
 * that say "Coming soon". With a URL they automatically become real links.
 */
export function StoreBadges({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  const shell = cn(
    "inline-flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2 text-left transition-colors",
    inverse ? "border-white/20 text-white" : "border-line-strong text-ink",
  );

  return (
    <ul className={cn("flex flex-wrap gap-3", className)} aria-label="Native mobile apps">
      {stores.map((s) =>
        s.url ? (
          <li key={s.id}>
            <a href={s.url} rel="noopener" target="_blank" className={cn(shell, inverse ? "hover:bg-white/10" : "hover:bg-paper-sunk")}>
              <StoreIcon id={s.id} />
              <span className="leading-tight">
                <span className="block text-[0.6875rem] opacity-75">Get it on</span>
                <span className="block text-sm font-semibold">{s.name}</span>
              </span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ) : (
          <li key={s.id}>
            <button
              type="button"
              aria-disabled="true"
              data-testid={`store-${s.id}`}
              onClick={() => track("app_store_coming_soon_clicked", { store: s.id })}
              className={cn(shell, "cursor-not-allowed opacity-80")}
            >
              <StoreIcon id={s.id} />
              <span className="leading-tight">
                <span className="block text-[0.6875rem] opacity-75">{s.top} on {s.name}</span>
                <span className="block text-sm font-semibold">Coming soon</span>
              </span>
            </button>
          </li>
        ),
      )}
    </ul>
  );
}
