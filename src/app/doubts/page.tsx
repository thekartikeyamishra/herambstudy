import { DoubtLog } from "@/components/doubts/DoubtLog";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader } from "@/components/ui/Primitives";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Free doubt log and chapter heatmap for teachers",
  description: "Log students' doubts in one tap during class and see which chapters are confusing them week by week, before the test. Free, no sign-up, stays on your device.",
  path: "/doubts",
});

export default function DoubtsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Doubt log", path: "/doubts" }])} />
      <PageHeader
        eyebrow="Free tool · no sign-up"
        title="Doubt log"
        lede="Tap the chapter each time a student asks a doubt. Within a few weeks you'll see which chapters are confusing each batch, before the test shows it, and can make a short test on them in one tap."
      />
      <section className="py-10 sm:py-14">
        <div className="container max-w-4xl">
          <DoubtLog />
        </div>
      </section>
    </>
  );
}
