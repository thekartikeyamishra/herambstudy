import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { Callout, PageHeader } from "@/components/ui/Primitives";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Our approach: assessment limits, AI and privacy",
  description:
    "How Heramb.study approaches assessment limitations, AI-assisted question review, privacy, and reporting incorrect questions — including what we have not done yet.",
  path: "/trust",
});

export default function TrustPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Our approach", path: "/trust" }])} />
      <PageHeader
        eyebrow="Our approach"
        title="What we promise — and what we don't."
        lede="Trust is earned by being specific. Here is how we think about assessment, AI-assisted content and your data, including the limits."
      />
      <section className="section">
        <div className="container max-w-3xl">
          <div className="prose-heramb max-w-none">
            <h2>Assessments have limits</h2>
            <p>
              A test measures performance on particular questions on a particular day. It's evidence, not a verdict.
              In everything we build, we try to respect that:
            </p>
            <ul>
              <li>Topics with very few questions are flagged as weak evidence rather than labelled as gaps.</li>
              <li>Small differences between two tests are shown as "no clear change", not as progress or decline.</li>
              <li>Mistake types are suggestions for a teacher to confirm, not automatic diagnoses.</li>
              <li>We never present a predicted exam score, rank or admission chance.</li>
            </ul>

            <h2>AI-assisted content is reviewed</h2>
            <p>
              We may use AI tools to help draft practice questions, explanations or hints. AI can produce questions that
              are ambiguous, have no correct answer, or contain subtle errors. Our planned process is:
            </p>
            <ol>
              <li>Every AI-assisted question is checked by a person with subject knowledge before students see it.</li>
              <li>Answers and worked solutions are verified independently, not just accepted from the draft.</li>
              <li>Each question carries a version history, so corrections are traceable.</li>
              <li>Questions that receive reports are withdrawn from practice sets while they're reviewed.</li>
            </ol>
            <p>
              Review reduces errors; it cannot guarantee there are none. That's why reporting is built in.
            </p>

            <h2>How to report an incorrect question</h2>
            <p>
              In the learning app, every question will have a "Report a problem" option. Until then — and for anything
              on this website — please use the <Link href="/contact?topic=content_error">contact form</Link> and choose
              "Report an error in our content". Tell us where you saw it and what's wrong. We correct confirmed errors
              and update the "last reviewed" date on affected resources.
            </p>

            <h2>Privacy principles</h2>
            <ul>
              <li><strong>Collect less.</strong> The invite form asks only what we need to prioritise invitations.</li>
              <li><strong>No selling, no ad profiling.</strong> We don't sell personal data. There are no ads in the invite flow or the learning app.</li>
              <li><strong>Students see their own data.</strong> Teachers see only their own batches.</li>
              <li><strong>Deletion on request.</strong> You can ask us to delete your data at any time.</li>
              <li><strong>Server-side controls.</strong> Our database denies all direct browser access; every write is validated on our servers.</li>
            </ul>
            <p>Full details are in the <Link href="/privacy">privacy policy</Link>.</p>
          </div>

          <Callout tone="warn" title="What we haven't done yet" className="mt-12">
            We have not had an independent security audit or any certification (such as ISO 27001 or SOC 2), and we
            don't claim any. We'll update this page if and when that changes.
          </Callout>
        </div>
      </section>
    </>
  );
}
