import Link from "next/link";
import type { ReactNode } from "react";
import { FaqList, FeatureCard, Icon, InviteBand, type Faq } from "@/components/marketing/Sections";
import { JsonLd } from "@/components/seo/JsonLd";
import { LinkButton } from "@/components/ui/Button";
import { Callout, PageHeader, SectionHeading } from "@/components/ui/Primitives";
import { breadcrumbJsonLd } from "@/lib/seo";

export type AudienceContent = {
  path: string;
  crumb: string;
  pilotType: "school" | "college";
  eyebrow: string;
  title: string;
  lede: string;
  features: Array<{ title: string; icon: string; body: ReactNode }>;
  steps: Array<{ t: string; d: string }>;
  whyNow: string[];
  fitNote: ReactNode;
  faqs: Faq[];
};

/** Shared layout for /for-schools and /for-colleges. */
export function AudiencePage({ c }: { c: AudienceContent }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: c.crumb, path: c.path }])} />
      <PageHeader eyebrow={c.eyebrow} title={c.title} lede={c.lede}>
        <div className="flex flex-col gap-3 xs:flex-row">
          <LinkButton href={`/pilot?type=${c.pilotType}`} size="lg">Apply for a free pilot</LinkButton>
          <LinkButton href="/resources/class-test-analyser" size="lg" variant="secondary">Try it on your last test</LinkButton>
        </div>
      </PageHeader>

      <section className="section" aria-labelledby="aud-features">
        <div className="container">
          <SectionHeading id="aud-features" eyebrow="What you get" title="From marks you already have to a clear next step." />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {c.features.map((f) => (
              <FeatureCard key={f.title} title={f.title} icon={<Icon d={f.icon} />}>{f.body}</FeatureCard>
            ))}
          </div>
          <Callout tone="neutral" className="mt-8 max-w-3xl">{c.fitNote}</Callout>
        </div>
      </section>

      <section className="section border-y border-line bg-paper-raised" aria-labelledby="aud-pilot">
        <div className="container grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="aud-pilot" eyebrow="The pilot" title="One class. One subject. One month." lede="No purchase, no new software, nothing to replace. You can stop at any time and keep your data." />
            <ol className="mt-8 space-y-4">
              {c.steps.map((s, i) => (
                <li key={s.t} className="flex gap-4">
                  <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint font-semibold text-brand">{i + 1}</span>
                  <span><strong className="text-ink">{s.t}.</strong> <span className="text-ink-soft">{s.d}</span></span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-display-md">Why it makes sense to start now</h2>
            <ul className="mt-6 space-y-4 text-ink-soft">
              {c.whyNow.map((w) => (
                <li key={w} className="flex gap-3">
                  <svg className="mt-1 shrink-0 text-good" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="m3 8.5 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {w}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <LinkButton href={`/pilot?type=${c.pilotType}`}>Apply for a pilot</LinkButton>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="aud-faq">
        <div className="container grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            id="aud-faq"
            eyebrow="Honest answers"
            title="Every question we've been asked."
            lede={<>Something else? <Link href="/contact?topic=institute_pilot" className="font-medium text-brand underline underline-offset-4">Ask us directly</Link>.</>}
          />
          <FaqList items={c.faqs} />
        </div>
      </section>
      <InviteBand title="Try it for one class. Keep it only if it helps." body="The pilot is free, uses tests you already run, and you can stop at any time. Nothing is charged without a written agreement." />
    </>
  );
}
