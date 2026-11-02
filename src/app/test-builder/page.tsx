import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader } from "@/components/ui/Primitives";
import { InstituteBar } from "@/components/founding/InstituteBar";
import { TestBuilder } from "@/components/tests/TestBuilder";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Free test builder for coaching institutes",
  description: "Make chapter-wise tests by difficulty, print shuffled sets with OMR sheets, or run them online. Every result turns into a chapter-wise teaching plan.",
  path: "/test-builder",
});

export default function TestBuilderPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Test builder", path: "/test-builder" }])} />
      <PageHeader
        eyebrow="Free tool · no sign-up"
        title="Test builder"
        lede="Build a test from your own questions by chapter and difficulty, print shuffled sets for every batch, or run it online. Results go straight into the chapter-wise analyser, so there's no setup and no re-marking."
      />
      <section className="py-10 sm:py-14">
        <div className="container max-w-4xl">
          <InstituteBar />
          <TestBuilder />
          <p className="mt-10 text-sm text-ink-muted">
            Your question bank and papers stay in this browser. Export a backup to move them. After a test, results open in the{" "}
            <Link href="/resources/class-test-analyser" className="text-brand underline underline-offset-4">class test analyser</Link> with report links for every student. To see which chapters confuse a batch before the test, keep the{" "}
            <Link href="/doubts" className="text-brand underline underline-offset-4">doubt log</Link> open in class.
          </p>
        </div>
      </section>
    </>
  );
}
