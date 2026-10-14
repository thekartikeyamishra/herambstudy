"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readConsent, writeConsent, type ConsentState } from "@/lib/client/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
const GA_VALID = /^G-[A-Z0-9]+$/.test(GA_ID);

/**
 * Loads GA4 only when a valid measurement ID is configured AND the visitor
 * explicitly accepts. Uses Consent Mode defaults of "denied"; ad storage is
 * never granted from this banner.
 */
export function Analytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentState | null | "unknown">("unknown");

  useEffect(() => {
    if (!GA_VALID) return;
    setConsent(readConsent());
    const onChange = (e: Event) => setConsent((e as CustomEvent<ConsentState>).detail);
    window.addEventListener("heramb:consent", onChange);
    return () => window.removeEventListener("heramb:consent", onChange);
  }, []);

  if (!GA_VALID) return null;
  // Personal student pages never load analytics.
  if (pathname === "/r" || pathname.startsWith("/me") || pathname.startsWith("/dev")) return null;

  return (
    <>
      {consent === "granted" ? (
        <>
          <Script id="ga-consent" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});`}
          </Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        </>
      ) : null}
      {consent === null ? (
        <div
          role="region"
          aria-label="Analytics consent"
          className="no-print fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-paper-raised p-4 shadow-lift sm:inset-x-6"
        >
          <p className="text-sm leading-relaxed text-ink-soft">
            We'd like to use privacy-limited Google Analytics to understand which pages are useful. No advertising
            cookies, and we never send names or email addresses. See our{" "}
            <Link href="/privacy#cookies" className="font-medium text-brand underline underline-offset-4">
              privacy policy
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-full bg-brand px-5 text-sm font-medium text-white hover:bg-brand-strong"
              onClick={() => writeConsent("granted")}
            >
              Allow analytics
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full border border-line-strong px-5 text-sm font-medium text-ink hover:bg-paper-sunk"
              onClick={() => writeConsent("denied")}
            >
              Decline
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
