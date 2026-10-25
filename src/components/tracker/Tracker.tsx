"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, Callout } from "@/components/ui/Primitives";
import { statusFor } from "@/content/sampleData";
import { track } from "@/lib/client/analytics";
import {
  MAX_CLASSES,
  MAX_TESTS_PER_CLASS,
  mergeWorkspaces,
  newId,
  parseBackup,
  todayIso,
  type StoredClass,
} from "@/lib/client/workspace";
import { buildDataset, LIMITS, parseTable, sampleCsv, sampleFollowUpCsv, type ParseIssue } from "@/lib/tools/classAnalysis";
import { trackClass } from "@/lib/tools/tracker";
import { cn } from "@/lib/cn";
import { downloadText } from "@/components/resources/ToolShell";
import { TermReports } from "./TermReports";
import { InstituteBar } from "@/components/founding/InstituteBar";
import { recordUsage } from "@/lib/client/usage";
import { markDone, textHash } from "@/lib/client/onceStore";
import { useWorkspace } from "./useWorkspace";

const BACKUP_KEY = "heramb.tracker-backup-at.v1";
const tone = { secure: "bg-good-tint text-good", developing: "bg-warn-tint text-warn", gap: "bg-gap-tint text-gap" } as const;

export function Tracker() {
  const { workspace, status, update } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    const wanted = new URLSearchParams(window.location.search).get("class");
    setSelectedId((cur) => cur ?? (workspace.classes.find((c) => c.id === wanted)?.id ?? workspace.classes[0]?.id ?? null));
  }, [status, workspace.classes]);

  const selected = workspace.classes.find((c) => c.id === selectedId) ?? null;

  // Backup reminder: data lives in one browser, so nudge after tests are added.
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  useEffect(() => {
    try {
      setLastBackup(localStorage.getItem(BACKUP_KEY));
    } catch {
      /* ignore */
    }
  }, []);
  const unbacked = workspace.classes.reduce((n, c) => n + c.tests.filter((t) => !lastBackup || t.savedAt > lastBackup).length, 0);

  function apply(fn: Parameters<typeof update>[0], ok?: string) {
    const err = update(fn);
    setMessage(err ? { kind: "error", text: err } : ok ? { kind: "ok", text: ok } : null);
    return !err;
  }

  function loadDemo() {
    const id = newId();
    const now = new Date().toISOString();
    const ok = apply((ws) => ({
      ...ws,
      classes: [
        ...ws.classes,
        {
          id,
          name: "Fictional class 11 · Chemistry",
          subject: "Chemistry (example)",
          createdAt: now,
          tests: [
            { id: newId(), name: "Unit test 2", date: "2026-08-01", raw: sampleCsv(), savedAt: now },
            { id: newId(), name: "Follow-up check", date: "2026-08-22", raw: sampleFollowUpCsv(), savedAt: now },
          ],
        },
      ],
    }));
    if (ok) setSelectedId(id);
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5_000_000) return setMessage({ kind: "error", text: "That backup file is too large." });
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) return setMessage({ kind: "error", text: parsed.message });
    let summary = "";
    apply((ws) => {
      const m = mergeWorkspaces(ws, parsed.workspace);
      summary = `Imported ${m.added} class${m.added === 1 ? "" : "es"}${m.skipped ? ` (${m.skipped} skipped — limit of ${MAX_CLASSES} classes)` : ""}.`;
      return m.workspace;
    });
    setMessage((cur) => (cur?.kind === "error" ? cur : { kind: "ok", text: summary }));
  }

  if (status === "loading") return <div className="min-h-[50vh]" aria-busy="true" />;

  return (
    <>
    <InstituteBar />
    <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
      <aside className="space-y-6" aria-label="Your classes">
        <div>
          <h2 className="font-sans text-base font-semibold">Your classes</h2>
          {workspace.classes.length ? (
            <ul className="mt-3 space-y-1">
              {workspace.classes.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    aria-current={c.id === selectedId ? "true" : undefined}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left text-[0.9375rem] hover:bg-ink/5",
                      c.id === selectedId && "bg-brand-tint/70 font-medium text-ink",
                    )}
                  >
                    <span className="block truncate">{c.name}</span>
                    <span className="block text-xs text-ink-muted">{c.tests.length} test{c.tests.length === 1 ? "" : "s"}{c.subject ? ` · ${c.subject}` : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">No classes yet.</p>
          )}
        </div>
        <NewClassForm
          disabled={workspace.classes.length >= MAX_CLASSES || status === "unavailable"}
          onCreate={(name, subject) => {
            const id = newId();
            if (apply((ws) => ({ ...ws, classes: [...ws.classes, { id, name, subject, createdAt: new Date().toISOString(), tests: [] }] }))) setSelectedId(id);
          }}
        />
        <div className="space-y-2 border-t border-line pt-5">
          <h2 className="font-sans text-base font-semibold">Backup</h2>
          {unbacked > 0 ? (
            <p role="status" className="rounded-lg bg-warn-tint px-3 py-2 text-xs font-medium text-warn" data-testid="backup-reminder">
              {unbacked} test{unbacked === 1 ? "" : "s"} saved since your last backup{lastBackup ? ` (${lastBackup.slice(0, 10)})` : ""}. Export now so a phone change or cleared browser can't lose them.
            </p>
          ) : null}
          <p className="text-xs text-ink-muted">Your data lives only in this browser. Export a backup regularly, and to move to another device.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!workspace.classes.length}
              onClick={() => {
                downloadText(`heramb-tracker-backup-${todayIso()}.json`, JSON.stringify(workspace, null, 2), "application/json");
                try {
                  localStorage.setItem(BACKUP_KEY, new Date().toISOString());
                } catch {
                  /* ignore */
                }
                setLastBackup(new Date().toISOString());
              }}
            >
              Export
            </Button>
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong bg-paper-raised px-5 text-[0.9375rem] font-medium text-ink hover:bg-paper-sunk has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
              Import
              <input type="file" accept=".json,application/json" className="sr-only" onChange={onImport} />
            </label>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {status === "unavailable" ? (
          <Callout tone="warn" title="Saving isn't available in this browser">
            Local storage is blocked (for example in private browsing). You can still use the{" "}
            <Link href="/resources/class-test-analyser" className="font-medium text-brand underline underline-offset-4">class test analyser</Link>, but tests can't be saved here.
          </Callout>
        ) : null}
        {status === "corrupt" ? (
          <Callout tone="warn" className="mb-4" title="Saved data couldn't be read">
            Your saved tracker data looks damaged, so we started fresh without deleting it. Saving anything new will replace it — import a backup first if you have one.
          </Callout>
        ) : null}
        {message ? (
          <div role={message.kind === "error" ? "alert" : "status"} className={cn("mb-4 rounded-xl border px-4 py-3 text-sm", message.kind === "error" ? "border-gap/30 bg-gap-tint text-gap" : "border-good/30 bg-good-tint text-ink")}>
            {message.text}
          </div>
        ) : null}

        {!selected ? (
          <div className="card p-6 sm:p-8" data-testid="tracker-empty">
            <h2 className="text-display-md">Track a class across tests</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-soft">
              <li>Create a class (or save one straight from the <Link href="/resources/class-test-analyser" className="font-medium text-brand underline underline-offset-4">class test analyser</Link>).</li>
              <li>Add each test's topic-wise marks as you go.</li>
              <li>See topic trends, students with gaps that keep repeating, and which gaps closed since the last test.</li>
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={loadDemo} disabled={status === "unavailable"}>Load a fictional class</Button>
            </div>
          </div>
        ) : (
          <ClassView
            key={selected.id}
            cls={selected}
            onAddTest={(test) => apply((ws) => ({ ...ws, classes: ws.classes.map((c) => (c.id === selected.id ? { ...c, tests: [...c.tests, test] } : c)) }), "Test saved.")}
            onDeleteTest={(id) => apply((ws) => ({ ...ws, classes: ws.classes.map((c) => (c.id === selected.id ? { ...c, tests: c.tests.filter((t) => t.id !== id) } : c)) }))}
            onDeleteClass={() => {
              if (apply((ws) => ({ ...ws, classes: ws.classes.filter((c) => c.id !== selected.id) }), `Deleted “${selected.name}”.`)) setSelectedId(null);
            }}
          />
        )}
      </div>
    </div>
    </>
  );
}

