import Link from "next/link";
import { PilotForm } from "@/components/forms/PilotForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { Callout } from "@/components/ui/Primitives";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Apply for an institute pilot",
  description:
    "Apply for a small, free Heramb.study pilot for your coaching institute, school or college: one class, one subject, one full assess-to-verify cycle, reviewed together.",
  path: "/pilot",
});

const included = [
  ["One class, one subject", "Start small with tests you already run."],
  ["A full cycle in 4–6 weeks", "Gap map after a test, reteach groups, targeted practice and a follow-up check."],
  ["Reports you can share", "Topic-level progress for students and parents."],
  ["An honest review", "What changed, what didn't, and whether it's worth continuing."],
];

export default function PilotPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "For institutes", path: "/for-institutes" }, { name: "Pilot", path: "/pilot" }])} />
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_60%)]" aria-hidden="true" />
        <div className="container relative grid gap-12 py-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-20">
          <div>
            <p className="eyebrow">For coaching institutes, schools and colleges</p>
            <h1 className="mt-3 text-display-lg">Apply for a pilot</h1>
            <p className="lede mt-5">
              We're running a small number of pilots — starting with JEE/NEET coaching centres, and now open to schools
              and colleges — to learn what genuinely helps teachers and students before we build at scale.
            </p>
            <h2 className="mt-10 font-sans text-base font-semibold">What a pilot includes</h2>
            <ul className="mt-4 space-y-4">
              {included.map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <svg className="mt-1 shrink-0 text-good" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="m3 8.5 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span><strong className="text-ink">{t}.</strong> <span className="text-ink-soft">{d}</span></span>
                </li>
              ))}
            </ul>
            <Callout tone="neutral" className="mt-8" title="Honest terms">
              Places are limited by our capacity to support each pilot well. We can't guarantee acceptance, we don't
              promise improved results, and nothing is charged without a written agreement you've signed.
            </Callout>
            <p className="mt-6 text-sm text-ink-muted">
              Not ready to apply? Try the{" "}
              <Link href="/resources/class-test-analyser" className="font-medium text-brand underline underline-offset-4">free class test analyser</Link>{" "}
              on your last test, or <Link href="/contact?topic=institute_pilot" className="font-medium text-brand underline underline-offset-4">ask a question</Link>.
            </p>
          </div>
          <PilotForm />
        </div>
      </section>
    </>
  );
}
