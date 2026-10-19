import { MyProgress } from "@/components/student/MyProgress";
import { UsageSettings } from "@/components/founding/InstituteDashboard";

export const metadata = { title: "My progress", robots: { index: false, follow: false } };

export default function MyProgressPage() {
  return (
    <section className="container max-w-3xl py-10 sm:py-14">
      <p className="eyebrow">For students</p>
      <h1 className="mt-3 text-display-lg">My progress</h1>
      <p className="lede mt-3">Every report you've saved, and how each topic has changed.</p>
      <div className="mt-8">
        <MyProgress />
      </div>
      <div className="mt-10">
        <UsageSettings />
      </div>
    </section>
  );
}
