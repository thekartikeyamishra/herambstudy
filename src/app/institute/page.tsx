import { InstituteDashboard } from "@/components/founding/InstituteDashboard";
import { PageHeader } from "@/components/ui/Primitives";

export const metadata = {
  title: "Institute dashboard",
  description: "Your founding institute's progress on Heramb.study.",
  robots: { index: false, follow: false },
};

export default function InstitutePage() {
  return (
    <>
      <PageHeader eyebrow="Founding institutes" title="Institute dashboard" lede="Tests analysed, report links sent, students engaging — counts only, never marks or names." />
      <section className="py-10 sm:py-14">
        <div className="container max-w-4xl">
          <InstituteDashboard />
        </div>
      </section>
    </>
  );
}
