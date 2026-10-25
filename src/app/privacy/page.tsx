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
          <tr><td>An institute joins the founding programme</td><td>Institute name, city and type; contact name, role, and phone and/or email; whether they want the weekly summary email (with date); how they heard of us; the institute code and founding-seat number; dates of joining and last activity; optional value feedback (minutes saved, what it helped with, a short note).</td><td>To run the founding programme: issue the code, show the institute its dashboard, send the weekly summary if requested, and contact the institute about its use of Heramb. Contact details are visible only to the operator.</td></tr>
          <tr><td>A teacher or student uses a tool connected to an institute code</td><td>Counts only: how many tests were analysed, report links created and shared, reports opened and saved, “useful / not useful” taps and reminders added, per day; plus a random device identifier created in the browser, stored only as a one-way hash, to count distinct devices. Never names, roll numbers, marks or topic names.</td><td>To show the institute (and the operator) whether Heramb is being used and is useful. Anyone can switch this off on their device with the “Share anonymous usage counts” switch on the institute dashboard (teachers) or the My progress page (students).</td></tr>
          <tr><td>A connected teacher taps “Share with the head” after analysing a test</td><td>Class-level numbers only: batch name, test name and date, number of students, class average, and per chapter the class average, how many attempted and how many scored below 50%. No student names, roll numbers or individual marks.</td><td>To show the institute head each batch's results on the institute dashboard, and — combined with at least four other institutes in the same city, without naming anyone — a city average per chapter. Kept with the institute's founding-programme records and deleted with them (including from city averages).</td></tr>
          <tr><td>You send a message</td><td>Name, email, topic, message, date.</td><td>To read and reply to your message.</td></tr>
          <tr><td>You submit any form</td><td>A one-way, salted hash of your IP address and email, stored briefly in a counter.</td><td>To limit abuse and automated spam. Raw IP addresses are not stored in our database.</td></tr>
          <tr><td>You visit any page</td><td>Standard server logs kept by our hosting provider (IP address, browser, page requested, time).</td><td>Security, reliability and debugging.</td></tr>
          <tr><td>Only if you click "Allow analytics"</td><td>Pseudonymous usage data via Google Analytics 4 (pages viewed, device type, approximate location, and a small set of events such as "invite form started").</td><td>To understand which pages and tools are useful.</td></tr>
        </tbody>
      </table>
      <p>
        We never send names, email addresses or anything you type into our free tools to analytics. The free tools
        (diagnostic, analysers, report template, class tracker) run entirely in your browser; their contents are not sent to us —
        with two exceptions you choose explicitly: importing marks from a <strong>Google Sheet link</strong> (our server
        downloads the shared sheet and passes it straight to your browser without storing it), and importing a
        <strong>photo or PDF of a marksheet</strong> (sent, after you tick a consent box, to our AI provider to read the table;
        not stored by Heramb). Excel and CSV files are read in your browser and never uploaded.
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
        <li><strong>AI model provider</strong> — only if AI summaries are enabled. When you press “Write my summary”, we send topic names and class-level averages and counts — never names, roll numbers or individual marks — to the configured provider (for example Anthropic) to write the text. Requests are not used by us for anything else.</li>
        <li><strong>AI model provider (marksheet import)</strong> — only if photo/PDF import is enabled and you tick its consent box: the image or PDF you upload is sent to the provider to read the marks table and is not kept by Heramb. Use roll numbers rather than names on the sheet where possible.</li>
        <li><strong>Google</strong> — when you import from a Google Sheet link, our server requests that sheet from Google as a CSV file.</li>
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
        <li>Founding-programme records (institute contact details, usage counts, value feedback): while the institute takes part, then <strong>[24 months — to be confirmed]</strong>, or sooner on request — deletion removes the institute and all its counts.</li>
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
        <li><strong>Student report links and “My progress” (only if used):</strong> a personal report link contains the report itself after the “#”, which browsers never send to a server — so Heramb doesn't receive or store it. Reports a student saves are kept in their own browser on that device. Anyone with a link can open it, so teachers should send each link only to that student or parent.</li>
        <li><strong>Class progress tracker (only if you use it):</strong> the classes and test marks you save are stored in your own browser's local storage on that device. They are never sent to us, we can't see or recover them, and clearing your browser data deletes them. Use the tracker's Export button to keep a backup.</li>
        <li><strong>Founding programme (only if used):</strong> the institute code a teacher connects with, a random device identifier and the usage-count switch are kept in local storage; a linked Google Sheet address is kept there if you choose “Remember this sheet”; a paper map (which questions belong to which chapter) and the report language are remembered there; and student WhatsApp numbers a teacher chooses to add for one-tap sending are kept only there — never in report links and never sent to us. The operator's dashboard sign-in uses one strictly necessary cookie (<code>heramb_owner</code>).</li>
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
