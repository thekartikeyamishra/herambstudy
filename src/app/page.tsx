import Link from "next/link";
import { HeroPreview } from "@/components/marketing/HeroPreview";
import { SampleReport } from "@/components/marketing/SampleReport";
import { FaqList, FeatureCard, Icon, InviteBand, Roadmap } from "@/components/marketing/Sections";
import { WorkflowDiagram } from "@/components/marketing/WorkflowDiagram";
import { LinkButton } from "@/components/ui/Button";
import { Badge, SectionHeading } from "@/components/ui/Primitives";
import { siteConfig } from "@/config/site";
import { homeFaqs } from "@/content/home";
import { resources } from "@/content/resources";
import { buildMetadata } from "@/lib/seo";

export const metadata = {
  ...buildMetadata({
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    path: "/",
  }),
  title: { absolute: `${siteConfig.name} — ${siteConfig.tagline}` },
};

const modes = [
  {
    title: "Student Practice",
    icon: "M4 19.5V6a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2Zm4-11h6",
    body: "Short practice sets aimed at the topics a learner is weakest in, with step-by-step review of every mistake.",
    href: "/for-students",
  },
  {
    title: "Teacher and Institute",
    icon: "M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6",
    body: "Class-wide view of which topics need reteaching, which students need help, and what kind of mistakes they're making.",
    href: "/for-institutes",
  },
  {
    title: "Progress and Outcomes",
    icon: "M4 19h16M6 15l4-4 3 3 5-6",
    body: "Verified before-and-after progress on the same skills, in reports students and parents can actually understand.",
    href: "/how-it-works",
  },
];

