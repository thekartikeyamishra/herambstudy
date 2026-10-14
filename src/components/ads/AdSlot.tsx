"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { adsConfig, isAdAllowedOnPath } from "@/config/ads";
import { readConsent } from "@/lib/client/analytics";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Isolated, policy-conscious AdSense unit.
 *  - Renders NOTHING unless ads are enabled with a valid publisher + slot ID.
 *  - Only on allowed long-form resource pages (never invite/contact/legal/home).
 *  - Only after the visitor has accepted analytics/advertising consent; a full
 *    CMP (Google-certified) must be integrated before serving in the EEA/UK.
 *  - Reserves height to avoid layout shift and is clearly labelled.
 */
export function AdSlot() {
  const pathname = usePathname();
  const pushed = useRef(false);
  const [consented, setConsented] = useState(false);

  const eligible = adsConfig.enabled && adsConfig.resourceSlot !== null && isAdAllowedOnPath(pathname);

  useEffect(() => {
    if (!eligible) return;
    setConsented(readConsent() === "granted");
  }, [eligible]);

  useEffect(() => {
    if (!eligible || !consented || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blockers or script failures must never break the page */
    }
  }, [eligible, consented]);

  // Development preview of where an ad would appear (no Google script is loaded).
  // `process.env.NODE_ENV` is replaced at build time, so this block is removed from production bundles.
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ADS_PREVIEW === "true" && isAdAllowedOnPath(pathname)) {
    return (
      <aside aria-label="Advertisement preview" data-testid="ad-preview" className="no-print my-12 border-y border-line py-4">
        <p className="mb-2 text-center text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">Advertisement</p>
        <div className="flex min-h-[280px] items-center justify-center rounded-xl border-2 border-dashed border-warn/50 bg-warn-tint/40 text-sm font-medium text-warn">
          Ad slot preview — development only
        </div>
      </aside>
    );
  }

  if (!eligible || !consented) return null;

  return (
    <aside aria-label="Advertisement" className="no-print my-12 border-y border-line py-4">
      <p className="mb-2 text-center text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">Advertisement</p>
      <div style={{ minHeight: 280 }}>
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: 250 }}
          data-ad-client={adsConfig.clientId ?? undefined}
          data-ad-slot={adsConfig.resourceSlot ?? undefined}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
      <Script
        id="adsense-loader"
        strategy="lazyOnload"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsConfig.clientId}`}
      />
    </aside>
  );
}
