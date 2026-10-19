/**
 * Minimal, dependency-free reader for Excel .xlsx files — enough to pull a marks table
 * out of the first (or a chosen) worksheet. Runs in the browser (and in Node 18+ for
 * tests) using the built-in DecompressionStream, so nothing is uploaded anywhere.
 *
 * Supported: shared strings, inline strings, numbers, booleans, formulas' cached values.
 * Not supported (refused with a clear message): encrypted files, legacy .xls, zip64.
 */

export type Sheet = { name: string; rows: string[][] };

export class XlsxError extends Error {}

const LIMITS = { entries: 3000, totalBytes: 25 * 1024 * 1024, rows: 2000, cols: 200 };

type Entry = { name: string; method: number; compSize: number; size: number; offset: number };

function u16(b: Uint8Array, o: number) {
  return b[o]! | (b[o + 1]! << 8);
}
function u32(b: Uint8Array, o: number) {
  return (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;
}

function readEntries(b: Uint8Array): Entry[] {
  // End of central directory: signature 0x06054b50, within the last 64 KB + 22 bytes.
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i--) {
    if (u32(b, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    if (u32(b, 0) === 0xe011cfd0) throw new XlsxError("This looks like an old .xls or a password-protected file. In Excel use File → Save As → Excel Workbook (.xlsx) or CSV.");
    throw new XlsxError("This file isn't a valid .xlsx workbook.");
  }
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  if (count === 0xffff || p === 0xffffffff) throw new XlsxError("This workbook is too large to read here. Save the marks sheet on its own as CSV.");
  if (count > LIMITS.entries) throw new XlsxError("This workbook has too many parts. Save the marks sheet on its own as CSV.");
  const out: Entry[] = [];
  for (let i = 0; i < count; i++) {
    if (u32(b, p) !== 0x02014b50) throw new XlsxError("This .xlsx file looks damaged.");
    const method = u16(b, p + 10);
    const compSize = u32(b, p + 20);
    const size = u32(b, p + 24);
    const nameLen = u16(b, p + 28);
    const extraLen = u16(b, p + 30);
    const commentLen = u16(b, p + 32);
    const offset = u32(b, p + 42);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nameLen));
    out.push({ name, method, compSize, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") throw new XlsxError("This browser can't open .xlsx files. Please save the sheet as CSV.");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(b: Uint8Array, e: Entry): Promise<string> {
  if (u32(b, e.offset) !== 0x04034b50) throw new XlsxError("This .xlsx file looks damaged.");
  const start = e.offset + 30 + u16(b, e.offset + 26) + u16(b, e.offset + 28);
  const raw = b.subarray(start, start + e.compSize);
  let bytes: Uint8Array;
  if (e.method === 0) bytes = raw;
  else if (e.method === 8) bytes = await inflate(raw);
  else throw new XlsxError("This workbook uses an unsupported compression. Please save it as CSV.");
  return new TextDecoder("utf-8").decode(bytes);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? "";
  });
}

const attr = (tag: string, name: string) => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? decodeXml(m[1]!) : null;
};

/** Concatenates every <t>…</t> inside a fragment (handles rich-text runs). */
function textOf(fragment: string): string {
  let out = "";
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) out += decodeXml(m[1]!);
  return out;
}

export function colIndex(ref: string): number {
  const letters = /^([A-Z]+)/.exec(ref.toUpperCase())?.[1] ?? "";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function formatNumber(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  // Excel stores 14.000000000000002 for 14 — round away float noise without losing real decimals.
  return String(Math.round(n * 1e9) / 1e9);
}

export function parseSheetXml(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  let fallbackRow = 0;
  while ((rm = rowRe.exec(xml))) {
    const r = Number(attr(rm[1]!, "r")) || fallbackRow + 1;
    fallbackRow = r;
    if (r > LIMITS.rows) break;
    const row: string[] = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    let fallbackCol = 0;
    while ((cm = cellRe.exec(rm[2]!))) {
      const head = cm[1]!;
      const body = cm[2] ?? "";
      const ref = attr(head, "r");
      const c = ref ? colIndex(ref) : fallbackCol;
      fallbackCol = c + 1;
      if (c < 0 || c >= LIMITS.cols) continue;
      const t = attr(head, "t");
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = "";
      if (t === "s") value = v !== undefined ? (shared[Number(v)] ?? "") : "";
      else if (t === "inlineStr") value = textOf(body);
      else if (t === "str") value = v !== undefined ? decodeXml(v) : "";
      else if (t === "b") value = v === "1" ? "TRUE" : "FALSE";
      else if (t === "e") value = "";
      else value = v !== undefined ? formatNumber(decodeXml(v)) : "";
      while (row.length < c) row.push("");
      row[c] = value.replace(/\s+/g, " ").trim();
    }
    while (rows.length < r - 1) rows.push([]);
    rows[r - 1] = row;
  }
  return rows;
}

export async function readXlsx(buffer: ArrayBuffer): Promise<Sheet[]> {
  const b = new Uint8Array(buffer);
  const entries = readEntries(b);
  const total = entries.reduce((s, e) => s + e.size, 0);
  if (total > LIMITS.totalBytes) throw new XlsxError("This workbook is too large. Save just the marks sheet as CSV.");
  const byName = new Map(entries.map((e) => [e.name.replace(/^\//, ""), e]));
  const get = async (name: string) => {
    const e = byName.get(name);
    return e ? readEntry(b, e) : null;
  };

  const workbook = await get("xl/workbook.xml");
  if (!workbook) throw new XlsxError("This file isn't an Excel workbook.");
  if (byName.has("EncryptionInfo")) throw new XlsxError("This workbook is password-protected. Remove the password or save it as CSV.");
  const rels = (await get("xl/_rels/workbook.xml.rels")) ?? "";
  const targets = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = attr(m[1]!, "Id");
    const target = attr(m[1]!, "Target");
    if (id && target) targets.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
  }
  const sharedXml = (await get("xl/sharedStrings.xml")) ?? "";
  const shared: string[] = [];
  for (const m of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]!));

  const sheets: Sheet[] = [];
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = attr(m[1]!, "name") ?? `Sheet ${sheets.length + 1}`;
    const rid = attr(m[1]!, "r:id");
    const path = (rid && targets.get(rid)) || `xl/worksheets/sheet${sheets.length + 1}.xml`;
    const xml = await get(path);
    if (!xml) continue;
    sheets.push({ name, rows: parseSheetXml(xml, shared) });
    if (sheets.length >= 30) break;
  }
  if (!sheets.length) throw new XlsxError("No worksheets were found in this file.");
  return sheets;
}

/** Rows → tab-separated text the analyser's parser reads (tabs/newlines inside cells become spaces). */
export function rowsToTsv(rows: string[][]): string {
  return rows
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => r.map((c) => c.replace(/[\t\r\n]+/g, " ")).join("\t"))
    .join("\n");
}
