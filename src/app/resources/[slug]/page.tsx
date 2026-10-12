import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ads/AdSlot";
import { InviteBand } from "@/components/marketing/Sections";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge, Callout } from "@/components/ui/Primitives";
import { siteConfig } from "@/config/site";
import { articles } from "@/content/articles";
import { getResource, resources } from "@/content/resources";
import { articleJsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return resources.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const r = getResource(slug);
  if (!r) return {};
  return buildMetadata({
    title: r.title,
    description: r.summary,
    path: `/resources/${r.slug}`,
    type: "article",
    publishedTime: r.published,
    modifiedTime: r.reviewed,
  });
}

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function ResourcePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const r = getResource(slug);
  const article = articles[slug];
  if (!r || !article) notFound();

  const path = `/resources/${r.slug}`;
  const related = r.related.map(getResource).filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <>
      <JsonLd data={articleJsonLd({ title: r.title, description: r.summary, path, published: r.published, reviewed: r.reviewed })} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Resources", path: "/resources" },
          { name: r.title, path },
        ])}
      />
      <article>
        <header className="border-b border-line">
          <div className="container max-w-4xl pb-10 pt-10 sm:pt-14">
            <nav aria-label="Breadcrumb" className="no-print text-sm text-ink-muted">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li><Link href="/" className="hover:text-ink">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href="/resources" className="hover:text-ink">Resources</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="truncate text-ink-soft">{r.kind}</li>
              </ol>
            </nav>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge tone={r.kind === "Guide" ? "neutral" : "brand"}>{r.kind}</Badge>
              <span className="text-sm text-ink-muted">{r.readingMinutes} min read</span>
            </div>
            <h1 className="mt-4 text-display-lg">{r.title}</h1>
            <p className="lede mt-4">{r.summary}</p>
            <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold text-ink">Who it's for</dt><dd className="mt-1 text-ink-soft">{r.audience}</dd></div>
              <div><dt className="font-semibold text-ink">What it helps with</dt><dd className="mt-1 text-ink-soft">{r.purpose}</dd></div>
              <div>
                <dt className="font-semibold text-ink">Written by</dt>
                <dd className="mt-1 text-ink-soft">
                  {siteConfig.name} editorial team{siteConfig.operatorName ? ` (${siteConfig.operatorName})` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Last reviewed</dt>
                <dd className="mt-1 text-ink-soft"><time dateTime={r.reviewed}>{fmt(r.reviewed)}</time></dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="container max-w-4xl py-12">
          <div className="prose-heramb mx-auto max-w-none">{article.body}</div>

          <AdSlot />

          <div className="mx-auto mt-12 max-w-prose space-y-8">
            <Callout tone="warn" title="Limitations">
              {article.limitations}
            </Callout>
            {article.sources.length ? (
              <section aria-labelledby="sources-title">
                <h2 id="sources-title" className="font-sans text-lg font-semibold">Sources</h2>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
                  {article.sources.map((s) => (
                    <li key={s.label}>
                      {s.label}{" "}
                      {s.href ? <a href={s.href} rel="noopener" className="text-brand underline underline-offset-4">{s.href.replace("https://", "")}</a> : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            <p className="text-sm text-ink-muted">
              Spotted an error? <Link href="/contact?topic=content_error" className="font-medium text-brand underline underline-offset-4">Report it</Link> — we correct mistakes and update the review date.
            </p>
          </div>
        </div>
      </article>

      {related.length ? (
        <section className="no-print border-t border-line bg-paper-sunk/50 py-14" aria-labelledby="related-title">
          <div className="container max-w-4xl">
            <h2 id="related-title" className="text-display-md">Related resources</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {related.map((x) => (
                <li key={x.slug}>
                  <Link href={`/resources/${x.slug}`} className="card group block h-full p-5 hover:shadow-lift">
                    <Badge tone={x.kind === "Guide" ? "neutral" : "brand"}>{x.kind}</Badge>
                    <p className="mt-3 font-semibold group-hover:text-brand">{x.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-8"><Link href="/resources" className="font-medium text-brand underline underline-offset-4">← Back to all resources</Link></p>
          </div>
        </section>
      ) : null}
      <div className="no-print"><InviteBand /></div>
    </>
  );
}
