import Link from "next/link";
import { JoinForm } from "@/components/founding/JoinForm";
import { LiveProof } from "@/components/founding/LiveProof";
import { JsonLd } from "@/components/seo/JsonLd";
import { Callout } from "@/components/ui/Primitives";
import { foundingCap } from "@/lib/institute/code";

import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

/** Read at build time from FOUNDING_CAP so the page never promises a different number. */
const CAP = foundingCap();

/**
 * Optional founding price lock (FOUNDING_PRICE_CAP_INR, rupees per month per institute). Only
 * shown when the owner has set it, so the page never states a number nobody decided.
 */
const PRICE_CAP = (() => {
  const v = Number(process.env.FOUNDING_PRICE_CAP_INR);
  return Number.isInteger(v) && v > 0 && v < 100000 ? v : null;
})();

export const metadata = buildMetadata({
  title: "Founding Institute Programme",
  description:
    `Join Heramb.study as one of the first ${CAP} founding institutes: free chapter-wise test analysis, student report links with your institute's name, and a founding discount on any future paid plan.`,
  path: "/founding",
});

const gets = [
  ["Today's free tools stay free", "The analyser, tracker, report links and dashboard — no trial that runs out."],
  ["Your founding seat number", `One of the first ${CAP} — shown on your dashboard. Later sign-ups are welcome but don't get a seat.`],
  PRICE_CAP
    ? ["A founding price lock", `If you ever choose a paid plan, it will never cost more than ₹${PRICE_CAP.toLocaleString("en-IN")} a month for your institute. Nothing is ever charged automatically.`]
    : ["A founding discount", "On any future paid plan, in writing before it launches. You can always stay on the free plan, and nothing is ever charged automatically."],
  ["A direct line to the founder", "Setup help on WhatsApp, and a say in what we build next."],
];

const asks = [
  "Analyse real tests — ideally every week.",
  "Send students their report links.",
  "Tell us in two taps what it helped with.",
  "A 20-minute check-in after 30 days.",
];

export default function FoundingPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "For institutes", path: "/for-institutes" }, { name: "Founding programme", path: "/founding" }])} />
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_60%)]" aria-hidden="true" />
        <div className="container relative grid gap-12 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-20">
          <div>
            <p className="eyebrow">For coaching institutes, schools and colleges</p>
            <h1 className="mt-3 text-display-lg">Founding Institute Programme</h1>
            <p className="lede mt-5">
              We're working closely with the first {CAP} institutes to make test analysis effortless.
              Register in 30 seconds — no accounts, no passwords, no payment.
            </p>
            <h2 className="mt-10 font-sans text-base font-semibold">What founding institutes get</h2>
            <ul className="mt-4 space-y-4">
              {gets.map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <svg className="mt-1 shrink-0 text-good" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="m3 8.5 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span><strong className="text-ink">{t}.</strong> <span className="text-ink-soft">{d}</span></span>
                </li>
              ))}
            </ul>
            <h2 className="mt-10 font-sans text-base font-semibold">What we ask in return</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
              {asks.map((a) => <li key={a}>{a}</li>)}
            </ul>
            <Callout tone="neutral" className="mt-8" title="How privacy works">
              Your institute code connects teachers and students without accounts. Heramb only receives anonymous
              counts — tests analysed, links shared, reports opened. Marks, roll numbers and names stay on each device.{" "}
              <Link href="/privacy" className="font-medium text-brand underline underline-offset-4">Privacy policy</Link>.
              <span className="mt-2 block" lang="hi">छात्रों के अंक और नाम आपके फ़ोन से बाहर नहीं जाते — Heramb को सिर्फ़ गिनती मिलती है। कोई फ़ीस नहीं, कोई अनुबंध नहीं।</span>
            </Callout>
            <LiveProof className="mt-8" />
          </div>
          <div>
            <JoinForm />
            <p className="mt-4 text-sm text-ink-muted">
              Already registered? Open your <Link href="/institute" className="font-medium text-brand underline underline-offset-4">institute dashboard</Link> with your code.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
