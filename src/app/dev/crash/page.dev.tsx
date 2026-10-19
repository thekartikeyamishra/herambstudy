/** DEVELOPER TOOLS ONLY — deliberately fails so the error page can be checked. */
import { notFound } from "next/navigation";
import { devToolsEnabled } from "@/config/devtools";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default function CrashPage(): never {
  if (!devToolsEnabled()) notFound();
  throw new Error("Deliberate test error from /dev/crash");
}
