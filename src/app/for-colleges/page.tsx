import { AudiencePage } from "@/components/marketing/AudiencePage";
import { collegesContent } from "@/content/audiences";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "For colleges: unit-wise gaps from internal tests",
  description:
    "Turn internal assessment and mid-semester marks into unit-wise gap maps, remedial groups and before-and-after evidence. Free pilot for colleges; no system change.",
  path: "/for-colleges",
});

export default function ForCollegesPage() {
  return <AudiencePage c={collegesContent} />;
}
