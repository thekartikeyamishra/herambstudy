import { EmailAction } from "@/components/forms/EmailAction";

export const metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <section className="container max-w-xl py-16 sm:py-24">
      <p className="eyebrow">Email preferences</p>
      <h1 className="mt-3 text-display-lg">Unsubscribe</h1>
      <EmailAction purpose="unsubscribe" />
    </section>
  );
}
