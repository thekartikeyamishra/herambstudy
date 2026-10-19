"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/forms/Field";
import { recordUsage } from "@/lib/client/usage";
import { LIMITS, parseTable } from "@/lib/tools/classAnalysis";
import { normaliseExport } from "@/lib/tools/importMapping";
import { parseSheetLink } from "@/lib/tools/sheetLink";
import { readXlsx, rowsToTsv, type Sheet } from "@/lib/tools/xlsx";
import { cn } from "@/lib/cn";

/**
 * One place to bring marks in, so teachers never retype them:
 *   1. Excel / CSV file — including result exports from test platforms, ERPs and Google Forms
 *      (read in the browser; title rows, names, totals and ranks are cleaned up automatically)
 *   2. Google Sheet link — remembered on this device, refreshed in one tap after each test
 *   3. Photo or PDF of a marksheet — read by AI, then shown for checking before analysis
 */
export type ImportResult = { text: string; source: "file" | "sheet" | "photo"; notes: string[]; review: boolean };

const LINKED_SHEET_KEY = "heramb.linked-sheet.v1";
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
type Tab = "file" | "sheet" | "photo";

/** Cleans any table (pasted, file, sheet, photo) into the analyser's shape. */
export function tidyTable(text: string): { text: string; notes: string[]; changed: boolean } {
  const rows = parseTable(text);
  const r = normaliseExport(rows);
  if (!r.changed) return { text, notes: r.notes, changed: false };
  return { text: rowsToTsv(r.rows), notes: r.notes, changed: true };
}

function readLinked(): string | null {
  try {
    const v = localStorage.getItem(LINKED_SHEET_KEY);
    return v && parseSheetLink(v) ? v : null;
  } catch {
    return null;
  }
}
function writeLinked(url: string | null) {
  try {
    if (url) localStorage.setItem(LINKED_SHEET_KEY, url);
    else localStorage.removeItem(LINKED_SHEET_KEY);
  } catch {
    /* private mode */
  }
}

