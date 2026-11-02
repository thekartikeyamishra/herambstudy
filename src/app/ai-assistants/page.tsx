import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { Callout, PageHeader } from "@/components/ui/Primitives";
import { absoluteUrl } from "@/config/site";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Use Heramb in ChatGPT, Grok and Claude",
  description: "Paste a class test's marks into ChatGPT, Grok or Claude and get Heramb's chapter-wise teaching plan right in the chat. Free; nothing is stored.",
  path: "/ai-assistants",
});

const MCP_URL = absoluteUrl("/api/mcp");

export default function AiAssistantsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "AI assistants", path: "/ai-assistants" }])} />
      <PageHeader
        eyebrow="AI assistants"
        title="Heramb inside the AI chat you already use."
        lede="Paste a test's marks into ChatGPT, Grok or Claude and ask what to reteach. Heramb's analyser answers with a chapter-wise teaching plan, the students who need a recap, and whether reteaching worked."
      />
      <section className="section">
        <div className="container max-w-3xl">
          <div className="prose-heramb max-w-none">
            <h2>What you can ask</h2>
            <ul>
              <li>“Analyse this test and tell me what to reteach.” Paste roll numbers and chapter-wise marks, with a MAX row.</li>
              <li>“These are question-wise marks. Q1–10 are Kinematics, Q11–20 Laws of motion.” Works with OMR answers and an answer key too.</li>
              <li>“Here's the follow-up test. Did reteaching work?”</li>
            </ul>

            <h2>Connect it</h2>
            <p>The connector address (an MCP server) is:</p>
            <p><code data-testid="mcp-url">{MCP_URL}</code></p>
            <h3>Claude</h3>
            <p>Settings → Connectors → Add custom connector → paste the address above. No sign-in is needed.</p>
            <h3>Grok</h3>
            <p>On grok.com, open Connectors → New connector → Custom, and paste the address above. Custom connectors need a paid Grok plan.</p>
            <h3>ChatGPT</h3>
            <p>
              Heramb is being submitted to the ChatGPT app directory. Until it's listed, people with developer mode on can add it
              under Settings → Apps &amp; connectors → Create, using the same address.
            </p>

            <h2>Privacy</h2>
            <p>
              Marks you paste into an AI assistant are sent to Heramb only to calculate the plan, and the result goes straight
              back to the chat. Heramb stores nothing and needs no account. Use roll numbers rather than names. The assistant's
              own provider (OpenAI, xAI or Anthropic) handles your chat under its own terms. See our{" "}
              <Link href="/privacy">privacy policy</Link>.
            </p>
          </div>
          <Callout tone="neutral" className="mt-8">
            Prefer the full tool? Personal student report links, printable QR slips, the class tracker and the institute
            dashboard are on the website: <Link href="/resources/class-test-analyser" className="font-medium text-brand underline underline-offset-4">open the class test analyser</Link>.
          </Callout>
        </div>
      </section>
    </>
  );
}
