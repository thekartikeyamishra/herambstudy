"use client";

/**
 * Browser-side developer tools for /dev. Imported only by a *.dev.tsx page,
 * so it is never part of a production bundle.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CONSENT_STORAGE_KEY } from "@/lib/client/analytics";
import { STUDENT_KEY, saveReport } from "@/lib/client/studentStore";
import { emptyWorkspace, loadWorkspace, newId, saveWorkspace, WORKSPACE_KEY } from "@/lib/client/workspace";
import { analyseClass, buildDataset, parseTable, sampleCsv, sampleFollowUpCsv } from "@/lib/tools/classAnalysis";
import { buildReports } from "@/lib/tools/studentReport";

const KEYS = [
  { key: WORKSPACE_KEY, label: "Tracker classes" },
  { key: STUDENT_KEY, label: "Student saved reports" },
  { key: CONSENT_STORAGE_KEY, label: "Analytics consent choice" },
  { key: "heramb.sender-name.v1", label: "Remembered institute name (report links)" },
];

function size(key: string): string {
  try {
    const v = window.localStorage.getItem(key);
    if (v === null) return "—";
    return `${(new TextEncoder().encode(v).byteLength / 1024).toFixed(1)} KB`;
  } catch {
    return "blocked";
  }
}

export function LocalDataTools() {
  const [, force] = useState(0);
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(false);
  const refresh = useCallback(() => force((n) => n + 1), []);
  useEffect(() => setReady(true), []);

  function clear(key: string) {
    try {
      window.localStorage.removeItem(key);
      setMsg(`Cleared ${key}`);
    } catch {
      setMsg("Local storage is blocked in this browser.");
    }
    refresh();
  }

  function seedTracker() {
    const ws = loadWorkspace().workspace;
    const now = new Date().toISOString();
    const r = saveWorkspace({
      ...ws,
      classes: [
        ...ws.classes,
        {
          id: newId(),
          name: `Dev class ${ws.classes.length + 1}`,
          subject: "Chemistry (fictional)",
          createdAt: now,
          tests: [
            { id: newId(), name: "Unit test 2", date: "2026-08-01", raw: sampleCsv(), savedAt: now },
            { id: newId(), name: "Follow-up check", date: "2026-08-22", raw: sampleFollowUpCsv(), savedAt: now },
          ],
        },
      ],
    });
    setMsg(r.ok ? "Added a fictional class with 2 tests → open /tracker" : `Not saved: ${r.reason}`);
    refresh();
  }

  function seedStudent() {
    const tests = [
      { csv: sampleCsv(), test: "Unit test 2", date: "2026-08-01" },
      { csv: sampleFollowUpCsv(), test: "Follow-up check", date: "2026-08-22" },
    ];
    const outcomes = tests.map(({ csv, test, date }) => {
      const d = buildDataset(parseTable(csv)).dataset!;
      const r = buildReports(d, analyseClass(d), { institute: "Fictional Classes", test, date }).find((x) => x.s === "R08")!;
      return saveReport(r);
    });
    setMsg(`Student R08 reports: ${outcomes.join(", ")} → open /me`);
    refresh();
  }

  function writeCorruptTracker() {
    try {
      window.localStorage.setItem(WORKSPACE_KEY, "{this is not json");
      setMsg("Wrote corrupt tracker data → open /tracker to see the recovery message");
    } catch {
      setMsg("Local storage is blocked in this browser.");
    }
    refresh();
  }

  if (!ready) return <div className="min-h-40" aria-busy="true" />;

  return (
    <div className="space-y-4" data-testid="dev-local">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-muted">
            <th scope="col" className="py-2 pr-3 font-medium">Stored in this browser</th>
            <th scope="col" className="py-2 pr-3 font-medium">Key</th>
            <th scope="col" className="py-2 pr-3 font-medium">Size</th>
            <th scope="col" className="py-2 font-medium"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {KEYS.map((k) => (
            <tr key={k.key} className="border-b border-line">
              <td className="py-2 pr-3">{k.label}</td>
              <td className="py-2 pr-3 font-mono text-xs">{k.key}</td>
              <td className="tabular py-2 pr-3">{size(k.key)}</td>
              <td className="py-2"><Button variant="ghost" onClick={() => clear(k.key)}>Clear</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={seedTracker}>Add fictional tracker class</Button>
        <Button variant="secondary" onClick={seedStudent}>Seed student history (R08 × 2 tests)</Button>
        <Button variant="secondary" onClick={writeCorruptTracker}>Simulate corrupt tracker data</Button>
        <Button
          variant="ghost"
          onClick={() => {
            saveWorkspace(emptyWorkspace());
            setMsg("Tracker emptied");
            refresh();
          }}
        >
          Empty tracker
        </Button>
      </div>
      {msg ? <p role="status" className="text-sm text-good">{msg}</p> : null}
    </div>
  );
}

export function EmailLinkTool({ enabled }: { enabled: boolean }) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ confirm: string; unsubscribe: string; tampered: string } | null>(null);
  const [error, setError] = useState("");

  async function go() {
    setError("");
    setResult(null);
    const res = await fetch("/api/dev/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = (await res.json()) as { ok: boolean; message?: string; confirm: string; unsubscribe: string; tampered: string };
    if (data.ok) setResult(data);
    else setError(data.message ?? "Failed");
  }

  return (
    <div className="space-y-3" data-testid="dev-email-links">
      {!enabled ? <p className="text-sm text-warn">EMAIL_TOKEN_SECRET isn't set, so signed links can't be made. Add it to .env.development.local and restart.</p> : null}
      <p className="text-sm text-ink-soft">
        Submit an invite with “product updates” ticked first (same email), then use these links to test double opt-in.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="dev-link-email" className="field-label">Invite email</label>
          <input id="dev-link-email" type="email" className="field-input w-72" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button onClick={go} disabled={!email}>Make signed links</Button>
      </div>
      {error ? <p role="alert" className="field-error">{error}</p> : null}
      {result ? (
        <ul className="space-y-1 text-sm">
          <li><a className="text-brand underline" href={result.confirm}>Confirm link</a></li>
          <li><a className="text-brand underline" href={result.unsubscribe}>Unsubscribe link</a></li>
          <li><a className="text-brand underline" href={result.tampered}>Tampered confirm link (must be rejected)</a></li>
        </ul>
      ) : null}
    </div>
  );
}

export function ServerResetButtons() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  async function reset(what: "memory" | "outbox" | "all") {
    const res = await fetch(`/api/dev/reset?what=${what}`, { method: "POST" });
    setMsg(res.ok ? `Reset: ${what}` : "Reset failed");
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={() => reset("memory")}>Clear memory store + rate limits</Button>
      <Button variant="secondary" onClick={() => reset("outbox")}>Clear outbox</Button>
      <Button variant="ghost" onClick={() => router.refresh()}>Refresh</Button>
      {msg ? <span role="status" className="text-sm text-good">{msg}</span> : null}
    </div>
  );
}