export default function HomePage() {
  const featured = resources.slice(0, 3);
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_65%)]" aria-hidden="true" />
        <div className="container relative grid items-center gap-12 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-24">
          <div className="animate-rise">
            <Badge tone="brand">Invite-only early access · Built first for JEE &amp; NEET coaching</Badge>
            <h1 className="mt-6 text-display-xl">
              Marks tell you <em className="font-display italic text-brand">how much.</em>
              <br />
              We help you see <em className="font-display italic text-brand">what's next.</em>
            </h1>
            <p className="lede mt-6 max-w-xl">
              A class can finish a test without anyone knowing what each student needs next. Heramb.study turns every
              assessment into a clear picture of learning gaps, targeted practice and verified progress.
            </p>
            <div className="mt-8 flex flex-col gap-3 xs:flex-row">
              <LinkButton href="/invite" size="lg">Request an invite</LinkButton>
              <LinkButton href="/how-it-works" size="lg" variant="secondary">Explore how it works</LinkButton>
            </div>
            <p className="mt-5 text-sm text-ink-muted">{siteConfig.tagline} {siteConfig.supportingLine}</p>
          </div>
          <div className="animate-rise [animation-delay:120ms]">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="section border-y border-line bg-paper-raised" aria-labelledby="problem-title">
        <div className="container grid gap-12 lg:grid-cols-2 lg:gap-20">
          <SectionHeading
            id="problem-title"
            eyebrow="The problem"
            title="A total score hides the reason behind it."
            lede="Two students can both score 58% for completely different reasons. One hasn't understood a concept; the other understood it but ran out of time. Treating them the same wastes the next week of practice."
          />
          <dl className="grid gap-6 self-end sm:grid-cols-2">
            {[
              ["Teachers", "Know a class did badly in a chapter, but rarely have time to find out which students, which sub-topics and why."],
              ["Students", "Repeat whole chapters or random question banks instead of the few things actually holding them back."],
              ["Institutes", "Report marks to parents, but struggle to show genuine, specific improvement between tests."],
              ["Everyone", "Move on to the next chapter without checking whether last month's gaps were ever closed."],
            ].map(([dt, dd]) => (
              <div key={dt} className="border-l-2 border-brand/40 pl-4">
                <dt className="font-semibold text-ink">{dt}</dt>
                <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">{dd}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Workflow */}
      <section className="section" aria-labelledby="workflow-title">
        <div className="container">
          <SectionHeading
            id="workflow-title"
            eyebrow="How it works"
            title="Five steps, repeated every cycle."
            lede="The whole product is built around one loop. Each step produces evidence the next one uses."
            align="center"
            className="mb-14"
          />
          <WorkflowDiagram />
          <p className="mt-10 text-center">
            <Link href="/how-it-works" className="font-medium text-brand underline underline-offset-4">
              See each step in detail, including its limitations →
            </Link>
          </p>
        </div>
      </section>

      {/* Modes */}
      <section className="section border-t border-line bg-paper-sunk/50" aria-labelledby="modes-title">
        <div className="container">
          <SectionHeading id="modes-title" eyebrow="Three ways in" title="One platform, three views of the same learning." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {modes.map((m) => (
              <FeatureCard key={m.title} title={m.title} icon={<Icon d={m.icon} />}>
                <p>{m.body}</p>
                <Link href={m.href} className="mt-4 inline-block font-medium text-brand underline-offset-4 hover:underline">
                  Learn more<span className="sr-only"> about {m.title}</span> →
                </Link>
              </FeatureCard>
            ))}
          </div>
        </div>
      </section>

      {/* Sample report */}
      <section className="section" aria-labelledby="report-title">
        <div className="container grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <SectionHeading
              id="report-title"
              eyebrow="What you'd see"
              title="A report that says what to do next."
              lede="Instead of a single percentage, each topic shows where the student stands, what kind of mistake dominates, and whether practice actually moved it."
            />
            <ul className="mt-8 space-y-3 text-[0.9375rem] text-ink-soft">
              {[
                "Topic-level status, not just a total",
                "Mistake type: concept, procedure, careless, time pressure",
                "Before-and-after on comparable questions",
                "A concrete, human-readable next step",
              ].map((x) => (
                <li key={x} className="flex gap-3">
                  <svg className="mt-1 shrink-0 text-good" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="m3 8.5 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-ink-muted">
              Want to try this with your own class?{" "}
              <Link href="/resources/learning-gap-analysis" className="font-medium text-brand underline underline-offset-4">
                Use the free learning-gap analyser
              </Link>
              .
            </p>
          </div>
          <SampleReport />
        </div>
      </section>

      {/* Value */}
      <section className="section border-y border-line bg-paper-raised" aria-labelledby="value-title">
        <div className="container grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">For students</p>
            <h2 id="value-title" className="mt-3 text-display-md">Practise less of what you know. More of what you don't.</h2>
            <p className="mt-4 text-ink-soft">
              See exactly which topics are holding you back, get short practice sets aimed at them, and watch the gap
              close on a follow-up check — without guesswork.
            </p>
            <Link href="/for-students" className="mt-5 inline-block font-medium text-brand underline underline-offset-4">For students →</Link>
          </div>
          <div>
            <p className="eyebrow">For institutes &amp; teachers</p>
            <h2 className="mt-3 text-display-md">Decide what to reteach in minutes, not evenings.</h2>
            <p className="mt-4 text-ink-soft">
              Class-wide gap maps, groupings by need, and progress you can explain to parents with specifics rather
              than averages — designed to fit next to your current test series.
            </p>
            <Link href="/for-institutes" className="mt-5 inline-block font-medium text-brand underline underline-offset-4">For institutes →</Link>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="section" aria-labelledby="roadmap-title">
        <div className="container">
          <SectionHeading
            id="roadmap-title"
            eyebrow="Roadmap"
            title="What exists today, and what doesn't yet."
            lede="We'd rather be precise than impressive. This list changes as we learn from pilots."
          />
          <div className="mt-12">
            <Roadmap
              now={[
                { title: "Free teacher & student resources", body: "Interactive diagnostic, gap analyser, report template and guides." },
                { title: "Class test analyser", body: "Paste a batch\u2019s marks and get reteach groups and student reports — free." },
                { title: "Invite requests & institute pilots", body: "Join the early-access list, or apply for a pilot." },
                { title: "Installable web app", body: "This site can be installed on supported devices and works offline for saved pages." },
              ]}
              next={[
                { title: "Student practice app", body: "Topic-targeted practice with mistake review." },
                { title: "Teacher dashboard", body: "Class gap maps from uploaded or in-app tests." },
                { title: "Institute pilots", body: "Small pilots with JEE/NEET coaching centres." },
              ]}
              later={[
                { title: "Android and iOS apps", body: "Native apps once the web version is validated." },
                { title: "Hindi content", body: "Full Hindi interface and resources." },
                { title: "International curricula", body: "Only where pilots show real demand." },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="section border-t border-line bg-paper-sunk/50" aria-labelledby="resources-title">
        <div className="container">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading id="resources-title" eyebrow="Free, no sign-up" title="Useful today, before any invite." />
            <Link href="/resources" className="font-medium text-brand underline underline-offset-4">All resources →</Link>
          </div>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {featured.map((r) => (
              <li key={r.slug}>
                <Link href={`/resources/${r.slug}`} className="card group block h-full p-6 transition-shadow hover:shadow-lift">
                  <Badge tone={r.kind === "Interactive tool" ? "brand" : "neutral"}>{r.kind}</Badge>
                  <h3 className="mt-4 font-sans text-lg font-semibold group-hover:text-brand">{r.title}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{r.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" aria-labelledby="faq-title">
        <div className="container grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            id="faq-title"
            eyebrow="Questions"
            title="Sceptical questions, straight answers."
            lede={<>Something else? <Link href="/contact" className="font-medium text-brand underline underline-offset-4">Ask us directly</Link>.</>}
          />
          <FaqList items={homeFaqs} />
        </div>
      </section>

      <InviteBand />
    </>
  );
}