function groupByTopic(list: Array<{ student: string; topic: string; tests: number }>) {
  const map = new Map<string, Array<{ student: string; tests: number }>>();
  for (const p of list) map.set(p.topic, [...(map.get(p.topic) ?? []), { student: p.student, tests: p.tests }]);
  return [...map.entries()]
    .map(([topic, students]) => ({ topic, students: students.sort((a, b) => b.tests - a.tests || a.student.localeCompare(b.student)) }))
    .sort((a, b) => b.students.length - a.students.length || a.topic.localeCompare(b.topic));
}

function NewClassForm({ onCreate, disabled }: { onCreate: (name: string, subject: string) => void; disabled: boolean }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Please name the class.");
    onCreate(name.trim().slice(0, 80), subject.trim().slice(0, 80));
    setName("");
    setSubject("");
    setError("");
  }
  return (
    <form onSubmit={submit} className="space-y-3 border-t border-line pt-5" noValidate>
      <h2 className="font-sans text-base font-semibold">New class</h2>
      <div>
        <label htmlFor="new-class-name" className="field-label">Class name</label>
        <input id="new-class-name" className="field-input" maxLength={80} placeholder="e.g. Class 11 A" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
      </div>
      <div>
        <label htmlFor="new-class-subject" className="field-label">Subject <span className="font-normal text-ink-muted">(optional)</span></label>
        <input id="new-class-subject" className="field-input" maxLength={80} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={disabled} />
      </div>
      {error ? <p role="alert" className="field-error">{error}</p> : null}
      <Button type="submit" variant="secondary" disabled={disabled}>Create class</Button>
    </form>
  );
}

