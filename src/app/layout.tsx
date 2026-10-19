import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@/components/analytics/Analytics";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/config/site";
import { fontDisplay, fontSans } from "@/fonts";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Heramb", statusBarStyle: "default" },
  ...(siteConfig.googleSiteVerification
    ? { verification: { google: siteConfig.googleSiteVerification } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#FAF8F4",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. Scribe, Grammarly) add attributes to <html>
    // and <body> before React loads. This ignores attribute differences on these two elements only —
    // real mismatches in the page content are still reported.
    <html lang="en-IN" className={`${fontSans.variable} ${fontDisplay.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  );
}
