import { OnlineTestView } from "@/components/tests/OnlineTestView";

// Personal test pages are never indexed.
export const metadata = { title: "Online test", robots: { index: false, follow: false } };

export default function OnlineTestPage() {
  return (
    <section className="container max-w-2xl py-8 sm:py-12">
      <OnlineTestView />
    </section>
  );
}