function ClassView({
  cls,
  onAddTest,
  onDeleteTest,
  onDeleteClass,
}: {
  cls: StoredClass;
  onAddTest: (t: StoredClass["tests"][number]) => boolean;
  onDeleteTest: (id: string) => void;
  onDeleteClass: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const datasets = useMemo(
    () =>
      cls.tests
        .map((t) => ({ id: t.id, name: t.name, date: t.date, dataset: buildDataset(parseTable(t.raw)).dataset }))
        .filter((t): t is { id: string; name: string; date: string; dataset: NonNullable<typeof t.dataset> } => t.dataset !== null),
    [cls.tests],
  );
  const result = useMemo(() => (datasets.length ? trackClass(datasets) : null), [datasets]);

  return (
    <div className="space-y-8" data-testid="tracker-class">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-display-md">{cls.name}</h2>
          {cls.subject ? <p className="mt-1 text-ink-muted">{cls.subject}</p> : null}
        </div>
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm delete">
            <span className="text-sm text-gap">Delete this class and all its tests?</span>
            <Button variant="secondary" onClick={onDeleteClass}>Yes, delete</Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>Delete class</Button>
        )}
      </header>

      <AddTestForm disabled={cls.tests.length >= MAX_TESTS_PER_CLASS} onAdd={onAddTest} />

      {cls.tests.length ? (
        <section aria-labelledby="tests-title">
          <h3 id="tests-title" className="font-sans text-lg font-semibold">Tests</h3>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
            {(result?.tests ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span><span className="font-medium text-ink">{t.name}</span> <span className="text-ink-muted">· {t.date} · {t.students} students</span></span>
                <span className="flex items-center gap-3">
                  <span className="tabular text-ink-soft">Avg {t.average ?? "—"}%</span>
                  <button type="button" className="text-sm font-medium text-ink-muted underline underline-offset-4 hover:text-gap" onClick={() => onDeleteTest(t.id)} aria-label={`Delete test ${t.name}`}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result ? (
        <>
          {result.latestComparison ? (
            <section aria-labelledby="latest-title" className="rounded-xl border border-brand/25 bg-brand-tint/40 p-5" data-testid="tracker-latest">
              <h3 id="latest-title" className="font-sans text-lg font-semibold">
                Since the previous test ({result.tests[result.tests.length - 2]!.name} → {result.tests[result.tests.length - 1]!.name})
              </h3>
              <p className="tabular mt-2 text-ink-soft">
                <strong className="text-good">{result.latestComparison.totals.closed}</strong> gap{result.latestComparison.totals.closed === 1 ? "" : "s"} closed ·{" "}
                <strong className="text-gap">{result.latestComparison.totals.stillBelow}</strong> still below 50% ·{" "}
                <strong className="text-warn">{result.latestComparison.totals.slipped}</strong> slipped below 50%
              </p>
              <p className="mt-1 text-sm text-ink-muted">Counted per student per topic, for topics and students in both tests.</p>
            </section>
          ) : null}
          <section aria-labelledby="trend-title" data-testid="tracker-trends">
            <h3 id="trend-title" className="font-sans text-lg font-semibold">Topic trends</h3>
            <p className="mt-1 text-sm text-ink-muted">Class average per topic in each test, oldest first. “—” = topic not in that test.</p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Class average per topic per test</caption>
                <thead>
                  <tr className="bg-paper-raised">
                    <th scope="col" className="border-b border-line px-3 py-2 font-medium">Topic</th>
                    {result.tests.map((t) => <th key={t.id} scope="col" className="whitespace-nowrap border-b border-line px-3 py-2 font-medium">{t.name}</th>)}
                    <th scope="col" className="border-b border-line px-3 py-2 font-medium">Last change</th>
                  </tr>
                </thead>
                <tbody>
                  {result.topics.map((tp) => (
                    <tr key={tp.name}>
                      <th scope="row" className="border-b border-line px-3 py-1.5 font-medium">{tp.name}</th>
                      {tp.series.map((v, i) => (
                        <td key={i} className={cn("tabular border-b border-line px-3 py-1.5 text-center font-medium", v === null ? "text-ink-muted" : tone[statusFor(v)])}>{v ?? "—"}</td>
                      ))}
                      <td className={cn("tabular border-b border-line px-3 py-1.5 text-center font-semibold", tp.lastChange === null ? "text-ink-muted" : tp.lastChange > 5 ? "text-good" : tp.lastChange < -5 ? "text-gap" : "text-ink-soft")}>
                        {tp.lastChange === null ? "—" : `${tp.lastChange > 0 ? "+" : ""}${tp.lastChange}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="persist-title" data-testid="tracker-persistent">
            <h3 id="persist-title" className="font-sans text-lg font-semibold">Gaps that keep repeating</h3>
            <p className="mt-1 text-sm text-ink-muted">Students below 50% in the same topic in at least their last two attempts, grouped by topic — each group is a ready-made reteach group. “3×” means three tests in a row.</p>
            {result.persistent.length ? (
              <ul className="mt-3 space-y-2">
                {groupByTopic(result.persistent).map((g) => (
                  <li key={g.topic} className="rounded-xl border border-line px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{g.topic}</span>
                      <Badge tone="gap">{g.students.length} student{g.students.length === 1 ? "" : "s"}</Badge>
                    </div>
                    <p className="mt-1 text-ink-soft">
                      {g.students.map((p, i) => (
                        <span key={p.student}>
                          {i ? ", " : ""}
                          {p.student}
                          {p.tests > 2 ? <span className="text-gap"> ({p.tests}×)</span> : null}
                        </span>
                      ))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">{result.tests.length < 2 ? "Add another test to see repeating gaps." : "No repeating gaps — nobody is below 50% in the same topic twice in a row."}</p>
            )}
          </section>

          <TermReports tests={datasets} className={cls.name} />

        </>
      ) : (
        <p className="text-ink-soft">Add the first test above to start tracking.</p>
      )}
    </div>
  );
}

function AddTestForm({ onAdd, disabled }: { onAdd: (t: StoredClass["tests"][number]) => boolean; disabled: boolean }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayIso());
  const [raw, setRaw] = useState("");
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please name this test.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Please choose the test date.");
    const { dataset, issues: found } = buildDataset(parseTable(raw));
    setIssues(found);
    if (!dataset) return;
    const ok = onAdd({ id: newId(), name: name.trim().slice(0, 80), date, raw, savedAt: new Date().toISOString() });
    if (ok) {
      track("tracker_test_saved", { outcome: "tracker" });
      if (markDone("heramb.analysed.v1", textHash(raw))) recordUsage("analysis_real");
      recordUsage("tracker_saved");
      setName("");
      setRaw("");
      setIssues([]);
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > LIMITS.bytes) return setError("That file is larger than 1 MB.");
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) return setError("Please choose a .csv file.");
    setRaw(await file.text());
  }

  return (
    <details className="group rounded-xl border border-line" open={false}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
        + Add a test
        <span className="text-sm font-normal text-ink-muted group-open:hidden">Paste marks or upload a CSV</span>
      </summary>
      <form onSubmit={submit} className="space-y-4 border-t border-line p-4" noValidate aria-label="Add a test">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="add-test-name" className="field-label">Test name</label>
            <input id="add-test-name" className="field-input" maxLength={80} placeholder="e.g. Unit test 4" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="add-test-date" className="field-label">Test date</label>
            <input id="add-test-date" type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="add-test-data" className="field-label">Marks (same format as the class test analyser)</label>
          <textarea id="add-test-data" rows={6} spellCheck={false} className="field-input font-mono text-sm" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"Roll no,Topic 1,Topic 2\nMAX,20,20\nR01,14,9"} />
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong bg-paper-raised px-5 text-[0.9375rem] font-medium text-ink hover:bg-paper-sunk has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
          Upload CSV
          <input type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={onFile} />
        </label>
        {error ? <p role="alert" className="field-error">{error}</p> : null}
        {issues.length ? (
          <ul role="alert" className="rounded-xl border border-gap/30 bg-gap-tint/60 p-3 text-sm text-ink-soft">
            {issues.slice(0, 10).map((i, n) => <li key={n}>Row {i.row}{i.column ? `, column ${i.column}` : ""}: {i.message}</li>)}
          </ul>
        ) : null}
        <Button type="submit" disabled={disabled || !raw.trim()}>Save test</Button>
        {disabled ? <p className="text-sm text-gap">This class has reached {MAX_TESTS_PER_CLASS} tests. Delete old tests to add more.</p> : null}
      </form>
    </details>
  );
}
