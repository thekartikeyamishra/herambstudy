import Link from "next/link";
import { LegalPage } from "@/components/layout/LegalPage";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Refund policy",
  description: `${siteConfig.name} does not currently sell any paid plan. This page explains what will be published before payments launch.`,
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund policy">
      <h2>Nothing is for sale today</h2>
      <p>
        {siteConfig.name} does not currently offer any paid subscription, course or product, and this website does not
        accept payments. Requesting an invite is free. If anyone asks you to pay for a "{siteConfig.name}" invitation,
        it is not us — please <Link href="/contact">let us know</Link>.
      </p>

      <h2>Before payments launch</h2>
      <p>
        When paid plans are introduced, this page will be replaced with a complete refund and cancellation policy
        <strong> before</strong> any payment is taken. It will cover at least:
      </p>
      <ul>
        <li>which plans can be cancelled, and how;</li>
        <li>whether and when refunds are available, including for annual plans and unused periods;</li>
        <li>how long refunds take and how they are paid back (to the original payment method);</li>
        <li>how failed, duplicate or incorrect charges are corrected;</li>
        <li>your statutory rights under the consumer laws that apply to you, which no policy can remove.</li>
      </ul>
      <p>
        Pilot participants will never be charged without clear prior notice and their explicit agreement in writing.
      </p>
    </LegalPage>
  );
}
