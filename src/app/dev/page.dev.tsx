/**
 * DEVELOPER CONSOLE — only exists when developer tools are enabled at build time
 * (".dev.tsx" extension, see next.config.ts) and answers 404 otherwise.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { DevConsole, type BackupFile, type FixtureFile, type LinkCase } from "@/components/dev/DevConsole";
import { Callout } from "@/components/ui/Primitives";
import { devToolsEnabled } from "@/config/devtools";
import { siteConfig } from "@/config/site";
import { environmentStatus } from "@/lib/server/devState";

export const dynamic = "force-dynamic";
export const metadata = { title: "Developer console", robots: { index: false, follow: false } };

async function readFixtures(): Promise<{ fixtures: FixtureFile[]; backups: BackupFile[]; links: LinkCase[]; error: string | null }> {
  const dir = join(process.cwd(), "tests/fixtures");
  try {
    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")) as Omit<FixtureFile, "content">[];
    const backupList = JSON.parse(await readFile(join(dir, "backups.json"), "utf8")) as Omit<BackupFile, "content">[];
    const links = JSON.parse(await readFile(join(dir, "report-links.json"), "utf8")) as LinkCase[];
    const fixtures = await Promise.all(manifest.map(async (f) => ({ ...f, content: await readFile(join(dir, f.file), "utf8") })));
    const backups = await Promise.all(backupList.map(async (b) => ({ ...b, content: await readFile(join(dir, b.file), "utf8") })));
    return { fixtures, backups, links, error: null };
  } catch {
    return { fixtures: [], backups: [], links: [], error: "Test files aren't available in this deployment. Use the test kit download instead." };
  }
}

export default async function DevPage() {
  if (!devToolsEnabled()) notFound();
  const { fixtures, backups, links, error } = await readFixtures();
  return (
    <section className="container py-10 sm:py-14">
      <p className="eyebrow">Developer tools · not in production builds</p>
      <h1 className="mt-3 text-display-lg">Developer console</h1>
      <p className="lede mt-3 max-w-3xl">
        Everything needed to test Heramb.study: what's switched on, where every feature lives and when it appears, seed data,
        submissions, the email inbox, test files and plan access.
      </p>
      {error ? <Callout tone="warn" className="mt-6">{error}</Callout> : null}
      <div className="mt-8">
        <DevConsole env={environmentStatus()} fixtures={fixtures} backups={backups} links={links} siteUrl={siteConfig.url} />
      </div>
    </section>
  );
}
