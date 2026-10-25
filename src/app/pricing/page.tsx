import Link from "next/link";
import { FaqList } from "@/components/marketing/Sections";
import { JsonLd } from "@/components/seo/JsonLd";
import { LinkButton } from "@/components/ui/Button";
import { Badge, PageHeader, SectionHeading } from "@/components/ui/Primitives";
import { FEATURES, GUARANTEES, PLANS } from "@/config/plans";
import { formatPrice } from "@/lib/entitlements";
import { getProvider } from "@/lib/ai/providers";
import { cn } from "@/lib/cn";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Plans and pricing",
  description:
    "Free tools stay free. Paid plans add full-year batch history, cloud sync, parent reports and multi-teacher workspaces. Your data is always exportable.",
  path: "/pricing",
});

const availabilityBadge = {
  available: null,
  pilot: <Badge tone="brand">Pilot</Badge>,
  planned: <Badge tone="neutral">Planned</Badge>,
} as const;

const ctaFor = {
  free: { href: "/resources/class-test-analyser", label: "Start free now" },
  teacher: { href: "/invite", label: "Request early access" },
  institute: { href: "/pilot", label: "Apply for a free pilot" },
  network: { href: "/contact?topic=institute_pilot", label: "Talk to us" },
} as const;

export default function PricingPage() {
  // AI summaries are only "available" when a provider is actually configured on this deployment.
  const aiOn = getProvider() !== null;
  const badgeFor = (f: keyof typeof FEATURES) =>
    f === "ai_summaries" && !aiOn ? availabilityBadge.planned : availabilityBadge[FEATURES[f].availability];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }])} />
      <PageHeader
        eyebrow="Plans"
        title="Free to start. Worth more every term."
        lede="Everything that's free today stays free. Paid plans add what an institution needs to run on Heramb all year: history in the cloud, every teacher in one place, and reports that reach parents."
      />

      <section className="section" aria-label="Plans">
        <div className="container">
          <ul className="grid gap-5 lg:grid-cols-4">
            {PLANS.map((p) => (
              <li key={p.id} className={cn("card flex flex-col p-6", p.highlight && "border-brand ring-1 ring-brand/30")}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-sans text-xl font-semibold">{p.name}</h2>
                  {p.highlight ? <Badge tone="brand">For institutions</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-ink-muted">{p.forWho}</p>
                <p className="mt-4 text-lg font-semibold text-ink">{formatPrice(p)}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-soft">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start justify-between gap-2">
                      <span className="flex gap-2">
                        <svg className="mt-0.5 shrink-0 text-good" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="m3 8.5 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {FEATURES[f].label}
                      </span>
                      {badgeFor(f)}
                    </li>
                  ))}
                  {aiOn ? <li className="pt-1 text-xs text-ink-muted">AI summaries: {p.aiPerDay} per day</li> : null}
                </ul>
                <LinkButton href={ctaFor[p.id].href} variant={p.id === "free" || p.highlight ? "primary" : "secondary"} className="mt-6 w-full">
                  {ctaFor[p.id].label}
                </LinkButton>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-muted">
            “Planned” features are not available yet; “Pilot” features are being tested with pilot partners. Prices for paid plans will be
            published after pilots — pilot partners hear first. Nothing is charged without a written agreement.
          </p>
        </div>
      </section>

      <section className="section border-y border-line bg-paper-raised" aria-labelledby="why-stay">
        <div className="container grid gap-12 lg:grid-cols-2">
          <SectionHeading
            id="why-stay"
            eyebrow="Why institutions stay"
            title="The longer you use it, the more it knows about your classes."
            lede="Every test you add builds a history no spreadsheet keeps: which topics improved, which students keep repeating the same gap, and how each batch compares with last year's."
          />
          <ul className="space-y-4 self-end text-ink-soft">
            {[
              ["Term and year reports", "Each student's progress across every test — richer with every test you add."],
              ["Your weekly routine", "Reteach groups after each test, parent notes and follow-up checks become how your teachers work."],
              ["Everyone in one place", "Teachers and students already share one picture through personal report links; the principal view and parent delivery come with paid plans."],
              ["Proof for admissions", "Verified, year-on-year progress you can show prospective parents."],
            ].map(([t, d]) => (
              <li key={t}><strong className="text-ink">{t}.</strong> {d}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="promises">
        <div className="container max-w-3xl">
          <h2 id="promises" className="text-display-md">Our promises, on every plan</h2>
          <ul className="mt-6 space-y-3 text-ink-soft">
            {GUARANTEES.map((g) => (
              <li key={g} className="flex gap-3">
                <svg className="mt-1 shrink-0 text-good" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="m3 8.5 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {g}
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <FaqList
              items={[
                { q: "Will the free tools really stay free?", a: <p>Yes. They run in your browser and cost us almost nothing to provide, so there's no reason to take them away. Paid plans add new things on top.</p> },
                { q: "Why pay at all if the tools are free?", a: <p>Free tools work one class, one device at a time. Paid plans keep every class's history safely in the cloud, bring all teachers together, send reports to parents and give the principal one view of the whole institution.</p> },
                { q: "What happens to our data if we stop?", a: <p>You can export your data at any time, on every plan. Free tools keep working whatever you decide, and the data you saved in your browser stays on your device.</p> },
                { q: "How is the price decided?", a: <p>Pilot partners tell us what's fair for their size. We'll publish simple prices after pilots, with term and annual options.</p> },
                { q: "Do you use AI? Is it expensive?", a: <p>AI only writes summaries from your numbers — the analysis itself is done by Heramb's own rules, so results are consistent. If AI is unavailable, you still get an instant summary.</p> },
              ]}
            />
          </div>
          <p className="mt-8 text-sm text-ink-muted">
            Questions about plans? <Link href="/contact" className="font-medium text-brand underline underline-offset-4">Contact us</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
