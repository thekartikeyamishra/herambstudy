import Link from "next/link";
import { InviteBand } from "@/components/marketing/Sections";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge, PageHeader } from "@/components/ui/Primitives";
import { resources } from "@/content/resources";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Free resources for teachers and students",
  description:
    "Free tools and guides for coaching teachers and students: a readiness diagnostic, learning-gap analyser, progress report template, and guides to comparing tests and interpreting mistakes.",
  path: "/resources",
});

export default function ResourcesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }])} />
      <PageHeader
        eyebrow="Free resources"
        title="Practical tools for understanding learning."
        lede="Use them today, without an account. Every tool runs in your browser, and every guide explains its limits."
      />
      <section className="section" aria-label="All resources">
        <div className="container">
          <ul className="grid gap-5 md:grid-cols-2">
            {resources.map((r) => (
              <li key={r.slug}>
                <Link href={`/resources/${r.slug}`} className="card group flex h-full flex-col p-6 transition-shadow hover:shadow-lift sm:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.kind === "Guide" ? "neutral" : "brand"}>{r.kind}</Badge>
                    <span className="text-xs text-ink-muted">{r.readingMinutes} min</span>
                  </div>
                  <h2 className="mt-4 font-sans text-xl font-semibold group-hover:text-brand">{r.title}</h2>
                  <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">{r.summary}</p>
                  <p className="mt-4 text-sm text-ink-muted"><span className="font-medium text-ink">For:</span> {r.audience}</p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-10 max-w-2xl text-sm text-ink-muted">
            Found an error in a resource? <Link href="/contact?topic=content_error" className="font-medium text-brand underline underline-offset-4">Tell us</Link> and we'll correct it.
          </p>
        </div>
      </section>
      <InviteBand title="Want this done automatically for every test?" body="That's what we're building. Request an invite to help shape the first version." />
    </>
  );
}
