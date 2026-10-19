"use client";

/**
 * DEVELOPER TOOLS ONLY — rendered by src/app/dev/page.dev.tsx, which is not part of
 * production builds. Nothing here is reachable on the live site.
 */
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";
import { downloadText } from "@/components/resources/ToolShell";
import { FEATURES, PLANS, type FeatureId } from "@/config/plans";
import { canUse } from "@/lib/entitlements";
import { saveReport } from "@/lib/client/studentStore";
import { loadWorkspace, mergeWorkspaces, parseBackup, saveErrorMessage, saveWorkspace } from "@/lib/client/workspace";
import { decodeReport } from "@/lib/tools/studentReport";
import { cn } from "@/lib/cn";
import type { EnvItem } from "@/lib/server/devState";
import { FEATURE_MAP } from "./featureMap";

export type FixtureFile = { file: string; title: string; area: string; type: string; where: string; how: string; expected: string; content: string };
export type BackupFile = { file: string; title: string; ok: boolean; expected: string; content: string };
export type LinkCase = { case: string; fragment: string; valid: boolean; expected: string };

type Snapshot = {
  storage: string;
  invites: Array<Record<string, unknown>>;
  contacts: Array<Record<string, unknown>>;
  pilots: Array<Record<string, unknown>>;
  outbox: Array<{ id: number; to: string; subject: string; text: string; capturedAt: string }>;
};

