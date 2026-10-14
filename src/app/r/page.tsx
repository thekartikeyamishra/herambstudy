import { ReportView } from "@/components/student/ReportView";

// Personal reports must never be indexed or cached by search engines.
export const metadata = { title: "Your test report", robots: { index: false, follow: false } };

export default function StudentReportPage() {
  return (
    <section className="container max-w-3xl py-8 sm:py-12">
      <ReportView />
    </section>
  );
}
