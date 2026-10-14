import Link from "next/link";
import type { AudienceContent } from "@/components/marketing/AudiencePage";
import type { Faq } from "@/components/marketing/Sections";

const ICONS = {
  map: "M4 19h16M7 15V9M12 15V5M17 15v-3",
  group: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20c0-3 2.5-5 5-5s5 2 5 5m-2-5c1-.6 2.2-1 3-1 2.5 0 5 2 5 5",
  report: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4",
  verify: "M4 12.5 9 17.5 20 6.5",
};

/** Questions every institution asks, answered honestly. */
const sharedFaqs: Faq[] = [
  { q: "What does it cost?", a: <p>The pilot is free. Any price afterwards is agreed in writing before anything is charged. There's no card on file and no auto-billing.</p> },
  { q: "What's the catch with free?", a: <p>We need real classrooms to build the right product. You get the tool; we get your honest feedback.</p> },
  { q: "Our teachers are already overloaded.", a: <p>That's the point. Teachers paste marks they've already entered — the analysis takes minutes instead of an evening. If it adds work during the pilot, we change it or you stop.</p> },
  { q: "Do we need new software, computers or training?", a: <p>No. It runs in a browser on a phone or laptop. One 30-minute walkthrough is enough for anyone who uses Excel or WhatsApp.</p> },
  { q: "We already have an ERP or LMS.", a: <p>Keep it. Heramb doesn't replace anything — it reads the results your current system already produces and tells you what they mean.</p> },
  { q: "Our ERP already gives a marks report.", a: <p>A marks report says <em>how much</em>. Heramb says <em>which topic</em>, <em>which students</em>, and <em>whether it improved</em> after reteaching.</p> },
  { q: "Will our results improve?", a: <p>We won't promise that, and you should be wary of anyone who does. We promise you'll see exactly where students struggle, sooner — and in the pilot we'll measure together what actually changes.</p> },
  { q: "Which other institutions use it?", a: <p>We're at the pilot stage — which is why the terms are this generous. Early partners shape the product instead of adapting to it.</p> },
  { q: "You're a startup. What if you shut down?", a: <p>You can export everything to Excel at any time. Nothing is held hostage, and the free tools run entirely in your browser.</p> },
  {
    q: "Is student data safe?",
    a: (
      <p>
        Students can be identified by roll number only. The free tools never upload anything. Pilot data is stored encrypted with strict access controls; we never sell data or show ads to students, and we delete data on request. We sign a data-processing agreement with you. Details are in our <Link href="/privacy">privacy policy</Link>.
      </p>
    ),
  },
  { q: "What about the DPDP Act and parental consent?", a: <p>The institution stays in control of its students' data. We provide a short notice template for parents, and before any student gets their own login we obtain consent where the law requires it.</p> },
  { q: "Is AI making decisions about our students?", a: <p>No. It suggests; teachers decide. Any AI-assisted practice question is checked by a person before students see it. See <Link href="/trust">our approach</Link>.</p> },
  { q: "Will students feel labelled or ranked?", a: <p>No ranks and no public comparison. Each student is compared only with their own earlier results.</p> },
  { q: "Management needs to approve this.", a: <p>We'll give you a one-page summary and the data agreement, ready for your board or management.</p> },
  { q: "What do you need from us?", a: <p>One coordinator, one class and subject, the test marks, two short check-ins, and honest feedback.</p> },
  { q: "What if it doesn't work for us?", a: <p>You stop. No cost, and you keep your data.</p> },
];

export const schoolsContent: AudienceContent = {
  path: "/for-schools",
  crumb: "For schools",
  pilotType: "school",
  eyebrow: "For schools",
  title: "Every unit test can tell you what to teach next.",
  lede: "Your teachers already set, check and enter every test. Heramb.study turns those marks into topic-wise gaps, reteach groups and clear progress reports — in minutes, alongside the systems you already use.",
  features: [
    { title: "Class gap map", icon: ICONS.map, body: <p>See which topics each section is weak in after every unit or periodic test, colour-coded at a glance.</p> },
    { title: "Reteach groups", icon: ICONS.group, body: <p>Know whether a topic needs the whole class retaught or a 15-minute recap with a few students — and who they are.</p> },
    { title: "Reports parents understand", icon: ICONS.report, body: <p>One page per student: strong topics, topics to work on, and a concrete next step — not just a total.</p> },
    { title: "Proof of progress", icon: ICONS.verify, body: <p>Compare a follow-up test with the first and see which learning gaps actually closed after reteaching.</p> },
  ],
  steps: [
    { t: "Pick a class and subject", d: "Any class from 6 to 12, any subject with topic-wise marks." },
    { t: "Share one test's marks", d: "Paste from Excel or Google Sheets, by roll number." },
    { t: "Reteach with a plan", d: "Use the gap map and groups to plan the next week." },
    { t: "Check what changed", d: "Run a short follow-up test and see which gaps closed." },
  ],
  whyNow: [
    "The marks already exist — today most of that information is thrown away after the total is recorded.",
    "Early schools shape how the product fits school timetables, periodic tests and report cards.",
    "Pilot places are limited by how many schools we can support properly.",
    "It supports the move towards competency-based assessment and holistic progress tracking encouraged by NEP 2020.",
    "You can tell parents something few schools can say truthfully: we track every child's gaps topic by topic.",
  ],
  fitNote: (
    <>
      Works with unit tests, periodic tests, half-yearlies and pre-boards — any test where marks can be split by topic. Try it
      now, free and without signing up: <Link href="/resources/class-test-analyser" className="font-medium text-brand underline underline-offset-4">class test analyser</Link>.
    </>
  ),
  faqs: [
    { q: "We're a school, not a coaching centre. Does this fit?", a: <p>Yes. Anything with topic-wise marks works — unit tests, periodic tests, pre-boards. Board exam preparation in Classes 10 and 12 is a natural fit.</p> },
    { q: "Will parents complain about another report?", a: <p>Parents usually complain about vague reports. "Strong in algebra, working on geometry, improving" builds trust rather than questions.</p> },
    ...sharedFaqs,
  ],
};

export const collegesContent: AudienceContent = {
  path: "/for-colleges",
  crumb: "For colleges",
  pilotType: "college",
  eyebrow: "For colleges",
  title: "See which units each section struggles with — and whether remedial classes worked.",
  lede: "You already run internal assessments and mid-semester exams. Heramb.study turns those marks, split by unit or module, into weak-unit maps, remedial groups and before-and-after evidence.",
  features: [
    { title: "Unit-wise gap map", icon: ICONS.map, body: <p>Every student against every unit or module, after each internal assessment or mid-sem.</p> },
    { title: "Remedial groups", icon: ICONS.group, body: <p>Know which units need a full revision lecture and which need a small remedial group — with the roll numbers.</p> },
    { title: "Student summaries", icon: ICONS.report, body: <p>A one-page summary per student for mentoring meetings: weak units and a next step.</p> },
    { title: "Before-and-after evidence", icon: ICONS.verify, body: <p>Compare assessments to see whether remedial classes closed the gaps — useful evidence when you document student progress.</p> },
  ],
  steps: [
    { t: "Pick a course and section", d: "Any course where internal marks can be split by unit or module." },
    { t: "Share one assessment's marks", d: "Paste from Excel, by roll number." },
    { t: "Plan remedial support", d: "Use the unit map and groups for the next classes." },
    { t: "Check what changed", d: "Compare the next assessment and see which gaps closed." },
  ],
  whyNow: [
    "Internal assessment marks already exist — usually only the totals get used.",
    "Early colleges shape how the product fits semesters, units and mentoring.",
    "Pilot places are limited by how many institutions we can support properly.",
    "Clear records of weak units and remedial outcomes help when you document student progress.",
  ],
  fitNote: (
    <>
      Treat each unit or module as a "topic". Heramb can help you gather evidence of student progress; it does not
      replace your NAAC, NBA or outcome-based-education processes. Try it now:{" "}
      <Link href="/resources/class-test-analyser" className="font-medium text-brand underline underline-offset-4">class test analyser</Link>.
    </>
  ),
  faqs: [
    { q: "Does it calculate CO-PO attainment for NBA or NAAC?", a: <p>No, not today. It shows unit-wise performance and before-and-after change, which can support your evidence, but it is not an accreditation tool. Tell us your format in the pilot application — it helps us decide what to build.</p> },
    { q: "Our marks are per question, not per unit.", a: <p>Add up the questions for each unit in your sheet first, then paste the unit totals. The template shows the format.</p> },
    ...sharedFaqs,
  ],
};
