import Link from "next/link";
import { contactLabel, LegalPage, operatorLabel } from "@/components/layout/LegalPage";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms of service",
  description: `The terms that apply when you use the ${siteConfig.name} website, free resources and invite request.`,
  path: "/terms",
});

export default function TermsPage() {
  const op = operatorLabel();
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms apply to your use of the {siteConfig.name} website, including its free resources and the invite
        request form (together, the "Website"). The Website is operated by <strong>{op}</strong>. By using it, you agree
        to these terms. If you don't agree, please don't use the Website.
      </p>

      <h2>1. What the Website is</h2>
      <p>
        The Website describes a learning platform that is in development and offers free educational resources. The
        full learning platform is not yet generally available. Access to it is by invitation, and separate terms will
        apply to it.
      </p>

      <h2>2. Invite requests</h2>
      <ul>
        <li>Requesting an invite is free and doesn't create any obligation for you or for us.</li>
        <li>We don't guarantee that any request will be accepted, or when invitations will be sent.</li>
        <li>You must give accurate information and only submit a request for yourself (or, as a parent or guardian, for your child).</li>
      </ul>

      <h2>3. Accounts</h2>
      <p>
        The Website doesn't currently offer user accounts. When accounts are introduced for the learning platform, you'll
        be responsible for keeping your login details confidential and for activity under your account, and additional
        terms will apply.
      </p>

      <h2>4. Free resources and their limits</h2>
      <p>
        Our guides and tools are general educational information. They aren't professional, psychological or academic
        advice tailored to you, and they can't predict exam results. Tool outputs depend on the data you enter. You're
        responsible for how you use them, especially when making decisions about students. We try to keep content
        accurate and reviewed, but it may contain errors — please <Link href="/contact?topic=content_error">report</Link> any you find.
      </p>

      <h2>5. No guaranteed outcomes</h2>
      <p>
        We don't promise improved marks, exam success, admission, student retention, institute revenue or any other
        outcome from using the Website or the future platform.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>submit false, misleading or someone else's information without permission;</li>
        <li>submit student records, assessment results or sensitive personal data through public forms;</li>
        <li>attempt to access data or systems you aren't authorised to, probe or bypass security measures, or overload the Website (including with automated submissions);</li>
        <li>use the Website to send spam, malware or unlawful content;</li>
        <li>scrape or copy the Website's content at scale, or present it as your own.</li>
      </ul>

      <h2>7. Intellectual property</h2>
      <p>
        The Website's text, tools, design, diagrams and code belong to the operator or its licensors. You may use the
        free resources, and print or share outputs you create with them, for your own teaching, learning or
        non-commercial purposes, with attribution. You may not resell them or republish substantial parts without
        written permission. "{siteConfig.name}" and the Heramb logo are proposed marks of the operator.
      </p>

      <h2>8. Third-party services</h2>
      <p>
        The Website relies on third-party services (for example, hosting, database and, if you consent, analytics).
        Links to third-party websites are provided for convenience; we're not responsible for their content or practices.
      </p>

      <h2>9. Availability and changes</h2>
      <p>
        We may change, suspend or discontinue any part of the Website at any time, and we don't guarantee it will be
        available without interruption or error. We may update these terms; the "last updated" date will change, and
        continued use means you accept the updated terms.
      </p>

      <h2>10. Suspension</h2>
      <p>
        We may block access or reject submissions that breach these terms or appear abusive or automated.
      </p>

      <h2>11. Warranties and liability</h2>
      <p>
        To the extent permitted by law, the Website and free resources are provided "as is", without warranties of any
        kind. To the extent permitted by law, the operator isn't liable for indirect or consequential losses arising from
        your use of the Website. Nothing in these terms limits liability that cannot be limited by law, or your rights
        as a consumer under applicable law.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These terms are governed by the laws of <strong>[JURISDICTION — to be confirmed with legal counsel]</strong>,
        and disputes are subject to the courts of <strong>[VENUE — to be confirmed]</strong>, without affecting any
        mandatory consumer protections in your country of residence.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these terms: <strong>{contactLabel()}</strong> or the <Link href="/contact">contact form</Link>.
      </p>
    </LegalPage>
  );
}
