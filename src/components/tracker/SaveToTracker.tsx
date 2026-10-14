"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { MAX_CLASSES, MAX_TESTS_PER_CLASS, newId, todayIso } from "@/lib/client/workspace";
import { track } from "@/lib/client/analytics";
import { useWorkspace } from "./useWorkspace";

const NEW = "__new__";

/** "Save this test to a class" — from the class analyser into the local tracker. */
export function SaveToTracker({ raw, isSample }: { raw: string; isSample: boolean }) {
  const { workspace, status, update } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [className, setClassName] = useState(isSample ? "Fictional class 11 · Chemistry" : "");
  const [subject, setSubject] = useState("");
  const [testName, setTestName] = useState(isSample ? "Unit test (fictional)" : "");
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);

  const target = classId || (workspace.classes.length ? workspace.classes[0]!.id : NEW);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!testName.trim()) return setError("Please name this test, e.g. “Unit test 3”.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Please choose the test date.");
    if (target === NEW && !className.trim()) return setError("Please name the class, e.g. “Class 11 A”.");
    const savedTo: { current: { id: string; name: string } | null } = { current: null };
    const err = update((ws) => {
      const test = { id: newId(), name: testName.trim().slice(0, 80), date, raw, savedAt: new Date().toISOString() };
      if (target === NEW) {
        const name = className.trim().slice(0, 80);
        const id = newId();
        savedTo.current = { id, name };
        return { ...ws, classes: [...ws.classes, { id, name, subject: subject.trim().slice(0, 80), createdAt: new Date().toISOString(), tests: [test] }] };
      }
      return {
        ...ws,
        classes: ws.classes.map((c) => {
          if (c.id !== target) return c;
          savedTo.current = { id: c.id, name: c.name };
          return { ...c, tests: [...c.tests, test] };
        }),
      };
    });
    if (err) return setError(err);
    setSaved(savedTo.current);
    track("tracker_test_saved", { outcome: target === NEW ? "new_class" : "existing_class" });
  }

  if (status === "loading") return null;

  if (saved) {
    return (
      <div role="status" className="mt-6 rounded-xl border border-good/30 bg-good-tint px-4 py-3 text-sm text-ink" data-testid="tracker-saved">
        Saved to <strong>{saved.name}</strong> on this device.{" "}
        <Link href={`/tracker?class=${saved.id}`} className="font-medium text-brand underline underline-offset-4">Open the class tracker →</Link>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={status === "unavailable"}>Save this test to a class</Button>
        <span className="text-sm text-ink-muted">
          {status === "unavailable" ? "Saving isn't possible in this browser mode." : "Track every test for a class over time — saved only on this device."}
        </span>
      </div>
    );
  }

  const selected = workspace.classes.find((c) => c.id === target);
  const full = target === NEW ? workspace.classes.length >= MAX_CLASSES : (selected?.tests.length ?? 0) >= MAX_TESTS_PER_CLASS;

  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-xl border border-line p-5" aria-label="Save this test to a class" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="save-class" className="field-label">Class</label>
          <select id="save-class" className="field-input" value={target} onChange={(e) => setClassId(e.target.value)}>
            {workspace.classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.subject ? ` · ${c.subject}` : ""}</option>)}
            <option value={NEW}>+ New class</option>
          </select>
        </div>
        {target === NEW ? (
          <>
            <div>
              <label htmlFor="save-class-name" className="field-label">Class name</label>
              <input id="save-class-name" className="field-input" maxLength={80} placeholder="e.g. Class 11 A" value={className} onChange={(e) => setClassName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="save-subject" className="field-label">Subject <span className="font-normal text-ink-muted">(optional)</span></label>
              <input id="save-subject" className="field-input" maxLength={80} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </>
        ) : null}
        <div>
          <label htmlFor="save-test-name" className="field-label">Test name</label>
          <input id="save-test-name" className="field-input" maxLength={80} placeholder="e.g. Unit test 3" value={testName} onChange={(e) => setTestName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="save-date" className="field-label">Test date</label>
          <input id="save-date" type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      {error ? <p role="alert" className="field-error">{error}</p> : null}
      {full ? <p role="alert" className="field-error">This class (or your list of classes) is full. Delete old items in the tracker first.</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit" disabled={full}>Save test</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <p className="mt-3 text-xs text-ink-muted">Stored only in this browser. Clearing browser data deletes it — export a backup from the tracker.</p>
    </form>
  );
}
