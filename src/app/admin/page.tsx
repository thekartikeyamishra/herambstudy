import { OwnerDashboard } from "@/components/founding/OwnerDashboard";

export const metadata = { title: "Owner dashboard", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <section className="container max-w-5xl py-10 sm:py-14">
      <p className="eyebrow">Founding programme</p>
      <h1 className="mt-2 text-display-lg">Owner dashboard</h1>
      <p className="mt-3 text-ink-soft">Every founding institute, the seven programme goals, and one-tap WhatsApp nudges. Contact details are visible only here.</p>
      <div className="mt-8">
        <OwnerDashboard />
      </div>
    </section>
  );
}
