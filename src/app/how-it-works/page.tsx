import Link from "next/link";
import { SampleReport } from "@/components/marketing/SampleReport";
import { InviteBand } from "@/components/marketing/Sections";
import { WorkflowDiagram } from "@/components/marketing/WorkflowDiagram";
import { JsonLd } from "@/components/seo/JsonLd";
import { Callout, PageHeader } from "@/components/ui/Primitives";
import { workflowSteps } from "@/content/sampleData";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "How it works: from test marks to progress",
  description:
    "How Heramb.study is designed to turn each assessment into topic-level gaps, targeted practice and verified progress — with the limitations of each step explained.",
  path: "/how-it-works",
});

const deepDive: Record<string, { example: string; limit: string }> = {
  assess: {
    example: "A 30-question Physics unit test, where each question is tagged to a topic (e.g. Rotational motion) and a skill (e.g. applying torque).",
    limit: "A test can only reveal what it asks. Topics with one or two questions give weak evidence; we'll flag these rather than over-interpret them.",
  },
  diagnose: {
    example: "Aarav (fictional) scores 41% on Rotational motion. Most wrong answers use the wrong torque direction — a concept issue, not carelessness.",
    limit: "Mistake types are inferred from answer patterns and teacher input. They are suggestions for a teacher to confirm, not automatic verdicts.",
  },
  practise: {
    example: "Twelve questions on rotational motion, ordered from a worked example to independent problems. About 25 minutes.",
    limit: "Practice helps only if it's done and if it targets the real cause. Some gaps need a teacher's explanation before any practice.",
  },
  verify: {
    example: "Three weeks later, a short check on the same topic at similar difficulty: 63%. A real, verified change — but not yet secure.",
    limit: "Two tests are never identical. Small changes are reported as 'no clear change' rather than as progress.",
  },
  improve: {
    example: "The teacher keeps Aarav on rotation practice, groups him with two others with the same gap, and shares a clear report home.",
    limit: "The decision stays with the teacher. Heramb.study informs judgement; it doesn't replace it.",
  },
};

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "How it works", path: "/how-it-works" }])} />
      <PageHeader
        eyebrow="How it works"
        title="From a test result to a verified next step."
        lede="Heramb.study is designed around one repeating loop. Here's what happens at each step, a worked example using fictional data, and what each step can't do."
      />
      <section className="section" aria-labelledby="overview-title">
        <h2 id="overview-title" className="sr-only">The five steps at a glance</h2>
        <div className="container"><WorkflowDiagram detailed /></div>
      </section>

      <section className="section border-t border-line bg-paper-raised" aria-labelledby="steps-title">
        <div className="container max-w-4xl">
          <h2 id="steps-title" className="text-display-lg">Each step in detail</h2>
          <Callout tone="neutral" className="mt-6">
            The example below follows one <strong>fictional</strong> student. The product is in development; this
            describes the intended design.
          </Callout>
          <ol className="mt-10 space-y-6">
            {workflowSteps.map((s, i) => {
              const d = deepDive[s.key];
              return (
                <li key={s.key} className="card p-6 sm:p-8">
                  <p className="eyebrow">Step {i + 1}</p>
                  <h3 className="mt-2 text-display-md">{s.title}</h3>
                  <p className="mt-3 text-ink-soft">{s.detail}</p>
                  {d ? (
                    <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                      <div className="rounded-xl bg-paper-sunk p-4">
                        <dt className="text-sm font-semibold text-ink">Example</dt>
                        <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">{d.example}</dd>
                      </div>
                      <div className="rounded-xl border border-warn/25 bg-warn-tint/50 p-4">
                        <dt className="text-sm font-semibold text-ink">Limitation</dt>
                        <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">{d.limit}</dd>
                      </div>
                    </dl>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="result-title">
        <div className="container max-w-4xl">
          <h2 id="result-title" className="text-display-lg">The result: a report with a next step</h2>
          <p className="lede mt-4">What a teacher, student or parent would see after one full cycle.</p>
          <div className="mt-10"><SampleReport /></div>
          <p className="mt-8 text-ink-soft">
            You can produce a report like this by hand today with our free{" "}
            <Link href="/resources/student-progress-report-template" className="font-medium text-brand underline underline-offset-4">progress report template</Link>.
          </p>
        </div>
      </section>
      <InviteBand />
    </>
  );
}
