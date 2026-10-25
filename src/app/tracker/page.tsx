import { Tracker } from "@/components/tracker/Tracker";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader } from "@/components/ui/Primitives";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Free class progress tracker for teachers",
  description:
    "Save every test for a class and see topic trends, repeating gaps and what improved since the last test. Free, no sign-up, data stays on your device.",
  path: "/tracker",
});

export default function TrackerPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Class tracker", path: "/tracker" }])} />
      <PageHeader
        eyebrow="Free tool · no sign-up"
        title="Class progress tracker"
        lede="Save each test for a class and watch the picture build up: topic trends, gaps that keep repeating, and what changed since the last test. Everything stays in this browser."
      />
      <section className="py-10 sm:py-14">
        <div className="container">
          <Tracker />
        </div>
      </section>
    </>
  );
}
