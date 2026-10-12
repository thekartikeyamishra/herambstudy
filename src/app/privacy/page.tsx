import Link from "next/link";
import { contactLabel, LegalPage, operatorLabel } from "@/components/layout/LegalPage";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy policy",
  description: `How ${siteConfig.name} collects, uses, stores and protects personal data on this website, and how to exercise your rights.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  const op = operatorLabel();
  const email = contactLabel();
  return (
    <LegalPage title="Privacy policy">
      <p>
        This policy explains what personal data the {siteConfig.name} website collects, why, and what you can do about
        it. It covers this website only — the invite-only learning app will have its own notice before anyone uses it.
      </p>

      <h2>1. Who is responsible</h2>
      <p>
        The website is operated by <strong>{op}</strong> ("we", "us"), which decides how and why your personal data is
        processed (a "Data Fiduciary" under India's Digital Personal Data Protection Act, 2023, and a "controller" under
        the EU/UK GDPR). Contact: <strong>{email}</strong>, or the <Link href="/contact">contact form</Link>.
        Grievance officer: <strong>[NAME AND CONTACT — to be completed before launch]</strong>.
      </p>

      <h2>2. What we collect</h2>
      <table>
        <thead><tr><th scope="col">When</th><th scope="col">Data</th><th scope="col">Why</th></tr></thead>
        <tbody>
          <tr><td>You request an invite</td><td>Email; optionally your name; role; country; main use case and optional note; for teachers and institute owners, optional institute name and size; your consent choices with date and version; the campaign tag and on-site page you came from, if any.</td><td>To review and manage invitations; to send product updates only if you opted in.</td></tr>
          <tr><td>You apply for an institute pilot</td><td>Your name, role, work email, optional phone; institute name, city, country, approximate size, exams, test frequency, optional current software, preferred start, optional price-comfort range and notes; date.</td><td>To assess, arrange and follow up on a pilot. The price question only informs our pricing plans.</td></tr>
          <tr><td>You send a message</td><td>Name, email, topic, message, date.</td><td>To read and reply to your message.</td></tr>
          <tr><td>You submit any form</td><td>A one-way, salted hash of your IP address and email, stored briefly in a counter.</td><td>To limit abuse and automated spam. Raw IP addresses are not stored in our database.</td></tr>
          <tr><td>You visit any page</td><td>Standard server logs kept by our hosting provider (IP address, browser, page requested, time).</td><td>Security, reliability and debugging.</td></tr>
          <tr><td>Only if you click "Allow analytics"</td><td>Pseudonymous usage data via Google Analytics 4 (pages viewed, device type, approximate location, and a small set of events such as "invite form started").</td><td>To understand which pages and tools are useful.</td></tr>
        </tbody>
      </table>
      <p>
        We never send names, email addresses or anything you type into our free tools to analytics. The free tools
        (diagnostic, analysers, report template) run entirely in your browser; their contents are not sent to us.
      </p>

      <h2>3. Legal basis</h2>
      <ul>
        <li><strong>Consent</strong> — for processing your invite request, pilot application and contact message (you confirm this with a checkbox), for product-update emails (a separate, optional checkbox that you then confirm from an email — "double opt-in"), and for analytics.</li>
        <li><strong>Legitimate interests</strong> (GDPR) / reasonable purposes for security (DPDP) — for rate limiting, fraud prevention and server logs.</li>
      </ul>
      <p>You can withdraw consent at any time; this doesn't affect processing that already happened.</p>

      <h2>4. Service providers and international transfers</h2>
      <p>We use these processors, which handle data on our behalf under their own terms and security measures:</p>
      <ul>
        <li><strong>Google Cloud / Firebase (Cloud Firestore)</strong> — stores invite requests, contact messages and rate-limit counters. Database region: <strong>[REGION — e.g. asia-south1 (Mumbai); to be confirmed]</strong>.</li>
        <li><strong>Hosting provider</strong> — <strong>[Vercel or Firebase App Hosting — to be confirmed]</strong>, which serves the website and keeps server logs.</li>
        <li><strong>Google Analytics 4</strong> — only if analytics is enabled on this site and you consent.</li>
        <li><strong>Resend</strong> — if email is enabled, sends the acknowledgement of your invite request, the confirmation link for product updates, and pilot notifications to us. It receives your email address and the message content.</li>
      </ul>
      <p>
        These providers may process data outside your country, including in the United States. Where GDPR applies, we
        rely on the providers' standard contractual clauses or other approved transfer mechanisms.
      </p>

      <h2>5. How long we keep data</h2>
      <ul>
        <li>Invite requests: until invitations for the early-access programme close, then <strong>[24 months — to be confirmed]</strong>, or sooner if you ask us to delete them.</li>
        <li>Contact messages: up to <strong>[24 months — to be confirmed]</strong> after the conversation ends.</li>
        <li>Pilot applications: for the duration of pilot discussions and any pilot, then <strong>[24 months — to be confirmed]</strong>, or sooner on request.</li>
        <li>Rate-limit counters: automatically deleted, typically within a day.</li>
        <li>Analytics data: retention set to the shortest available period in Google Analytics (2 months).</li>
      </ul>

      <h2>6. Security</h2>
      <p>
        Data is encrypted in transit (HTTPS) and at rest by our database provider. Our database denies all direct access
        from browsers; every submission is validated on our servers, and access to stored data is limited to the
        operator. No system is perfectly secure, and we can't guarantee absolute security. If a personal-data breach
        affects you, we'll notify you and the relevant authority as required by law.
      </p>

      <h2>7. Your rights</h2>
      <p>Depending on where you live, you can:</p>
      <ul>
        <li>access the personal data we hold about you, and get a copy;</li>
        <li>correct or complete inaccurate data;</li>
        <li>have your data erased;</li>
        <li>withdraw consent, including for product-update emails (every such email includes an unsubscribe link, and the confirmation email does too);</li>
        <li>under the DPDP Act, nominate another person to exercise your rights and seek grievance redressal;</li>
        <li>under GDPR, restrict or object to processing and receive data in a portable format;</li>
        <li>complain to a regulator (in India, the Data Protection Board of India; in the EU/UK, your local data-protection authority).</li>
      </ul>
      <p>
        To make a request, use the <Link href="/contact?topic=privacy_request">contact form</Link> and choose "Privacy or
        data request", from the email address the request concerns. We may need to verify your identity. We aim to
        respond within 30 days.
      </p>

      <h2 id="cookies">8. Cookies and local storage</h2>
      <ul>
        <li><strong>Strictly necessary:</strong> your analytics choice is saved in your browser's local storage so we don't ask again. If the site is installed or visited repeatedly, a service worker stores copies of pages on your device for offline use.</li>
        <li><strong>Analytics (optional):</strong> Google Analytics cookies are set only after you click "Allow analytics". Advertising storage is never enabled by that choice.</li>
        <li><strong>Advertising:</strong> this site does not currently show ads. If that changes, we'll update this policy and ask for any required consent first.</li>
      </ul>
      <p>To change your analytics choice, clear this site's data in your browser settings; you'll be asked again.</p>

      <h2>9. Children and educational data</h2>
      <p>
        Under the DPDP Act, a "child" is anyone under 18. We don't knowingly accept invite requests from children
        without a parent's or guardian's involvement — we ask under-18s to have a parent or guardian submit the form.
        The public forms are not designed for student records; please don't include marks, assessment results or other
        information about students. If you believe a child has given us data without consent, contact us and we'll
        delete it.
      </p>

      <h2>10. What we don't do</h2>
      <ul>
        <li>We don't sell or rent personal data.</li>
        <li>We don't use your data for targeted advertising or behavioural tracking of children.</li>
        <li>We don't make automated decisions with legal or similarly significant effects from website data.</li>
      </ul>

      <h2>11. Changes</h2>
      <p>
        We'll update this page when our practices change and revise the "last updated" date. Significant changes will
        be highlighted on the site, and where required we'll ask for your consent again.
      </p>
    </LegalPage>
  );
}
