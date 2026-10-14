// DEVELOPMENT ONLY — this file is excluded from production builds (pageExtensions in next.config.ts),
// and also refuses to render if NODE_ENV is "production".
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailLinkTool, LocalDataTools, ServerResetButtons } from "@/components/dev/DevClientTools";
import { indexableRoutes } from "@/config/routes";
import { devToolsEnabled } from "@/lib/dev/env";
import { envSummary, featureMap, type Status } from "@/lib/dev/featureMap";
import { listFixtures } from "@/lib/dev/fixtures";
import { devMemorySnapshot } from "@/lib/server/backend";
import { devOutbox } from "@/lib/server/email";
import { analyseClass, buildDataset, parseTable, sampleCsv } from "@/lib/tools/classAnalysis";
import { buildReports, encodeReport } from "@/lib/tools/studentReport";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Developer hub", robots: { index: false, follow: false } };

const chip: Record<Status, string> = {
  on: "bg-good-tint text-good border-good/30",
  off: "bg-warn-tint text-warn border-warn/30",
  always: "bg-brand-tint text-brand-strong border-brand/20",
  planned: "bg-paper-sunk text-ink-muted border-line",
};
const chipLabel: Record<Status, string> = { on: "Visible now", off: "Hidden now", always: "Always", planned: "Not built" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="card p-5 sm:p-6">
      <h2 id={`${id}-t`} className="font-sans text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DevHubPage() {
  if (!devToolsEnabled()) notFound();

  const env = envSummary();
  const features = featureMap(env);
  const memory = devMemorySnapshot();
  const outbox = devOutbox();
  const fixtures = listFixtures();

  const sample = buildDataset(parseTable(sampleCsv())).dataset!;
  const report = buildReports(sample, analyseClass(sample), { institute: "Fictional Classes", test: "Unit test (fictional)", date: "2026-08-01" }).find((r) => r.s === "R08")!;

  const hidden = [
    { href: `/r#${encodeReport(report)}`, label: "/r — student report (fictional R08)" },
    { href: "/r#broken-link", label: "/r — tampered/incomplete link" },
    { href: "/me", label: "/me — student's saved progress" },
    { href: "/email/confirm", label: "/email/confirm — without a token" },
    { href: "/email/unsubscribe", label: "/email/unsubscribe — without a token" },
    { href: "/offline", label: "/offline — offline fallback page" },
    { href: "/this-page-does-not-exist", label: "404 page" },
    { href: "/dev/crash", label: "Error page (intentional crash)" },
    { href: "/pilot?type=college", label: "/pilot with institution pre-selected" },
    { href: "/contact?topic=privacy_request", label: "/contact with topic pre-selected" },
    { href: "/api/health", label: "/api/health — storage status JSON" },
    { href: "/sitemap.xml", label: "/sitemap.xml" },
    { href: "/robots.txt", label: "/robots.txt (blocks everything on localhost — expected)" },
    { href: "/manifest.webmanifest", label: "/manifest.webmanifest" },
    { href: "/opengraph-image", label: "/opengraph-image — social share image" },
  ];

  const envRows: Array<[string, string, boolean]> = [
    ["Storage", env.storage, env.storage !== "unavailable"],
    ["Email", env.email === "outbox" ? "dev outbox (captured below, never sent)" : env.email, env.email !== "off"],
    ["Signed email links", env.emailLinks ? "on" : "off", env.emailLinks],
    ["Pilot alerts to owner", env.ownerAlerts ? "on" : "off", env.ownerAlerts],
    ["AI provider", env.ai, !env.ai.startsWith("none")],
    ["Analytics (GA4)", env.analytics ? "configured" : "off", env.analytics],
    ["AdSense", env.ads ? "configured" : env.adsPreview ? "off · preview box ON" : "off", env.ads || env.adsPreview],
    ["Store links", `${env.googlePlay ? "Play ✓" : "Play —"} · ${env.appStore ? "App Store ✓" : "App Store —"}`, env.googlePlay || env.appStore],
    ["Site URL", env.siteUrl, true],
  ];

  return (
    <div className="container max-w-6xl space-y-6 py-10">
      <div role="note" className="rounded-2xl border-2 border-warn/40 bg-warn-tint px-5 py-4 text-sm text-ink" data-testid="dev-banner">
        <strong>Developer hub — local development only.</strong> This page and every <code>/api/dev/*</code> route are excluded from
        production builds and return 404 there. Settings shown come from <code>.env.development.local</code>; secrets are never displayed.
      </div>
      <h1 className="text-display-lg">Developer hub</h1>
      <nav aria-label="Hub sections" className="flex flex-wrap gap-2 text-sm">
        {[["#env", "Environment"], ["#features", "Feature map"], ["#pages", "All pages"], ["#local", "Browser data"], ["#server", "Submissions"], ["#outbox", "Email outbox"], ["#links", "Email links"], ["#fixtures", "Test files"]].map(([h, l]) => (
          <a key={h} href={h} className="rounded-full border border-line-strong px-3 py-1.5 hover:bg-paper-sunk">{l}</a>
        ))}
      </nav>

      <Section id="env" title="Environment">
        <dl className="grid gap-2 sm:grid-cols-2" data-testid="dev-env">
          {envRows.map(([k, v, on]) => (
            <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
              <dt className="font-medium text-ink">{k}</dt>
              <dd className={cn("text-right", on ? "text-good" : "text-ink-muted")}>{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="features" title="Feature map — what users see, and when">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm" data-testid="dev-features">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Feature</th>
                <th scope="col" className="py-2 pr-3 font-medium">Where</th>
                <th scope="col" className="py-2 pr-3 font-medium">Users see it when…</th>
                <th scope="col" className="py-2 pr-3 font-medium">Here</th>
                <th scope="col" className="py-2 font-medium">To test locally</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.name} className="border-b border-line align-top">
                  <th scope="row" className="py-2 pr-3 font-medium text-ink">{f.name}</th>
                  <td className="py-2 pr-3 font-mono text-xs">{f.where.startsWith("/") && !f.where.includes(",") && !f.where.includes("#") && !f.where.includes("<") ? <Link className="text-brand underline" href={f.where}>{f.where}</Link> : f.where}</td>
                  <td className="py-2 pr-3 text-ink-soft">{f.showsWhen}</td>
                  <td className="py-2 pr-3"><span className={cn("inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", chip[f.status])}>{chipLabel[f.status]}</span></td>
                  <td className="py-2 text-ink-muted">{f.enable ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="pages" title="All pages, including ones not in the navigation">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-ink-muted">Public (in sitemap)</h3>
            <ul className="mt-2 columns-2 gap-4 text-sm">
              {indexableRoutes().map((r) => (
                <li key={r.path}><Link className="text-brand underline" href={r.path}>{r.path}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-ink-muted">Hidden / special</h3>
            <ul className="mt-2 space-y-1 text-sm" data-testid="dev-hidden-pages">
              {hidden.map((h) => (
                <li key={h.label}><a className="text-brand underline" href={h.href}>{h.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="local" title="Browser data (this device only)">
        <LocalDataTools />
      </Section>

      <Section id="server" title="Submissions (in-memory store)">
        <ServerResetButtons />
        {memory ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-3" data-testid="dev-memory">
            <div>
              <h3 className="font-semibold">Invite requests ({memory.invites.length})</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {memory.invites.map((i) => {
                  const m = i.consentRecords.marketingUpdates;
                  return (
                    <li key={i.requestId} className="rounded-lg border border-line px-2 py-1">
                      {i.normalizedEmail} · {i.role} · {i.country}
                      <span className="block text-xs text-ink-muted">
                        updates: {m.granted ? (m.withdrawnAt ? "unsubscribed" : m.confirmedAt ? "confirmed" : "awaiting confirmation") : "no"} · duplicates: {i.duplicateAttempts}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Pilot applications ({memory.pilots.length})</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {memory.pilots.map((p, n) => (
                  <li key={n} className="rounded-lg border border-line px-2 py-1">{p.instituteName} · {p.institutionType} · {p.city}<span className="block text-xs text-ink-muted">{p.email} · ₹ {p.priceComfort ?? "—"}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Contact messages ({memory.contacts.length})</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {memory.contacts.map((c, n) => (
                  <li key={n} className="rounded-lg border border-line px-2 py-1">{c.topic} · {c.email}<span className="block truncate text-xs text-ink-muted">{c.message}</span></li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            The in-memory store isn't active ({env.storage}). Set <code>DEV_MEMORY_STORE=true</code> to inspect submissions here. With Firebase
            configured, check the Firebase console or <code>npm run waitlist -- export</code>.
          </p>
        )}
      </Section>

      <Section id="outbox" title={`Email outbox (${outbox.length})`}>
        {env.email !== "outbox" ? (
          <p className="text-sm text-ink-muted">Set <code>EMAIL_DEV_OUTBOX=true</code> to capture emails here instead of sending them.</p>
        ) : outbox.length === 0 ? (
          <p className="text-sm text-ink-muted">No emails yet. Submit an invite (new address) or a pilot application.</p>
        ) : (
          <ul className="space-y-3" data-testid="dev-outbox">
            {outbox.map((m, n) => (
              <li key={n} className="rounded-xl border border-line p-3 text-sm">
                <p className="font-semibold text-ink">{m.subject}</p>
                <p className="text-xs text-ink-muted">To {m.to} · from {m.from} · {m.at}{m.headers?.["List-Unsubscribe"] ? " · has one-click unsubscribe header" : ""}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-brand">Show email</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-paper-sunk p-3 text-xs">{m.text}</pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="links" title="Signed email links (double opt-in testing)">
        <EmailLinkTool enabled={env.emailLinks} />
      </Section>

      <Section id="fixtures" title={`Test files (${fixtures.length})`}>
        <p className="text-sm text-ink-soft">
          From <code>test-fixtures/</code> (never deployed). <code>test-fixtures/README.md</code> lists the expected result for each file; <code>npm test</code> checks every one automatically.
        </p>
        <ul className="mt-3 columns-1 gap-6 text-sm md:columns-2" data-testid="dev-fixtures">
          {fixtures.map((f) => (
            <li key={f.path} className="break-inside-avoid py-0.5">
              <a className="text-brand underline" href={`/api/dev/fixtures/${f.path}`}>{f.path}</a> <span className="text-xs text-ink-muted">({(f.bytes / 1024).toFixed(1)} KB)</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
