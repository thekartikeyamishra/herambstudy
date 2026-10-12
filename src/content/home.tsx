import Link from "next/link";
import type { Faq } from "@/components/marketing/Sections";

export const homeFaqs: Faq[] = [
  {
    q: "Is Heramb.study available to use today?",
    a: (
      <p>
        Not the full platform yet. Today you can use the free resources on this site and request an invite. The student
        practice app and teacher dashboard are in development, and we'll invite people in small groups as each part
        becomes ready. We haven't set a public launch date.
      </p>
    ),
  },
  {
    q: "Will it improve my students' marks or my institute's results?",
    a: (
      <p>
        We can't promise that, and you should be wary of anyone who does. Heramb.study is designed to make learning gaps
        and progress visible so teachers can act on them. Whether results improve depends on teaching, practice and many
        factors outside any software. During pilots we'll measure what actually changes and share it honestly.
      </p>
    ),
  },
  {
    q: "Do we have to replace our current software or test series?",
    a: (
      <p>
        No. The plan is for Heramb.study to work alongside what you already use — starting from your own tests and
        results. See <Link href="/for-institutes">how an institute can evaluate it</Link> without switching systems.
      </p>
    ),
  },
  {
    q: "Is AI writing the questions? How do you check them?",
    a: (
      <p>
        Some practice questions may be drafted with AI assistance. Any such question is reviewed before students see it,
        and every question will have a "report a problem" option. We explain our review approach and its limits on{" "}
        <Link href="/trust">our approach page</Link>.
      </p>
    ),
  },
  {
    q: "What happens to the data I submit in the invite form?",
    a: (
      <p>
        It's stored securely and used only to manage invitations — and for product updates if you separately opt in. We
        never sell it, and you can ask us to delete it at any time. Details are in the{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    ),
  },
  {
    q: "How much will it cost?",
    a: (
      <p>
        Pricing hasn't been decided, and nothing is for sale today. Invited pilot users won't be charged without clear
        notice and their explicit agreement.
      </p>
    ),
  },
  {
    q: "Which exams and subjects will you support first?",
    a: (
      <p>
        We're starting with JEE and NEET preparation (Physics, Chemistry, Biology and Mathematics), because that's where
        we're validating the product with coaching centres first. Other exams and international curricula will follow
        only once there's demonstrated demand.
      </p>
    ),
  },
];
