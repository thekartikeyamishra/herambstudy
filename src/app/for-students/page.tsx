import Link from "next/link";
import { FeatureCard, Icon, InviteBand } from "@/components/marketing/Sections";
import { InstallControl } from "@/components/pwa/InstallControl";
import { StoreBadges } from "@/components/pwa/StoreBadges";
import { JsonLd } from "@/components/seo/JsonLd";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader, SectionHeading } from "@/components/ui/Primitives";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "For students: practise what actually matters",
  description:
    "See which topics are holding you back, get short targeted practice, review every mistake, and track verified progress. Free readiness diagnostic available now.",
  path: "/for-students",
});

export default function ForStudentsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "For students", path: "/for-students" }])} />
      <PageHeader
        eyebrow="For students"
        title="Stop redoing what you know. Fix what you don't."
        lede="Heramb.study is being designed to show you the few topics that are really costing you marks, give you short practice aimed at them, and show you — honestly — whether it worked."
      >
        <div className="flex flex-col gap-3 xs:flex-row">
          <LinkButton href="/resources/assessment-readiness-diagnostic" size="lg">Try the free readiness check</LinkButton>
          <LinkButton href="/invite" size="lg" variant="secondary">Request an invite</LinkButton>
        </div>
      </PageHeader>

      <section className="section" aria-labelledby="features-title">
        <div className="container">
          <SectionHeading id="features-title" eyebrow="What you'll get" title="Designed around how learning actually sticks." />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard title="Targeted practice" icon={<Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-3.5a.5.5 0 1 0 0-1" />}>
              Short sets on your weakest topics — often 20–30 minutes — instead of whole chapters.
            </FeatureCard>
            <FeatureCard title="Mistake review" icon={<Icon d="M12 8v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />}>
              Every wrong answer explained step by step, and labelled: concept, method, careless, misread or time.
            </FeatureCard>
            <FeatureCard title="Real progress" icon={<Icon d="M4 19h16M6 15l4-4 3 3 5-6" />}>
              Follow-up checks show whether a gap actually closed — not just that you finished the homework.
            </FeatureCard>
            <FeatureCard title="Your data, your view" icon={<Icon d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" />}>
              You see your own results. We never sell your data or show you ads inside the learning app.
            </FeatureCard>
          </div>
        </div>
      </section>

      <section className="section border-y border-line bg-paper-raised" aria-labelledby="access-title">
        <div className="container grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="access-title" eyebrow="Access" title="How you'll get in." />
            <ol className="mt-8 space-y-5 text-ink-soft">
              <li><strong className="text-ink">Through your institute</strong> — if your coaching centre joins a pilot, your teacher will invite you directly.</li>
              <li><strong className="text-ink">On your own</strong> — <Link href="/invite" className="font-medium text-brand underline underline-offset-4">request an invite</Link>. We're inviting individual students in small groups as we're ready.</li>
              <li><strong className="text-ink">Free resources now</strong> — no account needed to read guides or use the tools on this site.</li>
            </ol>
            <p className="mt-6 text-sm text-ink-muted">
              If you're under 18, please involve a parent or guardian before requesting an invite. Learning-app accounts
              for minors will require their consent.
            </p>
          </div>
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-sans text-lg font-semibold">Use it like an app</h3>
              <p className="mt-2 text-[0.9375rem] text-ink-soft">
                You can install this website on supported phones and computers for quick access. It's the same site —
                no separate download.
              </p>
              <div className="mt-4"><InstallControl /></div>
            </div>
            <div className="card p-6">
              <h3 className="font-sans text-lg font-semibold">Native apps</h3>
              <p className="mt-2 text-[0.9375rem] text-ink-soft">Android and iOS apps are planned, not yet available.</p>
              <StoreBadges className="mt-4" />
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="privacy-title">
        <div className="container max-w-3xl">
          <h2 id="privacy-title" className="text-display-md">Privacy, in plain words</h2>
          <ul className="mt-6 space-y-3 text-ink-soft">
            <li>• Reading this site doesn't require an account.</li>
            <li>• The free tools run in your browser; what you type isn't sent to us.</li>
            <li>• If you request an invite, we store only what the form asks for, and you can ask us to delete it.</li>
            <li>• We don't sell personal data. Details are in our <Link href="/privacy" className="font-medium text-brand underline underline-offset-4">privacy policy</Link>.</li>
          </ul>
        </div>
      </section>
      <InviteBand />
    </>
  );
}
