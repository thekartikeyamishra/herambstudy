import Link from "next/link";
import { ContactForm } from "@/components/forms/ContactForm";
import { Callout, PageHeader } from "@/components/ui/Primitives";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact",
  description: "Contact the Heramb.study team about pilots, privacy requests, content corrections or general questions.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="Talk to us." lede="Questions, pilot enquiries, privacy requests or corrections — every message is read by a person." />
      <section className="section">
        <div className="container grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <div>
              <h2 className="font-sans text-lg font-semibold">Email</h2>
              {siteConfig.contactEmail ? (
                <p className="mt-2">
                  <a href={`mailto:${siteConfig.contactEmail}`} className="font-medium text-brand underline underline-offset-4">
                    {siteConfig.contactEmail}
                  </a>
                </p>
              ) : (
                <p className="mt-2 text-ink-soft">Please use the form — a direct email address will be published here soon.</p>
              )}
            </div>
            <div>
              <h2 className="font-sans text-lg font-semibold">Privacy and data requests</h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                To access, correct or delete the data we hold about you (for example, an invite request), choose
                "Privacy or data request" and use the email address you submitted with. See the{" "}
                <Link href="/privacy" className="font-medium text-brand underline underline-offset-4">privacy policy</Link>.
              </p>
            </div>
            <Callout tone="neutral">
              We're a small team. We read every message but can't yet promise a response time. We'll never ask for
              passwords or payment details by email.
            </Callout>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