const stateTone = { on: "good", dev: "brand", off: "neutral" } as const;
const stateLabel = { on: "On", dev: "Dev", off: "Off" } as const;

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-line py-10">
      <h2 id={`${id}-title`} className="text-display-md">{title}</h2>
      {intro ? <p className="mt-2 max-w-3xl text-ink-soft">{intro}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Email text with links made clickable; links to the configured site URL open on this machine instead. */
function EmailBody({ text, siteUrl }: { text: string; siteUrl: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-paper-sunk p-4 font-sans text-sm text-ink-soft">
      {parts.map((p, i) => {
        if (!/^https?:\/\//.test(p)) return <span key={i}>{p}</span>;
        const local = p.startsWith(siteUrl) ? p.slice(siteUrl.length) || "/" : p;
        return local.startsWith("/") ? (
          <a key={i} href={local} className="font-medium text-brand underline underline-offset-4">{local.length > 70 ? `${local.slice(0, 70)}…` : local}</a>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </pre>
  );
}

export function DevConsole({
  env,
  fixtures,
  backups,
  links,
  siteUrl,
}: {
  env: EnvItem[];
  fixtures: FixtureFile[];
  backups: BackupFile[];
  links: LinkCase[];
  siteUrl: string;
}) {
  const [origin, setOrigin] = useState("");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/state", { cache: "no-store" });
      setSnap(res.ok ? ((await res.json()) as Snapshot) : null);
    } catch {
      setSnap(null);
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    void refresh();
  }, [refresh]);

  function say(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 6000);
  }

  function seedTracker() {
    const demo = backups.find((b) => b.ok);
    const parsed = demo ? parseBackup(demo.content) : null;
    if (!parsed || !parsed.ok) return say("Demo backup could not be read.");
    const merged = mergeWorkspaces(loadWorkspace().workspace, parsed.workspace);
    const r = saveWorkspace(merged.workspace);
    say(r.ok ? `Added ${merged.added} demo classes to the tracker on this browser.` : saveErrorMessage(r.reason));
  }

  function seedStudent() {
    const base = links.find((l) => l.valid);
    const r = base ? decodeReport(base.fragment) : null;
    if (!r) return say("Demo report could not be read.");
    const history = [
      { ...r, t: "Unit test 1", d: "2026-07-01", p: r.p.map((x) => (x === null ? null : Math.max(0, x - 15))) },
      { ...r, t: "Unit test 2", d: "2026-08-01", p: r.p.map((x) => (x === null ? null : Math.max(0, x - 6))) },
      r,
    ];
    const results = history.map((h) => saveReport(h));
    say(results.includes("unavailable") ? "This browser isn't allowing storage." : "Saved 3 demo reports — open My progress.");
  }

  function clearLocal() {
    try {
      const keys = Object.keys(window.localStorage).filter((k) => k.startsWith("heramb."));
      keys.forEach((k) => window.localStorage.removeItem(k));
      say(`Cleared ${keys.length} Heramb item(s) from this browser (tracker, student history, consent choice, sender name).`);
    } catch {
      say("This browser isn't allowing storage.");
    }
  }

  async function resetServer() {
    await fetch("/api/dev/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset" }) });
    await refresh();
    say("Cleared in-memory submissions, the dev inbox and rate limits.");
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      say("Copying isn't allowed here — use Download instead.");
    }
  }

  const groups = Array.from(new Set(FEATURE_MAP.map((f) => f.group)));
  const envByKey = Object.fromEntries(env.map((e) => [e.key, e]));
  const featureIds = Object.keys(FEATURES) as FeatureId[];

  return (
    <div>
      <nav aria-label="Console sections" className="flex flex-wrap gap-2 text-sm">
        {[
          ["#environment", "Environment"],
          ["#features", "Feature map"],
          ["#seed", "Seed & reset"],
          ["#server", "Submissions & inbox"],
          ["#files", "Test files"],
          ["#links", "Report-link cases"],
          ["#plans", "Plan matrix"],
          ["#safety", "Production safety"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full border border-line-strong px-4 py-2 font-medium text-ink hover:bg-paper-sunk">{label}</a>
        ))}
      </nav>

      {notice ? (
        <div role="status" className="sticky top-20 z-30 mt-4 rounded-xl border border-good/30 bg-good-tint px-4 py-3 text-sm text-ink" data-testid="dev-notice">{notice}</div>
      ) : null}

      <Section id="environment" title="Environment" intro="What is switched on right now. Secrets are never shown — only whether they are set.">
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm" data-testid="dev-env">
            <thead className="bg-paper-raised text-xs uppercase tracking-wider text-ink-muted">
              <tr><th scope="col" className="px-4 py-2 font-medium">Integration</th><th scope="col" className="px-4 py-2 font-medium">State</th><th scope="col" className="px-4 py-2 font-medium">Detail</th><th scope="col" className="px-4 py-2 font-medium">How to change</th></tr>
            </thead>
            <tbody>
              {env.map((e) => (
                <tr key={e.key} className="border-t border-line align-top">
                  <th scope="row" className="px-4 py-2 font-medium text-ink">{e.label}</th>
                  <td className="px-4 py-2"><Badge tone={stateTone[e.state]}>{stateLabel[e.state]}</Badge></td>
                  <td className="px-4 py-2 text-ink-soft">{e.detail}</td>
                  <td className="px-4 py-2 text-ink-muted">{e.howToChange}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-muted">Environment variables are read when the server starts — restart <code>npm run dev</code> after editing <code>.env.local</code>.</p>
      </Section>

      <Section id="features" title="Feature map" intro="Every feature, who it's for, where it lives, when it appears to users, and how to see it while testing.">
        {groups.map((g) => (
          <div key={g} className="mb-8">
            <h3 className="font-sans text-lg font-semibold">{g}</h3>
            <ul className="mt-3 space-y-3">
              {FEATURE_MAP.filter((f) => f.group === g).map((f) => {
                const live = f.envKey ? envByKey[f.envKey] : undefined;
                const path = f.where.startsWith("/") ? f.where.split(/[\s#?]/)[0] : null;
                return (
                  <li key={f.name} className="rounded-xl border border-line p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{f.name}</span>
                      <span className="flex items-center gap-2">
                        {live ? <Badge tone={stateTone[live.state]}>{`Here: ${stateLabel[live.state]}`}</Badge> : null}
                        {path && path !== "/r" ? <Link href={path} className="font-medium text-brand underline underline-offset-4">Open</Link> : null}
                      </span>
                    </div>
                    <dl className="mt-2 grid gap-x-6 gap-y-1 text-ink-soft sm:grid-cols-[8rem_1fr]">
                      <dt className="text-ink-muted">Who</dt><dd>{f.who}</dd>
                      <dt className="text-ink-muted">Where</dt><dd><code className="text-xs">{f.where}</code></dd>
                      <dt className="text-ink-muted">Appears when</dt><dd>{f.appears}</dd>
                      <dt className="text-ink-muted">Test it</dt><dd>{f.test}</dd>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </Section>

      <Section id="seed" title="Seed & reset (this browser)" intro="Tracker, student history and the consent choice live in this browser's storage. Seed realistic data or wipe it.">
        <div className="flex flex-wrap gap-3">
          <Button onClick={seedTracker} data-testid="seed-tracker">Tracker demo (2 classes, 4 tests)</Button>
          <Button variant="secondary" onClick={seedStudent} data-testid="seed-student">Student history (3 reports)</Button>
          <Button variant="secondary" onClick={clearLocal}>Clear all local Heramb data</Button>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Then open <Link href="/tracker" className="text-brand underline underline-offset-4">/tracker</Link> or{" "}
          <Link href="/me" className="text-brand underline underline-offset-4">/me</Link>. “Clear” also brings back the analytics banner (if GA is configured).
        </p>
      </Section>

      <Section id="server" title="Submissions & dev inbox" intro={snap ? `Storage here: ${snap.storage}. Data in Firestore isn't shown — use \`npm run waitlist -- export\` for that.` : "Loading…"}>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void refresh()}>Refresh</Button>
          <Button variant="ghost" onClick={() => void resetServer()}>Clear submissions, inbox & rate limits</Button>
        </div>
        {snap ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-sans text-lg font-semibold">Stored (in memory)</h3>
              {(
                [
                  ["Invite requests", snap.invites, (r: Record<string, unknown>) => `${r.normalizedEmail} · ${r.role} · ${r.country} · updates: ${(r.consentRecords as { marketingUpdates?: { granted?: boolean; confirmedAt?: unknown; withdrawnAt?: unknown } })?.marketingUpdates?.granted ? ((r.consentRecords as { marketingUpdates: { confirmedAt?: unknown; withdrawnAt?: unknown } }).marketingUpdates.withdrawnAt ? "unsubscribed" : (r.consentRecords as { marketingUpdates: { confirmedAt?: unknown } }).marketingUpdates.confirmedAt ? "confirmed" : "awaiting confirmation") : "no"} · duplicates: ${r.duplicateAttempts}`],
                  ["Pilot applications", snap.pilots, (r: Record<string, unknown>) => `${r.instituteName} (${r.institutionType}) · ${r.city} · ${r.email}`],
                  ["Contact messages", snap.contacts, (r: Record<string, unknown>) => `${r.topic} · ${r.email} · “${String(r.message).slice(0, 60)}”`],
                ] as const
              ).map(([label, rows, fmt]) => (
                <div key={label} className="mt-4">
                  <p className="text-sm font-semibold text-ink">{label} ({rows.length})</p>
                  {rows.length ? (
                    <ul className="mt-1 space-y-1 text-sm text-ink-soft" data-testid={`dev-${label.split(" ")[0]!.toLowerCase()}`}>
                      {rows.map((r, i) => <li key={i} className="rounded-lg bg-paper-sunk px-3 py-2">{fmt(r)}</li>)}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-muted">None yet.</p>
                  )}
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-sans text-lg font-semibold">Dev inbox ({snap.outbox.length})</h3>
              <p className="text-sm text-ink-muted">Emails the site would send. Links open on this machine.</p>
              {snap.outbox.length ? (
                <ul className="mt-3 space-y-3" data-testid="dev-inbox">
                  {snap.outbox.map((m) => (
                    <li key={m.id}>
                      <details className="rounded-xl border border-line p-4">
                        <summary className="cursor-pointer text-sm">
                          <span className="font-semibold text-ink">{m.subject}</span>
                          <span className="block text-ink-muted">to {m.to} · {new Date(m.capturedAt).toLocaleTimeString()}</span>
                        </summary>
                        <EmailBody text={m.text} siteUrl={siteUrl} />
                      </details>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">Empty. Submit /invite (tick product updates) or /pilot to see emails here.</p>
              )}
            </div>
          </div>
        ) : null}
      </Section>

      <Section id="files" title="Test files" intro="Each file targets one behaviour. Expected results are checked automatically by tests/unit/fixtures.test.ts, so these descriptions can't go stale.">
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm" data-testid="dev-files">
            <thead className="bg-paper-raised text-xs uppercase tracking-wider text-ink-muted">
              <tr><th scope="col" className="px-3 py-2 font-medium">File</th><th scope="col" className="px-3 py-2 font-medium">Type</th><th scope="col" className="px-3 py-2 font-medium">What it tests</th><th scope="col" className="px-3 py-2 font-medium">Expected</th><th scope="col" className="px-3 py-2 font-medium"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {fixtures.map((f) => (
                <tr key={f.file} className="border-t border-line align-top">
                  <th scope="row" className="px-3 py-2 font-mono text-xs font-medium text-ink">{f.file}</th>
                  <td className="px-3 py-2"><Badge tone={f.type === "error" ? "gap" : f.type === "security" ? "warn" : f.type === "edge" ? "brand" : "good"}>{f.type}</Badge></td>
                  <td className="px-3 py-2 text-ink-soft">{f.title}<span className="block text-xs text-ink-muted">{f.how}</span></td>
                  <td className="px-3 py-2 text-ink-soft">{f.expected}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button type="button" className="font-medium text-brand underline underline-offset-4" onClick={() => downloadText(f.file, f.content, f.file.endsWith(".tsv") ? "text/tab-separated-values;charset=utf-8" : "text/csv;charset=utf-8")}>Download</button>{" "}
                    <button type="button" className="ml-2 font-medium text-ink-soft underline underline-offset-4" onClick={() => void copy(f.content, f.file)}>{copied === f.file ? "Copied ✓" : "Copy"}</button>
                  </td>
                </tr>
              ))}
              {backups.map((b) => (
                <tr key={b.file} className="border-t border-line align-top">
                  <th scope="row" className="px-3 py-2 font-mono text-xs font-medium text-ink">{b.file}</th>
                  <td className="px-3 py-2"><Badge tone={b.ok ? "good" : "gap"}>{b.ok ? "backup" : "bad backup"}</Badge></td>
                  <td className="px-3 py-2 text-ink-soft">{b.title}<span className="block text-xs text-ink-muted">/tracker → Import</span></td>
                  <td className="px-3 py-2 text-ink-soft">{b.expected}</td>
                  <td className="px-3 py-2"><button type="button" className="font-medium text-brand underline underline-offset-4" onClick={() => downloadText(b.file, b.content, "application/json")}>Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="links" title="Student report-link cases" intro="Valid and broken links, including phishing and tampering attempts. Broken ones must show the “link incomplete” page.">
        <ul className="space-y-2" data-testid="dev-links">
          {links.map((l) => (
            <li key={l.case} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3 text-sm">
              <span><Badge tone={l.valid ? "good" : "gap"}>{l.valid ? "should open" : "should reject"}</Badge> <span className="ml-2 font-medium text-ink">{l.case}</span><span className="block text-ink-muted">{l.expected}</span></span>
              <a href={`${origin}/r${l.fragment ? `#${l.fragment}` : ""}`} target="_blank" rel="noopener" className="font-medium text-brand underline underline-offset-4">Open<span className="sr-only"> {l.case} (new tab)</span></a>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="plans" title="Plan matrix" intro="What each plan can use today (feature included in the plan AND built). “Pilot” features unlock only for pilot partners.">
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm" data-testid="dev-plans">
            <thead className="bg-paper-raised text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Feature</th>
                <th scope="col" className="px-3 py-2 font-medium">Status</th>
                {PLANS.map((p) => <th key={p.id} scope="col" className="px-3 py-2 font-medium">{p.name}</th>)}
                <th scope="col" className="px-3 py-2 font-medium">Institute (pilot partner)</th>
              </tr>
            </thead>
            <tbody>
              {featureIds.map((f) => (
                <tr key={f} className="border-t border-line">
                  <th scope="row" className="px-3 py-2 font-medium text-ink">{FEATURES[f].label}</th>
                  <td className="px-3 py-2"><Badge tone={FEATURES[f].availability === "available" ? "good" : FEATURES[f].availability === "pilot" ? "brand" : "neutral"}>{FEATURES[f].availability}</Badge></td>
                  {PLANS.map((p) => (
                    <td key={p.id} className={cn("px-3 py-2 text-center", canUse(p.id, f) ? "text-good" : "text-ink-muted")}>{canUse(p.id, f) ? "✓" : p.features.includes(f) ? "later" : "—"}</td>
                  ))}
                  <td className="px-3 py-2 text-center">{canUse("institute", f, { pilotPartner: true }) ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-ink-muted">“later” = included in the plan but not built yet. Change plans in <code>src/config/plans.ts</code>.</p>
      </Section>

      <Section id="safety" title="Production safety" intro="This console, its APIs, the dev inbox and the dev link-signing secret never reach the live site:">
        <ol className="list-decimal space-y-2 pl-5 text-ink-soft">
          <li><strong className="text-ink">Not compiled:</strong> dev routes are <code>*.dev.tsx</code> files, which are only pages when developer tools are on at build time (<code>next.config.ts → pageExtensions</code>).</li>
          <li><strong className="text-ink">Runtime gate:</strong> every dev route checks <code>devToolsEnabled()</code> and answers 404 otherwise. It is never true on the production deployment or on heramb.study, even if <code>HERAMB_DEV_TOOLS</code> is set there.</li>
          <li><strong className="text-ink">Build check:</strong> <code>npm run build</code> runs <code>scripts/assert-no-devtools.mjs</code> and fails if a dev route appears in a production build.</li>
        </ol>
        <p className="mt-4 text-sm text-ink-muted">To use this console on a Vercel <em>preview</em> deployment, set <code>HERAMB_DEV_TOOLS=true</code> for the Preview environment only.</p>
        <p className="mt-2 text-sm"><Link href="/dev/crash" className="font-medium text-brand underline underline-offset-4">Open /dev/crash</Link> <span className="text-ink-muted">to see the error page.</span></p>
      </Section>
    </div>
  );
}
