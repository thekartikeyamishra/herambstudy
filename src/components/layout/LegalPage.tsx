import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const updated = new Date(`${siteConfig.legalLastUpdated}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <section className="py-12 sm:py-16">
      <div className="container max-w-3xl">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 text-display-lg">{title}</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Last updated: <time dateTime={siteConfig.legalLastUpdated}>{updated}</time>
        </p>
        <div role="note" className="mt-6 rounded-2xl border border-warn/30 bg-warn-tint/70 px-5 py-4 text-sm leading-relaxed text-ink-soft">
          <strong className="text-ink">Draft pending legal review.</strong> This document describes how this website
          actually works today. It has not yet been reviewed by a lawyer, and items in [square brackets] must be
          completed by the operator before public launch.
        </div>
        <div className="prose-heramb mt-10 max-w-none">{children}</div>
      </div>
    </section>
  );
}

export function operatorLabel(): string {
  return siteConfig.operatorName ?? "[OPERATOR LEGAL NAME — to be completed before launch]";
}

export function contactLabel(): string {
  return siteConfig.contactEmail ?? "[CONTACT EMAIL — to be completed before launch]";
}