/** Shrinks large photos so they upload quickly on mobile data (max 2000 px, JPEG). */
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size <= 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export function ImportPanel({ onImported, onStart }: { onImported: (r: ImportResult) => void; onStart?: () => void }) {
  const [tab, setTab] = useState<Tab>("file");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [linked, setLinked] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<{ available: boolean; types: string[] } | null>(null);

  useEffect(() => {
    const l = readLinked();
    setLinked(l);
    if (l) setSheetUrl(l);
  }, []);

  useEffect(() => {
    if (tab !== "photo" || photo) return;
    let live = true;
    fetch("/api/import/extract", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { available?: boolean; types?: string[] }) => live && setPhoto({ available: Boolean(d.available), types: d.types ?? [] }))
      .catch(() => live && setPhoto({ available: false, types: [] }));
    return () => {
      live = false;
    };
  }, [tab, photo]);

  function deliver(raw: string, source: ImportResult["source"], extraNotes: string[] = [], review = false) {
    const t = tidyTable(raw);
    recordUsage(source === "file" ? "import_file" : source === "sheet" ? "import_sheet" : "import_photo");
    onImported({ text: t.text, source, notes: [...extraNotes, ...t.notes], review });
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    setError("");
    setSheets(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onStart?.();
    const name = file.name.toLowerCase();
    if (/\.(xlsx|xlsm)$/.test(name)) {
      if (file.size > 8 * 1024 * 1024) return setError("That workbook is larger than 8 MB. Save just the marks sheet as a new file and try again.");
      setBusy(true);
      try {
        const all = (await readXlsx(await file.arrayBuffer())).filter((s) => s.rows.some((r) => r.some((c) => c.trim())));
        if (!all.length) return setError("That workbook has no data on any sheet.");
        if (all.length === 1) deliver(rowsToTsv(all[0]!.rows), "file", [`Read sheet “${all[0]!.name}”.`]);
        else setSheets(all);
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : "We couldn't read that workbook. In Excel use File → Save as → CSV, then upload the CSV.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (/\.xls$/.test(name)) return setError("Old .xls files can't be read in the browser. In Excel use File → Save as → Excel Workbook (.xlsx) or CSV.");
    if (!/\.(csv|tsv|txt)$/.test(name)) return setError("Please choose an Excel (.xlsx) or CSV file. For a photo or PDF, use the “Photo or PDF” tab.");
    if (file.size > LIMITS.bytes) return setError("That file is larger than 1 MB. Please split the class or remove extra columns.");
    deliver(await file.text(), "file");
  }

  async function importSheet(e?: FormEvent, url = sheetUrl) {
    e?.preventDefault();
    setError("");
    const link = parseSheetLink(url);
    if (!link) return setError("Paste a Google Sheets link — it starts with https://docs.google.com/spreadsheets/.");
    onStart?.();
    setBusy(true);
    try {
      const res = await fetch("/api/import/sheet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }), credentials: "same-origin" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; text?: string; error?: { message?: string } } | null;
      if (!res.ok || !data?.ok || typeof data.text !== "string") {
        setError(data?.error?.message ?? "We couldn't open that sheet. Please try again.");
        return;
      }
      if (remember) {
        writeLinked(url);
        setLinked(url);
      }
      deliver(data.text, "sheet", ["Imported from your Google Sheet."]);
    } catch {
      setError("You seem to be offline. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!consent) return setError("Please tick the consent box first.");
    onStart?.();
    setBusy(true);
    try {
      const blob = await shrinkImage(file);
      if (blob.size > MAX_PHOTO_BYTES) return setError("That file is larger than 4 MB. Take a closer photo of just the table, or split the PDF.");
      const fd = new FormData();
      fd.append("consent", "yes");
      fd.append("file", blob, blob === file ? file.name : "marksheet.jpg");
      const res = await fetch("/api/import/extract", { method: "POST", body: fd, credentials: "same-origin" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; text?: string; error?: { message?: string } } | null;
      if (!res.ok || !data?.ok || typeof data.text !== "string") {
        setError(data?.error?.message ?? "Reading the file didn't work this time. Please try again, or use Excel / CSV.");
        return;
      }
      deliver(data.text, "photo", ["Read from your photo/PDF by AI. Check every number against the marksheet before analysing — blank cells were unreadable."], true);
    } catch {
      setError("You seem to be offline. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<[Tab, string]> = [["file", "Excel or CSV"], ["sheet", "Google Sheet"], ["photo", "Photo or PDF"]];
  const photoAccept = photo?.types.length ? photo.types.join(",") : "image/jpeg,image/png,image/webp";

  return (
    <div className="mt-5 rounded-xl border border-line bg-paper p-4" data-testid="import-panel">
      <p className="text-sm font-semibold text-ink">Import marks — no retyping</p>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Import from">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} aria-controls={`import-${k}`} id={`import-tab-${k}`}
            onClick={() => { setTab(k); setError(""); }}
            className={cn("min-h-11 rounded-full border px-4 text-sm", tab === k ? "border-brand bg-brand-tint/60 font-medium text-ink" : "border-line-strong text-ink-soft")}>
            {label}
          </button>
        ))}
      </div>

      <div id={`import-${tab}`} role="tabpanel" aria-labelledby={`import-tab-${tab}`} className="mt-4 text-sm text-ink-soft">
        {tab === "file" ? (
          <>
            <p>Upload the marks file — your own sheet, or the result export from your test platform, ERP or Google Form. Title rows, names, phone numbers, totals and ranks are removed automatically. The file is read on this device and never uploaded.</p>
            <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-paper-raised px-5 font-medium text-ink hover:bg-paper-sunk has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
              {busy ? <Spinner /> : null} Choose Excel or CSV file
              <input type="file" accept=".xlsx,.xlsm,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={onFile} disabled={busy} />
            </label>
            {sheets ? (
              <fieldset className="mt-4">
                <legend className="font-medium text-ink">This workbook has {sheets.length} sheets. Which one has the marks?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sheets.map((s) => (
                    <Button key={s.name} variant="secondary" onClick={() => { setSheets(null); deliver(rowsToTsv(s.rows), "file", [`Read sheet “${s.name}”.`]); }}>
                      {s.name}
                    </Button>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </>
        ) : null}

        {tab === "sheet" ? (
          <>
            {linked ? (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-brand-tint/40 p-3">
                <span className="text-ink">A Google Sheet is linked on this device.</span>
                <Button onClick={() => { setSheetUrl(linked); void importSheet(undefined, linked); }} disabled={busy}>
                  {busy ? (<><Spinner /> Importing…</>) : "Refresh from linked sheet"}
                </Button>
                <button type="button" className="text-sm underline underline-offset-4" onClick={() => { writeLinked(null); setLinked(null); setSheetUrl(""); }}>Unlink</button>
              </div>
            ) : null}
            <p>Keep entering marks in your Google Sheet as usual. Share it as <strong>“Anyone with the link — Viewer”</strong>, open the tab with this test, and paste its link. The marks pass through our server to your browser and are not stored.</p>
            <form onSubmit={importSheet} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
              <div className="flex-1">
                <label htmlFor="sheet-url" className="field-label">Google Sheet link</label>
                <input id="sheet-url" type="url" inputMode="url" className="field-input" placeholder="https://docs.google.com/spreadsheets/d/…" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy || !sheetUrl.trim()}>{busy ? (<><Spinner /> Importing…</>) : "Import"}</Button>
            </form>
            <label className="mt-3 flex items-center gap-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5" />
              Remember this sheet on this device for one-tap refresh after each test
            </label>
          </>
        ) : null}

        {tab === "photo" ? (
          photo === null ? (
            <p className="flex items-center gap-2"><Spinner /> Checking…</p>
          ) : !photo.available ? (
            <p>Reading photos and PDFs isn't switched on yet. Please use an Excel/CSV file or a Google Sheet for now.</p>
          ) : (
            <>
              <p>Take a straight, well-lit photo of the marks table (or upload a PDF{photo.types.includes("application/pdf") ? "" : " screenshot"}). AI reads it into the box below for you to check before analysing.</p>
              <label className="mt-3 flex items-start gap-2">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5" />
                <span>I understand this file is sent to our AI provider to read the table, is not stored by Heramb, and should show roll numbers rather than student names where possible.</span>
              </label>
              <label className={cn("mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-paper-raised px-5 font-medium text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand", consent && !busy ? "cursor-pointer hover:bg-paper-sunk" : "cursor-not-allowed opacity-60")}>
                {busy ? (<><Spinner /> Reading…</>) : "Choose photo or PDF"}
                <input type="file" accept={photoAccept} className="sr-only" onChange={onPhoto} disabled={!consent || busy} />
              </label>
            </>
          )
        ) : null}
      </div>
      {error ? <p role="alert" className="field-error mt-3">{error}</p> : null}
    </div>
  );
}
