import { AudiencePage } from "@/components/marketing/AudiencePage";
import { schoolsContent } from "@/content/audiences";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "For schools: topic-wise gaps from every unit test",
  description:
    "Turn unit-test marks into topic-wise gap maps, reteach groups and parent-friendly reports. Free for schools; works alongside your ERP.",
  path: "/for-schools",
});

export default function ForSchoolsPage() {
  return <AudiencePage c={schoolsContent} />;
}
