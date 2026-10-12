import Link from "next/link";
import { InviteBand } from "@/components/marketing/Sections";
import { JsonLd } from "@/components/seo/JsonLd";
import { Callout, PageHeader } from "@/components/ui/Primitives";
import { siteConfig } from "@/config/site";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "About",
  description: `Why ${siteConfig.name} exists, who it's for, how we're building it, and who operates it.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])} />
      <PageHeader eyebrow="About" title={siteConfig.tagline} lede={siteConfig.supportingLine} />
      <section className="section">
        <div className="container max-w-3xl">
          <div className="prose-heramb max-w-none">
            <h2>Why we're building this</h2>
            <p>
              In most coaching classrooms, tests happen constantly — weekly, sometimes daily. Yet the main thing a test
              produces is a number and a rank. The information that would help a teacher decide what to do on Monday —
              which students are stuck on which topic, and why — usually stays buried in the answer sheets.
            </p>
            <p>
              Heramb.study exists to bring that information to the surface, help students practise what actually
              matters, and make real progress visible to the people who care about it.
            </p>
            <h2>The name</h2>
            <p>
              <strong>{siteConfig.acronym}</strong> stands for <strong>{siteConfig.acronymExpansion}</strong> — the things
              we think a learning platform should be accountable for.
            </p>
            <h2>How we're building it</h2>
            <ul>
              <li><strong>Evidence before scale.</strong> We start with small invite-only pilots, initially with JEE and NEET coaching centres in India.</li>
              <li><strong>No inflated claims.</strong> We don't promise better marks or admissions. We'll report what pilots actually show.</li>
              <li><strong>Useful before it's finished.</strong> Our <Link href="/resources">free resources</Link> are meant to help teachers and students today.</li>
              <li><strong>Privacy by default.</strong> We collect as little as we can and never sell personal data. See <Link href="/trust">our approach</Link>.</li>
            </ul>
            <h2>Who it's for</h2>
            <p>
              Coaching institute owners and teachers, private tutors, and the students they teach. Later, and only where
              there's demand, tutors and learning centres outside India.
            </p>
            <h2>Who operates {siteConfig.name}</h2>
          </div>
          {siteConfig.operatorName ? (
            <p className="mt-4 text-ink-soft">
              {siteConfig.name} is operated by <strong className="text-ink">{siteConfig.operatorName}</strong>. Contact us via the{" "}
              <Link href="/contact" className="font-medium text-brand underline underline-offset-4">contact page</Link>.
            </p>
          ) : (
            <Callout tone="warn" className="mt-4">
              Operator details will be published here before public launch. In the meantime, you can reach us through the{" "}
              <Link href="/contact" className="font-medium text-brand underline underline-offset-4">contact page</Link>.
            </Callout>
          )}
          <p className="mt-6 text-sm text-ink-muted">
            "{siteConfig.name}" is a proposed product name. Trademark and other clearances are still being completed.
          </p>
        </div>
      </section>
      <InviteBand />
    </>
  );
}
