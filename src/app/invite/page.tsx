import Link from "next/link";
import { InviteForm } from "@/components/forms/InviteForm";
import { Callout } from "@/components/ui/Primitives";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Request an invite",
  description:
    "Request invite-only early access to Heramb.study for students, teachers and coaching institutes. Free, no commitment, deletable on request.",
  path: "/invite",
});

export default function InvitePage() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_60%)]" aria-hidden="true" />
      <div className="container relative grid gap-12 py-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-20">
        <div>
          <p className="eyebrow">Invite-only early access</p>
          <h1 className="mt-3 text-display-lg">Request an invite</h1>
          <p className="lede mt-5">
            We're opening Heramb.study to small groups at a time so we can learn properly from each one.
          </p>
          <h2 className="mt-10 font-sans text-base font-semibold">What to expect</h2>
          <ul className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed text-ink-soft">
            <li>• We review requests in batches, prioritising JEE/NEET coaching contexts first.</li>
            <li>• There is no fixed invitation date, and we can't guarantee every request will be accepted.</li>
            <li>• Requesting an invite is free and doesn't commit you to anything.</li>
            <li>• Product update emails are separate and only sent if you opt in.</li>
          </ul>
          <Callout tone="neutral" className="mt-8">
            Running an institute? You can also{" "}
            <Link href="/pilot" className="font-medium text-brand underline underline-offset-4">
              apply for a pilot
            </Link>{" "}
            directly.
          </Callout>
        </div>
        <div>
          <InviteForm />
        </div>
      </div>
    </section>
  );
}
