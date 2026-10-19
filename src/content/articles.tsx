import Link from "next/link";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";

// Each tool is its own code-split chunk, so a resource page only ships the tool it uses.
// Server rendering stays on, so the tool's initial HTML is still in the page.
const AssessmentComparer = dynamic(() => import("@/components/resources/AssessmentComparer").then((m) => m.AssessmentComparer));
const ClassAnalyser = dynamic(() => import("@/components/resources/ClassAnalyser").then((m) => m.ClassAnalyser));
const GapAnalyser = dynamic(() => import("@/components/resources/GapAnalyser").then((m) => m.GapAnalyser));
const MistakeTally = dynamic(() => import("@/components/resources/MistakeTally").then((m) => m.MistakeTally));
const ReadinessDiagnostic = dynamic(() => import("@/components/resources/ReadinessDiagnostic").then((m) => m.ReadinessDiagnostic));
const ReportTemplate = dynamic(() => import("@/components/resources/ReportTemplate").then((m) => m.ReportTemplate));
import { MISTAKE_TYPES } from "@/lib/tools/mistakes";

export type Source = { label: string; href?: string };
export type Article = { body: ReactNode; sources: Source[]; limitations: string };

const SRC = {
  blackWiliam: {
    label: "Black, P. & Wiliam, D. (1998). Assessment and classroom learning. Assessment in Education: Principles, Policy & Practice, 5(1), 7–74.",
    href: "https://doi.org/10.1080/0969595980050102",
  },
  roediger: {
    label: "Roediger, H. L. & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255.",
    href: "https://doi.org/10.1111/j.1467-9280.2006.01693.x",
  },
  dunlosky: {
    label: "Dunlosky, J. et al. (2013). Improving students' learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4–58.",
    href: "https://doi.org/10.1177/1529100612453266",
  },
  cepeda: {
    label: "Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. Psychological Bulletin, 132(3), 354–380.",
    href: "https://doi.org/10.1037/0033-2909.132.3.354",
  },
} satisfies Record<string, Source>;

