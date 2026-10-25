import Link from "next/link";
import { FaqList, FeatureCard, Icon, InviteBand } from "@/components/marketing/Sections";
import { JsonLd } from "@/components/seo/JsonLd";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader, SectionHeading } from "@/components/ui/Primitives";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Coaching institutes: what to reteach next",
  description:
    "See chapter-wise gaps across a batch after every test, send each student a report and prove progress — alongside your existing test series.",
  path: "/for-institutes",
});

const pilotSteps = [
  { t: "A 20-minute conversation", d: "We learn how you test, report and group students today. No sales deck." },
  { t: "One batch, one subject", d: "Start small: a single batch and subject, using your own upcoming tests." },
  { t: "Four to six weeks", d: "One full cycle: assess, diagnose, practise, and a follow-up check." },
  { t: "Honest review together", d: "We look at what changed, what didn't, and whether it's worth continuing. You can stop at any point." },
];

export default function ForInstitutesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "For institutes", path: "/for-institutes" }])} />
      <PageHeader
        eyebrow="For coaching institutes"
        title="Know what to reteach — and prove what improved."
        lede="Built for JEE and NEET coaching centres first: a class-wide view of learning gaps from the tests you already run, with targeted practice and verified follow-up."
      >
        <div className="flex flex-col gap-3 xs:flex-row">
          <LinkButton href="/founding" size="lg">Become a founding institute</LinkButton>
          <LinkButton href="/resources/class-test-analyser" size="lg" variant="secondary">Try the free class analyser</LinkButton>
        </div>
      </PageHeader>

      <section className="section" aria-labelledby="workflow-title">
        <div className="container">
          <SectionHeading id="workflow-title" eyebrow="Teacher workflow" title="What changes in a teacher's week." />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard title="After every test" icon={<Icon d="M4 19h16M7 15V9M12 15V5M17 15v-3" />}>
              A gap map by topic for the whole batch, highlighting where more than a third of students are below 50%.
            </FeatureCard>
            <FeatureCard title="Group by need" icon={<Icon d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20c0-3 2.5-5 5-5s5 2 5 5m-2-5c1-.6 2.2-1 3-1 2.5 0 5 2 5 5" />}>
              Students grouped by the same gap and mistake type, so a 15-minute recap reaches exactly who needs it.
            </FeatureCard>
            <FeatureCard title="Assign practice" icon={<Icon d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />}>
              Short targeted sets per group instead of one homework sheet for everyone. Questions are reviewed before use.
            </FeatureCard>
            <FeatureCard title="Report progress" icon={<Icon d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4" />}>
              Topic-level before-and-after reports for students and parents — specific, comparable and honest.
            </FeatureCard>
          </div>
        </div>
      </section>

      <section className="section border-y border-line bg-paper-raised" aria-labelledby="coexist-title">
        <div className="container grid gap-12 lg:grid-cols-2">
          <SectionHeading
            id="coexist-title"
            eyebrow="No rip-and-replace"
            title="Works next to your current software."
            lede="Most institutes already have a test series, an attendance system and a fee app. Heramb.study is designed to be the layer that interprets results — not another system you have to migrate to."
          />
          <ul className="space-y-4 self-end text-ink-soft">
            {[
              "Start from your own test results (planned: CSV upload from common formats).",
              "Keep your existing test series, timetable and fee systems.",
              "Export reports and data at any time — no lock-in.",
              "Students only see their own data; teachers see their own batches.",
            ].map((x) => (
              <li key={x} className="flex gap-3">
                <svg className="mt-1 shrink-0 text-good" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8.5 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="pilot-title">
        <div className="container">
          <SectionHeading id="pilot-title" eyebrow="Pilot" title="How a pilot would work." lede="Pilots are small by design, so we can learn properly and you risk very little time." />
          <ol className="mt-12 grid gap-5 md:grid-cols-4">
            {pilotSteps.map((s, i) => (
              <li key={s.t} className="card p-6">
                <span className="tabular font-display text-3xl text-brand">0{i + 1}</span>
                <h3 className="mt-3 font-sans text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{s.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton href="/founding" size="lg">Become a founding institute</LinkButton>
            <Link href="/pilot?type=coaching" className="text-sm font-medium text-brand underline underline-offset-4">Or apply for a supported pilot</Link>
          </div>
        </div>
      </section>

      <section className="section border-t border-line bg-paper-sunk/50" aria-labelledby="inst-faq">
        <div className="container grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading id="inst-faq" eyebrow="Questions" title="What institute owners ask us." />
          <FaqList
            items={[
              { q: "Will this increase our admissions or results?", a: <p>We don't know yet, and we won't claim it. Pilots exist to find out what actually changes. We'll share findings with you honestly, including if the answer is "not much".</p> },
              { q: "How much teacher time does it need?", a: <p>The aim is to save time spent analysing papers. During a pilot we'll measure the time it takes, and adjust the workflow if it's adding work.</p> },
              { q: "Who owns our students' data?", a: <p>Your institute remains responsible for your students' data; we process it to provide the service. You can export or delete it. See our <Link href="/privacy">privacy policy</Link> and <Link href="/trust">approach</Link>.</p> },
              { q: "What does it cost?", a: <p>There's no pricing yet and nothing to buy today. Pilot terms will be agreed in writing before anything starts.</p> },
            ]}
          />
        </div>
      </section>
      <InviteBand />
    </>
  );
}
