import Link from "next/link";
import type { ReactNode } from "react";
import { InviteBand } from "@/components/marketing/Sections";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge, PageHeader } from "@/components/ui/Primitives";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "How to use Heramb.study: a simple guide",
  description:
    "Step-by-step: what students, teachers, schools, colleges and coaching institutes can use on Heramb.study today, and how to use each free tool.",
  path: "/guide",
});

type Tool = { title: string; href: string; steps: ReactNode[]; result: ReactNode };

function ToolCard({ t }: { t: Tool }) {
  return (
    <li className="card p-5 sm:p-6">
      <h3 className="font-sans text-lg font-semibold">
        <Link href={t.href} className="hover:text-brand">{t.title} →</Link>
      </h3>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[0.9375rem] text-ink-soft">
        {t.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <p className="mt-3 text-[0.9375rem] text-ink-soft"><strong className="text-ink">You get:</strong> {t.result}</p>
    </li>
  );
}

const studentTools: Tool[] = [
  {
    title: "Readiness check",
    href: "/resources/assessment-readiness-diagnostic",
    steps: ["Answer 12 short questions about the last two weeks.", "Press “See my results”."],
    result: "your weakest study habit and a two-week plan to fix it.",
  },
  {
    title: "Find your weak topics",
    href: "/resources/learning-gap-analysis",
    steps: ["Type each topic from your last test, your marks and the maximum marks.", "Press “Analyse gaps”."],
    result: "your topics in priority order — fix number 1 first.",
  },
  {
    title: "Your personal report from your teacher",
    href: "/me",
    steps: ["Open the report link your teacher sends after a test.", "Press “Save to my progress”.", "Open “My progress” any time to see every topic over time."],
    result: "your own record across tests, saved on your phone — no account needed.",
  },
  {
    title: "Understand your mistakes",
    href: "/resources/interpreting-repeated-mistakes",
    steps: ["Go through your wrong answers.", "Press + for each mistake type: concept, method, careless, misread or time."],
    result: "your main mistake pattern and what actually fixes it.",
  },
];

const teacherTools: Tool[] = [
  {
    title: "Class test analyser",
    href: "/resources/class-test-analyser",
    steps: [
      "In Excel or Google Sheets: one student per row (roll numbers), one topic per column.",
      <>Optional: a row called <strong>MAX</strong> with each topic's maximum marks. Write <strong>AB</strong> for absent.</>,
      "Paste it into the box (or upload a CSV) and press “Analyse class”.",
      "Press “Write my summary” for a 3-point plan and a note to forward to parents.",
      "After reteaching, use “Compare with a follow-up test” on the same topics.",
    ],
    result: "a teaching plan, a colour-coded gap map, reteach groups (CSV), one-page reports for every student, and which gaps closed after reteaching.",
  },
  {
    title: "Send every student their own report",
    href: "/resources/class-test-analyser",
    steps: [
      "Analyse a class test, then press “Create student report links”.",
      "Type your institute name, the test name and date.",
      "Press “Copy all links” and send each student their own link on WhatsApp (personal chat, not the group).",
    ],
    result: "each student sees their topics, class averages and next steps with your institute's name on top — and can save it to track their progress.",
  },
  {
    title: "Class progress tracker",
    href: "/tracker",
    steps: [
      "Create a class, or press “Save this test to a class” in the class test analyser.",
      "Add each new test's marks as the term goes on (same paste format).",
      "Export a backup now and then — data is kept only in this browser.",
    ],
    result: "topic trends across tests, students whose gaps keep repeating, what changed since the previous test, and a printable term report for every student.",
  },
  {
    title: "Progress report template",
    href: "/resources/student-progress-report-template",
    steps: ["Fill in the student, topics and percentages from two tests.", "Add strengths and next steps.", "Press “Print or save as PDF”."],
    result: "a clear report to share with the student or parents.",
  },
  {
    title: "Compare two tests fairly",
    href: "/resources/comparing-assessments",
    steps: ["Enter each topic's percentage from test 1 and test 2.", "Choose a margin (5 is a good start)."],
    result: "improved, declined or no clear change per topic — small changes aren't counted as progress.",
  },
];

export default function GuidePage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "How to use", path: "/guide" }])} />
      <PageHeader
        eyebrow="Guide"
        title="How to use Heramb.study"
        lede="Everything below works today, free, with no account. The tools run inside your browser — nothing you type or upload is sent to us."
      >
        <nav aria-label="Jump to section" className="flex flex-wrap gap-2 text-sm">
          {[
            ["#students", "Students"],
            ["#teachers", "Teachers, schools, colleges & coaching"],
            ["#everyone", "Everyone"],
            ["#coming", "Coming next"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border border-line-strong px-4 py-2 font-medium text-ink hover:bg-paper-sunk">{label}</a>
          ))}
        </nav>
      </PageHeader>

      <section id="students" className="section" aria-labelledby="g-students">
        <div className="container max-w-5xl">
          <h2 id="g-students" className="text-display-md">For students</h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-2">
            {studentTools.map((t) => <ToolCard key={t.href} t={t} />)}
          </ul>
        </div>
      </section>

      <section id="teachers" className="section border-y border-line bg-paper-raised" aria-labelledby="g-teachers">
        <div className="container max-w-5xl">
          <h2 id="g-teachers" className="text-display-md">For teachers, schools, colleges and coaching institutes</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">
            The same tools work everywhere. In colleges, treat each unit or module as a “topic”. Start with the class test
            analyser — press “Load a fictional class” first to see an example.
          </p>
          <ul className="mt-8 grid gap-5 md:grid-cols-2">
            {teacherTools.map((t) => <ToolCard key={t.href} t={t} />)}
          </ul>
          <div className="card mt-8 border-brand/30 bg-brand-tint/30 p-6">
            <h3 className="font-sans text-lg font-semibold">Coaching institute? Get a founding code</h3>
            <p className="mt-2 text-[0.9375rem] text-ink-soft">
              Two minutes, no accounts and no payment. Your teachers' analyses and your students' report links count towards
              your institute's dashboard, and founding institutes get a founding discount on any future paid plan.
            </p>
            <Link href="/founding" className="mt-4 inline-block font-medium text-brand underline underline-offset-4">Join the founding programme →</Link>
          </div>
          <div className="card mt-6 p-6">
            <h3 className="font-sans text-lg font-semibold">Apply for a free pilot</h3>
            <p className="mt-2 text-[0.9375rem] text-ink-soft">
              One class, one subject, 4–6 weeks, using tests you already run. Fill in a 3-minute form and we reply by
              email. Nothing is charged without a written agreement.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-[0.9375rem] font-medium">
              <Link href="/pilot?type=coaching" className="text-brand underline underline-offset-4">Coaching institute</Link>
              <Link href="/pilot?type=school" className="text-brand underline underline-offset-4">School</Link>
              <Link href="/pilot?type=college" className="text-brand underline underline-offset-4">College</Link>
              <Link href="/pilot?type=tutor" className="text-brand underline underline-offset-4">Tutoring centre</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="everyone" className="section" aria-labelledby="g-everyone">
        <div className="container max-w-3xl">
          <h2 id="g-everyone" className="text-display-md">For everyone</h2>
          <ul className="mt-6 space-y-4 text-ink-soft">
            <li><strong className="text-ink">Install it like an app.</strong> Android Chrome: tap “Install Web App” in the footer. iPhone Safari: Share → Add to Home Screen.</li>
            <li><strong className="text-ink">Request early access.</strong> <Link href="/invite" className="font-medium text-brand underline underline-offset-4">Invite form</Link> — email, role and country. Product updates are a separate, optional box you confirm by email.</li>
            <li><strong className="text-ink">Ask a question or delete your data.</strong> Use the <Link href="/contact" className="font-medium text-brand underline underline-offset-4">contact page</Link> and choose “Privacy or data request”.</li>
            <li><strong className="text-ink">Language.</strong> English today; Hindi is in preparation.</li>
          </ul>
        </div>
      </section>

      <section id="coming" className="section border-t border-line bg-paper-sunk/50" aria-labelledby="g-coming">
        <div className="container max-w-3xl">
          <h2 id="g-coming" className="text-display-md">Coming in the full platform</h2>
          <p className="mt-3 text-ink-soft">In development and tested with pilot partners first. Not available yet.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Teacher dashboard updated after every test",
              "Mistake-type analysis per question",
              "Targeted practice sets assigned to students",
              "Student logins with step-by-step mistake review",
              "Scheduled follow-up checks",
              "Parent-ready progress reports",
            ].map((x) => (
              <li key={x} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper-raised px-4 py-3 text-[0.9375rem]">
                {x} <Badge tone="brand">Planned</Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <InviteBand />
    </>
  );
}
