import { AudiencePage } from "@/components/marketing/AudiencePage";
import { schoolsContent } from "@/content/audiences";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "For schools: topic-wise learning gaps from every unit test",
  description:
    "Turn unit and periodic test marks into topic-wise gap maps, reteach groups, parent-friendly reports and proof of progress. Free pilot for schools; works alongside your ERP.",
  path: "/for-schools",
});

export default function ForSchoolsPage() {
  return <AudiencePage c={schoolsContent} />;
}
