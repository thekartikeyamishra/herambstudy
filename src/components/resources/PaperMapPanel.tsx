"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { parseTable } from "@/lib/tools/classAnalysis";
import { normaliseExport } from "@/lib/tools/importMapping";
import { applyPaperMap, parsePaperMap, questionNumber, type PaperScheme } from "@/lib/tools/paperMap";
import { rowsToTsv } from "@/lib/tools/xlsx";

const KEY = "heramb.paper-map.v1";
type Saved = { map: string; kind: PaperScheme["kind"]; correct: string; wrong: string; maxPerQuestion: string; key: string };
const DEFAULTS: Saved = { map: "", kind: "answers", correct: "4", wrong: "1", maxPerQuestion: "4", key: "" };

/** True when the pasted table looks question-wise (5+ headers like Q1, Q2 or 1, 2…). */
export function looksQuestionWise(text: string): boolean {
  const header = parseTable(text.split(/\r?\n/).slice(0, 8).join("\n")).find((r) => r.filter(Boolean).length >= 3);
  return Boolean(header && header.filter((h) => questionNumber(h) !== null).length >= 5);
}

/**
 * "Question-wise or OMR marks?" — the teacher types which questions belong to which chapter
 * once; Heramb adds them up per chapter (with +4/−1 style marking for right/wrong answers).
 */
export function PaperMapPanel({ text, open: openProp, onConverted }: { text: string; open: boolean; onConverted: (text: string, notes: string[]) => void }) {
  const [open, setOpen] = useState(openProp);
  const [v, setV] = useState<Saved>(DEFAULTS);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (openProp) setOpen(true);
  }, [openProp]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setV({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Saved>) });
    } catch {
      /* storage unavailable */
    }
  }, []);

  const set = (k: keyof Saved, value: string) => setV((s) => ({ ...s, [k]: value }));

  function convert() {
    setErrors([]);
    const parsed = parsePaperMap(v.map);
    if (parsed.errors.length) return setErrors(parsed.errors);
    const n = (s: string, d: number) => {
      const x = Number(s.replace(",", "."));
      return Number.isFinite(x) && x >= 0 && x <= 100 ? x : d;
    };
    const scheme: PaperScheme =
      v.kind === "answers"
        ? { kind: "answers", correct: n(v.correct, 4) || 4, wrong: n(v.wrong, 1) }
        : v.kind === "responses"
          ? { kind: "responses", correct: n(v.correct, 4) || 4, wrong: n(v.wrong, 1), key: v.key }
          : { kind: "marks", maxPerQuestion: n(v.maxPerQuestion, 4) || 4 };
    // Clean up exports first (title rows, names, totals…), keeping the question columns.
    const tidy = normaliseExport(parseTable(text));
    const result = applyPaperMap(tidy.rows, parsed.lines, scheme);
    if (!result.rows) return setErrors(result.errors);
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* ignore */
    }
    onConverted(rowsToTsv(result.rows), [...tidy.notes, ...result.notes]);
  }

  if (!open) {
    return (
      <p className="mt-3 text-sm text-ink-soft">
        Marks are question-wise, or right/wrong from OMR or an online test?{" "}
        <button type="button" className="font-medium text-brand underline underline-offset-4" onClick={() => setOpen(true)}>
          Convert questions to chapters
        </button>
      </p>
    );
  }

  return (
    <section className="mt-4 rounded-xl border border-brand/30 bg-brand-tint/30 p-4 text-sm" aria-labelledby="paper-map-title" data-testid="paper-map">
      <h3 id="paper-map-title" className="font-semibold text-ink">Question-wise marks → chapters</h3>
      <p className="mt-1 text-ink-soft">
        Paste the question-wise sheet in the box above (roll number, then Q1, Q2…). Then say once which questions belong to which chapter — no re-marking.
      </p>
      <label htmlFor="paper-map-text" className="field-label mt-3">Paper map (one chapter per line)</label>
      <textarea id="paper-map-text" rows={5} className="field-input font-mono text-sm" spellCheck={false} value={v.map} onChange={(e) => set("map", e.target.value)}
        placeholder={"1-10: Kinematics\n11-20: Laws of motion\n21-25, 30: Work energy"} aria-describedby="paper-map-hint" />
      <p id="paper-map-hint" className="field-hint">Remembered on this device, so the next test with the same pattern takes one tap.</p>

      <fieldset className="mt-3">
        <legend className="field-label">What is in each cell?</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="paper-kind" checked={v.kind === "answers"} onChange={() => set("kind", "answers")} className="h-4 w-4" />
            Right / wrong answers (C, W, blank — or 1, 0, blank)
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="paper-kind" checked={v.kind === "responses"} onChange={() => set("kind", "responses")} className="h-4 w-4" />
            Options marked (A, B, C, D) + answer key — OMR exports
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="paper-kind" checked={v.kind === "marks"} onChange={() => set("kind", "marks")} className="h-4 w-4" />
            Marks per question
          </label>
        </div>
      </fieldset>
      {v.kind === "responses" ? (
        <div className="mt-2">
          <label htmlFor="pm-key" className="field-label">Answer key</label>
          <input id="pm-key" className="field-input font-mono" spellCheck={false} value={v.key} onChange={(e) => set("key", e.target.value)}
            placeholder="ABCDA BCDAB CDABC…" aria-describedby="pm-key-hint" />
          <p id="pm-key-hint" className="field-hint">In question order. Leave empty if the sheet has a row starting with KEY. Use * for a bonus question.</p>
        </div>
      ) : null}
      {v.kind !== "marks" ? (
        <div className="mt-2 flex flex-wrap gap-4">
          <div>
            <label htmlFor="pm-correct" className="field-label">Marks for correct</label>
            <input id="pm-correct" inputMode="decimal" className="field-input w-24" value={v.correct} onChange={(e) => set("correct", e.target.value)} />
          </div>
          <div>
            <label htmlFor="pm-wrong" className="field-label">Minus for wrong</label>
            <input id="pm-wrong" inputMode="decimal" className="field-input w-24" value={v.wrong} onChange={(e) => set("wrong", e.target.value)} />
          </div>
          <p className="self-end pb-2 text-ink-muted">JEE/NEET: +4 and 1. No negative marking: 0. Blank = not attempted.</p>
        </div>
      ) : (
        <div className="mt-2">
          <label htmlFor="pm-max" className="field-label">Maximum marks per question</label>
          <input id="pm-max" inputMode="decimal" className="field-input w-24" value={v.maxPerQuestion} onChange={(e) => set("maxPerQuestion", e.target.value)} aria-describedby="pm-max-hint" />
          <p id="pm-max-hint" className="field-hint">Used when the sheet has no MAX row.</p>
        </div>
      )}

      {errors.length ? (
        <ul role="alert" className="mt-3 space-y-1 text-gap">{errors.map((e) => <li key={e}>• {e}</li>)}</ul>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={convert} disabled={!text.trim() || !v.map.trim()}>Convert and analyse</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
      </div>
    </section>
  );
}