export const articles: Record<string, Article> = {
  "class-test-analyser": {
    body: (
      <>
        <p>
          After a test, most teachers know the class "did badly in equilibrium". What takes hours is the next step:
          which students, how many, and whether to reteach everyone or pull out a small group. This tool does that
          arithmetic for a whole batch from the marks you already have.
        </p>
        <h2>What you need</h2>
        <ul>
          <li>Topic-wise marks for one test — most test series and answer-sheet tallies can produce this.</li>
          <li>A spreadsheet with one row per student and one column per topic. <strong>Use roll numbers</strong> rather than names where possible.</li>
          <li>Optionally a <strong>MAX</strong> row with each topic's maximum marks; otherwise values are treated as percentages.</li>
        </ul>
        <ClassAnalyser />
        <h2>How to read the teaching plan</h2>
        <table>
          <thead><tr><th scope="col">Label</th><th scope="col">Rule</th><th scope="col">What it usually means</th></tr></thead>
          <tbody>
            <tr><td>Reteach to whole class</td><td>At least a third of students who attempted the topic scored below 50%</td><td>The explanation or the practice didn't land for many students — revisit it for everyone</td></tr>
            <tr><td>Small-group recap</td><td>Some, but fewer than a third, below 50%</td><td>A 15–20 minute recap with just that group is usually more efficient</td></tr>
            <tr><td>Maintain</td><td>Nobody below 50%</td><td>Keep the topic in mixed practice so it stays fresh</td></tr>
          </tbody>
        </table>
        <p>
          The one-third threshold is a practical rule of thumb, not a research standard — adjust your judgement for
          very hard papers. Before reteaching, check the answer sheets for the <em>type</em> of mistake using our{" "}
          <Link href="/resources/interpreting-repeated-mistakes">guide to repeated mistakes</Link>: a class-wide slip
          under time pressure needs timed practice, not a new explanation.
        </p>
        <h2>After you reteach</h2>
        <p>
          Run a short follow-up check on the same topics two to four weeks later, then compare fairly with the{" "}
          <Link href="/resources/comparing-assessments">assessment comparison guide</Link>. Share individual progress
          with the <Link href="/resources/student-progress-report-template">progress report template</Link>.
        </p>
        <h2>Privacy</h2>
        <p>
          Excel and CSV files you upload, and data you paste, are processed only in your browser — they aren't sent to
          Heramb.study, and nothing is saved when you close the page unless you save it to the tracker on this device. Two
          optional imports work differently: a Google Sheet link is fetched through our server and passed straight to your
          browser without being stored, and a photo or PDF (only after you tick the consent box) is sent to our AI provider to
          read the table. If your institute is connected, only anonymous counts — never marks or names — are recorded.
          Printed reports should be handled under your institute's data-protection policy.
        </p>
      </>
    ),
    sources: [SRC.blackWiliam],
    limitations:
      "The tool only sees the numbers you enter: it can't tell why a student lost marks, whether questions were fair, or whether a topic had enough questions to be reliable. Thresholds are practical conventions, not validated standards.",
  },
  "assessment-readiness-diagnostic": {
    body: (
      <>
        <p>
          Most students judge their readiness by how much of the syllabus they've "finished". But finishing a chapter
          and being able to answer unfamiliar questions on it, under time pressure, are different things. This
          diagnostic looks at four habits that tend to separate the two.
        </p>
        <h2>What it checks</h2>
        <ul>
          <li><strong>Coverage and awareness</strong> — do you know what's on the paper and where you're weak?</li>
          <li><strong>Practice under exam conditions</strong> — have you practised the way you'll be tested?</li>
          <li><strong>Mistake review</strong> — do you learn from wrong answers, or only count them?</li>
          <li><strong>Revision and recall</strong> — do you test yourself, and come back to old topics?</li>
        </ul>
        <ReadinessDiagnostic />
        <h2>Why these four areas?</h2>
        <p>
          Research on learning consistently finds that <strong>practising retrieval</strong> — answering questions from
          memory — produces more durable learning than rereading, and that <strong>spacing</strong> revision over time
          beats cramming. Reviews of study techniques rate both highly while rating rereading and highlighting as
          comparatively low-utility. Using assessment to guide what you do next, rather than just to grade, is the core
          idea behind formative assessment.
        </p>
        <h2>How to use your results</h2>
        <ol>
          <li>Pick only the one or two focus areas the tool suggests. Changing everything at once rarely sticks.</li>
          <li>Put the actions in your timetable with specific days.</li>
          <li>Retake the diagnostic in two weeks and compare.</li>
          <li>
            For subject-level gaps, combine this with your test marks using the{" "}
            <Link href="/resources/learning-gap-analysis">learning-gap analyser</Link>.
          </li>
        </ol>
      </>
    ),
    sources: [SRC.roediger, SRC.dunlosky, SRC.cepeda, SRC.blackWiliam],
    limitations:
      "This is a self-reflection checklist written by our team. It has not been statistically validated and does not predict exam scores. Answers depend on honest self-assessment.",
  },

  "learning-gap-analysis": {
    body: (
      <>
        <p>
          A test result is usually reported as one number. But the useful information is underneath: which topics a
          student (or a whole class) is secure in, which are developing, and which are real gaps. This guide shows a
          simple, repeatable way to get there with marks you already have.
        </p>
        <h2>Step 1 — Split the marks by topic</h2>
        <p>
          Tag each question to one topic. If your test series gives a topic-wise breakdown, use it. If not, a
          10-minute pass with the question paper is enough. Keep topics fine-grained enough to act on: "Chemical
          bonding" is useful; "Physical chemistry" is not.
        </p>
        <h2>Step 2 — Classify each topic</h2>
        <table>
          <thead><tr><th scope="col">Status</th><th scope="col">Rule of thumb</th><th scope="col">Typical action</th></tr></thead>
          <tbody>
            <tr><td>Secure</td><td>75% or more</td><td>Maintain with mixed practice</td></tr>
            <tr><td>Developing</td><td>50–74%</td><td>Short targeted practice, then re-check</td></tr>
            <tr><td>Learning gap</td><td>Below 50%</td><td>Find the cause first, then reteach or practise</td></tr>
          </tbody>
        </table>
        <p>
          These thresholds are a practical starting point, not a standard. Adjust them for very hard papers or exams
          with heavy negative marking.
        </p>
        <h2>Step 3 — Prioritise by what's at stake</h2>
        <p>
          A 30% score in a topic worth 4 marks matters less than 45% in a topic worth 20. The analyser below orders
          topics by status first, then by <strong>marks at stake</strong> — the marks still available in that topic.
        </p>
        <GapAnalyser />
        <h2>Step 4 — Find the cause before you reteach</h2>
        <p>
          Low marks in a topic can come from a misunderstood concept, a shaky method, careless slips, misreading, or
          time pressure. Each needs a different response, and reteaching the whole chapter only fixes the first. Our{" "}
          <Link href="/resources/interpreting-repeated-mistakes">guide to repeated mistakes</Link> shows how to tell them
          apart.
        </p>
        <h2>Step 5 — Plan a follow-up check</h2>
        <p>
          Practice is only useful if it closes the gap. Schedule a short follow-up on the same topics two to four weeks
          later, then compare fairly using the{" "}
          <Link href="/resources/comparing-assessments">assessment comparison guide</Link>.
        </p>
      </>
    ),
    sources: [SRC.blackWiliam, SRC.dunlosky],
    limitations:
      "Topic percentages from a single test are based on few questions and can change a lot from test to test. The thresholds are a practical convention, not a validated standard. The analyser does not detect the cause of low marks.",
  },

  "student-progress-report-template": {
    body: (
      <>
        <p>
          Parents and students usually receive a total mark and a rank. Neither tells them what to do next. A short
          topic-level report, with before-and-after results and agreed next steps, makes the conversation specific —
          and makes real progress visible even when the total barely moves.
        </p>
        <h2>What makes a progress report useful</h2>
        <ul>
          <li><strong>Topic-level results</strong>, so improvement in one area isn't hidden by a dip in another.</li>
          <li><strong>Comparable assessments</strong> — the follow-up should test the same topics at similar difficulty.</li>
          <li><strong>Strengths first</strong>, written as specific behaviours, not generic praise.</li>
          <li><strong>Two or three next steps</strong>, each concrete enough to check later.</li>
        </ul>
        <ReportTemplate />
        <h2>Tips for sharing it</h2>
        <ol>
          <li>Go through it with the student before it goes home, so there are no surprises.</li>
          <li>Avoid comparing with other students; compare with the student's own earlier result.</li>
          <li>If a topic declined, say so plainly and explain what you'll do about it.</li>
          <li>Check whether the two tests were comparable before celebrating or worrying — see the{" "}
            <Link href="/resources/comparing-assessments">comparison guide</Link>.</li>
        </ol>
        <h2>Privacy note</h2>
        <p>
          The template runs entirely in your browser. Nothing you type is uploaded to Heramb.study. If you save the PDF,
          store and share it according to your institute's data-protection policy.
        </p>
      </>
    ),
    sources: [SRC.blackWiliam],
    limitations:
      "The status labels use simple thresholds and don't account for test difficulty. The template does not save your work — printing or saving as PDF is the only way to keep it.",
  },

  "comparing-assessments": {
    body: (
      <>
        <p>
          "Average went up from 60% to 66%" sounds like progress. It might be. It might also be an easier paper, a
          different mix of topics, or normal variation. Before reporting improvement — to a student, a parent or your
          management — check three things.
        </p>
        <h2>1. Are the tests comparable?</h2>
        <p>
          Compare like with like: the same topics, similar question types, similar length and time limit. A follow-up
          check that only includes the topics you practised is fine, as long as you compare it against the same topics
          in the first test — not against the whole first paper.
        </p>
        <h2>2. Compare topic by topic, not totals</h2>
        <p>
          A stable total can hide a big gain in one topic and a loss in another. Topic-level comparison shows both, and
          tells you where your teaching made a difference.
        </p>
        <h2>3. Allow a margin for noise</h2>
        <p>
          Two different tests are never exactly equal, and students have good and bad days. Treat small changes — a few
          percentage points — as <strong>no clear change</strong>. The calculator lets you choose the margin. Use a
          wider margin when topics have only a handful of questions.
        </p>
        <AssessmentComparer />
        <h2>What to do with the result</h2>
        <ul>
          <li><strong>Improved</strong>: move the topic to maintenance — occasional mixed practice.</li>
          <li><strong>No clear change</strong>: check whether the practice targeted the actual cause of mistakes.</li>
          <li><strong>Declined</strong>: first check the questions were comparable; then look at the mistake types.</li>
        </ul>
        <p>
          Record results in a <Link href="/resources/student-progress-report-template">progress report</Link> so the
          student can see the change too.
        </p>
      </>
    ),
    sources: [SRC.blackWiliam],
    limitations:
      "The margin is a judgement call, not a statistical significance test. For formal evaluation of an intervention, use a proper study design with comparable groups.",
  },

  "interpreting-repeated-mistakes": {
    body: (
      <>
        <p>
          When the same student gets the same kind of question wrong twice, the instinct is to reteach the topic. That
          works for one kind of mistake. For the other four, it wastes time — and can make a student who already
          understands the idea feel they don't.
        </p>
        <h2>Five types of mistake</h2>
        <table>
          <thead><tr><th scope="col">Type</th><th scope="col">How it shows up</th><th scope="col">What helps</th></tr></thead>
          <tbody>
            {MISTAKE_TYPES.map((t) => (
              <tr key={t.key}><td><strong>{t.label}</strong></td><td>{t.sign}</td><td>{t.response}</td></tr>
            ))}
          </tbody>
        </table>
        <h2>How to tell them apart</h2>
        <ol>
          <li><strong>Read the working, not only the answer.</strong> Where does it first go wrong?</li>
          <li><strong>Ask the student to explain one wrong answer.</strong> If they spot the error immediately, it's
            probably careless or misreading; if they defend the wrong approach, it's likely a concept gap.</li>
          <li><strong>Try it untimed.</strong> If they get it right without the clock, time pressure is the issue.</li>
          <li><strong>Look across questions.</strong> One slip is noise. The same type of error three times is a pattern.</li>
        </ol>
        <MistakeTally />
        <h2>Building a "repeat mistakes" habit</h2>
        <p>
          Ask students to keep a single page listing mistakes they've made more than once, with the corrected version
          and the type. Reviewing it before each test is quick and directly targets the habits most likely to cost marks.
          The <Link href="/resources/assessment-readiness-diagnostic">readiness diagnostic</Link> includes this habit.
        </p>
      </>
    ),
    sources: [SRC.blackWiliam, SRC.dunlosky],
    limitations:
      "These categories are a practical teaching framework, not a validated diagnostic scheme. Some mistakes fit more than one type, and a student's explanation is the best evidence of the cause.",
  },
};
