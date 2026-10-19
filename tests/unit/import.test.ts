import { deflateRawSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readXlsx, rowsToTsv, XlsxError, colIndex, decodeXml } from "@/lib/tools/xlsx";
import { normaliseExport } from "@/lib/tools/importMapping";
import { parseSheetLink, isAllowedSheetHost } from "@/lib/tools/sheetLink";
import { analyseClass, buildDataset, parseTable } from "@/lib/tools/classAnalysis";
import { __setExtractProviderForTests, __setSheetFetchForTests, cleanExtractedCsv, handleExtract, handleExtractCapabilities, handleSheetImport } from "@/lib/server/importHandlers";
import { __setBackendForTests } from "@/lib/server/backend";
import { MemoryContactStore, MemoryInstituteStore, MemoryInviteStore, MemoryPilotStore, MemoryRateLimiter } from "@/lib/server/memoryBackend";
import type { AiProvider } from "@/lib/ai/providers";

/* ── a tiny zip writer, so tests use real .xlsx bytes ──────────────────── */
function crc32(buf: Uint8Array) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function zip(files: Record<string, string>, store = false): ArrayBuffer {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameB = enc.encode(name);
    const raw = enc.encode(content);
    const data = store ? raw : new Uint8Array(deflateRawSync(raw));
    const method = store ? 0 : 8;
    const crc = crc32(raw);
    const local = new Uint8Array(30 + nameB.length + data.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(8, method, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, data.length, true); dv.setUint32(22, raw.length, true);
    dv.setUint16(26, nameB.length, true); local.set(nameB, 30); local.set(data, 30 + nameB.length);
    const central = new Uint8Array(46 + nameB.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(6, 20, true); cv.setUint16(10, method, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, raw.length, true);
    cv.setUint16(28, nameB.length, true); cv.setUint32(42, offset, true); central.set(nameB, 46);
    locals.push(local); centrals.push(central); offset += local.length;
  }
  const cdSize = centrals.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, centrals.length, true); ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  const all = new Uint8Array(offset + cdSize + 22);
  let o = 0;
  for (const p of [...locals, ...centrals, end]) { all.set(p, o); o += p.length; }
  return all.buffer;
}

const workbook = (sheets: string[]) =>
  `<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
    .map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
const rels = (n: number) =>
  `<Relationships>${Array.from({ length: n }, (_, i) => `<Relationship Id="rId${i + 1}" Type="x" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`;

const marksSheet = `<worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="inlineStr"><is><t>Equilibrium &amp; Redox</t></is></c></row>
<row r="2"><c r="A2" t="str"><v>MAX</v></c><c r="B2"><v>20</v></c><c r="C2"><v>20</v></c><c r="D2"><v>16</v></c></row>
<row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3"><v>14.000000000000002</v></c><c r="D3"><v>9</v></c></row>
<row r="5"><c r="A5" t="s"><v>4</v></c><c r="B5"><v>18</v></c><c r="C5" t="s"><v>5</v></c><c r="D5"><v>12.5</v></c></row>
</sheetData></worksheet>`;
const shared = `<sst><si><t>Roll no</t></si><si><r><t>Mole </t></r><r><t>concept</t></r></si><si><t>Atomic structure</t></si><si><t>R01</t></si><si><t>R02</t></si><si><t>AB</t></si></sst>`;

describe("xlsx reader", () => {
  it("reads shared strings, rich text, inline strings, blanks and float noise", async () => {
    const buf = zip({ "xl/workbook.xml": workbook(["Unit test 3"]), "xl/_rels/workbook.xml.rels": rels(1), "xl/sharedStrings.xml": shared, "xl/worksheets/sheet1.xml": marksSheet });
    const [sheet] = await readXlsx(buf);
    expect(sheet!.name).toBe("Unit test 3");
    expect(sheet!.rows[0]).toEqual(["Roll no", "Mole concept", "Atomic structure", "Equilibrium & Redox"]);
    expect(sheet!.rows[2]).toEqual(["R01", "14", "", "9"]);
    expect(sheet!.rows[3]).toEqual([]);
    expect(sheet!.rows[4]).toEqual(["R02", "18", "AB", "12.5"]);
    const { dataset, issues } = buildDataset(parseTable(rowsToTsv(sheet!.rows)));
    expect(issues).toEqual([]);
    expect(dataset!.students).toHaveLength(2);
  });

  it("reads stored (uncompressed) entries and multiple sheets", async () => {
    const buf = zip({ "xl/workbook.xml": workbook(["A", "B"]), "xl/_rels/workbook.xml.rels": rels(2), "xl/sharedStrings.xml": shared, "xl/worksheets/sheet1.xml": marksSheet, "xl/worksheets/sheet2.xml": "<worksheet><sheetData/></worksheet>" }, true);
    const sheets = await readXlsx(buf);
    expect(sheets.map((s) => s.name)).toEqual(["A", "B"]);
  });

  it("explains old .xls / password-protected files and junk", async () => {
    const ole = new Uint8Array(512);
    new DataView(ole.buffer).setUint32(0, 0xe011cfd0, true);
    await expect(readXlsx(ole.buffer)).rejects.toThrow(/old \.xls or a password-protected/);
    await expect(readXlsx(new TextEncoder().encode("hello").buffer)).rejects.toBeInstanceOf(XlsxError);
  });

  it("helpers", () => {
    expect(colIndex("A1")).toBe(0);
    expect(colIndex("AA10")).toBe(26);
    expect(decodeXml("&lt;b&gt; &#x928;&#2366;")).toBe("<b> ना");
    expect(rowsToTsv([["a\tb", "c\nd"], [], ["x"]])).toBe("a b\tc d\nx");
  });
});

describe("test-platform export mapping", () => {
  it("leaves the classic template untouched", () => {
    const rows = parseTable("Roll no,Kinematics,Laws of motion\nMAX,20,20\nR01,14,9\nR02,10,12");
    const r = normaliseExport(rows);
    expect(r.rows).toEqual(rows);
    expect(r.changed).toBe(false);
    expect(r.notes).toEqual([]);
  });

  it("drops title rows, names, totals, ranks and contact columns; keeps roll numbers", () => {
    const rows = parseTable(
      [
        "Sunrise Classes — Unit Test 3 Result",
        "S.No,Name,Roll No,Mobile,Physics,Chemistry,Biology,Total,Percentage,Rank",
        "1,Ravi Kumar,R01,98xxxxxx,40,35,60,135,75,2",
        "2,Asha Singh,R02,97xxxxxx,50,30,70,150,83,1",
      ].join("\n"),
    );
    const r = normaliseExport(rows);
    expect(r.rows).toEqual([["Roll No", "Physics", "Chemistry", "Biology"], ["R01", "40", "35", "60"], ["R02", "50", "30", "70"]]);
    expect(r.notes.join(" ")).toMatch(/Skipped 1 title row/);
    expect(r.notes.join(" ")).toMatch(/S\.No, Name, Mobile, Total, Percentage, Rank/);
    expect(JSON.stringify(r.rows)).not.toMatch(/Ravi|Asha|98x/);
  });

  it("uses names only when there's no roll number, and says so", () => {
    const r = normaliseExport(parseTable("Student Name,Algebra,Geometry\nRavi,8,6\nAsha,9,4"));
    expect(r.rows[0]).toEqual(["Student Name", "Algebra", "Geometry"]);
    expect(r.notes[0]).toMatch(/Roll numbers are better for privacy/);
  });

  it("combines question-wise marks into chapters via a Chapter row, including MAX", () => {
    const rows = parseTable(
      [
        "Roll,Q1,Q2,Q3,Q4,Total",
        "Chapter,Kinematics,Kinematics,Optics,Optics,",
        "MAX,4,4,4,4,16",
        "R01,4,0,2,AB,6",
        "R02,AB,AB,AB,AB,0",
      ].join("\n"),
    );
    const r = normaliseExport(rows);
    expect(r.rows).toEqual([["Roll", "Kinematics", "Optics"], ["MAX", "8", "8"], ["R01", "4", "2"], ["R02", "AB", "AB"]]);
    const { dataset, issues } = buildDataset(r.rows);
    expect(issues).toEqual([]);
    expect(analyseClass(dataset!).topics.map((t) => t.name)).toEqual(["Kinematics", "Optics"]);
  });

  it("warns about question-wise sheets without a chapter row", () => {
    const r = normaliseExport(parseTable("Roll,Q1,Q2,Q3,Q4,Q5\nR01,1,0,1,1,0"));
    expect(r.notes.join(" ")).toMatch(/question-wise marks/);
  });

  it("moves a MAX row under the header", () => {
    const r = normaliseExport(parseTable("Roll no,Algebra\nR01,8\nMax marks,10\nR02,6"));
    expect(r.rows[1]).toEqual(["Max marks", "10"]);
  });
});

describe("Google Sheets links", () => {
  it("builds CSV export URLs for shared and published sheets", () => {
    const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abc";
    expect(parseSheetLink(`https://docs.google.com/spreadsheets/d/${id}/edit?gid=42#gid=42`)?.csvUrl).toBe(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=42`);
    expect(parseSheetLink(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=7`)?.gid).toBe("7");
    expect(parseSheetLink(`https://docs.google.com/spreadsheets/d/${id}/edit`)?.csvUrl).toMatch(/gid=0$/);
    expect(parseSheetLink(`https://docs.google.com/spreadsheets/d/e/2PACX-${id}/pubhtml`)?.csvUrl).toBe(`https://docs.google.com/spreadsheets/d/e/2PACX-${id}/pub?output=csv`);
  });
  it("refuses anything that isn't docs.google.com over https", () => {
    for (const bad of ["http://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit", "https://evil.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit", "https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit", "https://docs.google.com.evil.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit", "not a url"]) {
      expect(parseSheetLink(bad)).toBeNull();
    }
    expect(isAllowedSheetHost("doc-0s-4k-sheets.googleusercontent.com")).toBe(true);
    expect(isAllowedSheetHost("googleusercontent.com.evil.com")).toBe(false);
  });
});

/* ── import endpoints ─────────────────────────────────────────────────── */
let ip = 0;
const jsonReq = (path: string, body: unknown) =>
  new Request(`http://localhost:3000${path}`, { method: "POST", headers: { "content-type": "application/json", host: "localhost:3000", origin: "http://localhost:3000", "x-forwarded-for": `10.9.0.${++ip}` }, body: JSON.stringify(body) });
const SHEET = "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123/edit#gid=5";

beforeEach(() => {
  __setBackendForTests({ kind: "memory", invites: new MemoryInviteStore(), contacts: new MemoryContactStore(), pilots: new MemoryPilotStore(), institutes: new MemoryInstituteStore(), limiter: new MemoryRateLimiter() });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  __setBackendForTests(null);
  __setSheetFetchForTests(undefined);
  __setExtractProviderForTests(undefined);
});

describe("POST /api/import/sheet", () => {
  it("follows Google's redirect and returns the CSV", async () => {
    const calls: string[] = [];
    __setSheetFetchForTests((async (url: string | URL) => {
      calls.push(String(url));
      if (calls.length === 1) return new Response(null, { status: 307, headers: { location: "https://doc-0c-sheets.googleusercontent.com/export/abc" } });
      return new Response("Roll no,Algebra\nR01,8", { status: 200, headers: { "content-type": "text/csv" } });
    }) as typeof fetch);
    const res = await handleSheetImport(jsonReq("/api/import/sheet", { url: SHEET }));
    expect(res.status).toBe(200);
    expect((await res.json()).text).toBe("Roll no,Algebra\nR01,8");
    expect(calls[0]).toMatch(/export\?format=csv&gid=5$/);
  });

  it("explains private sheets (sign-in redirect or HTML)", async () => {
    __setSheetFetchForTests((async () => new Response(null, { status: 302, headers: { location: "https://accounts.google.com/ServiceLogin?x" } })) as typeof fetch);
    const r1 = await handleSheetImport(jsonReq("/api/import/sheet", { url: SHEET }));
    expect((await r1.json()).error.message).toMatch(/Anyone with the link/);
    __setSheetFetchForTests((async () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch);
    const r2 = await handleSheetImport(jsonReq("/api/import/sheet", { url: SHEET }));
    expect(r2.status).toBe(422);
  });

  it("never follows redirects to other hosts and rejects bad links", async () => {
    __setSheetFetchForTests((async () => new Response(null, { status: 302, headers: { location: "https://169.254.169.254/latest/meta-data" } })) as typeof fetch);
    expect((await handleSheetImport(jsonReq("/api/import/sheet", { url: SHEET }))).status).toBe(422);
    expect((await handleSheetImport(jsonReq("/api/import/sheet", { url: "https://evil.com/x" }))).status).toBe(422);
  });

  it("refuses sheets over 1 MB", async () => {
    __setSheetFetchForTests((async () => new Response("x".repeat(1_000_001), { status: 200, headers: { "content-type": "text/csv" } })) as typeof fetch);
    expect((await handleSheetImport(jsonReq("/api/import/sheet", { url: SHEET }))).status).toBe(413);
  });
});

describe("POST /api/import/extract (photo / PDF)", () => {
  const form = (file: Blob | null, consent = "yes") => {
    const f = new FormData();
    if (file) f.set("file", file, "sheet.jpg");
    f.set("consent", consent);
    return new Request("http://localhost:3000/api/import/extract", { method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:3000", "x-forwarded-for": `10.8.0.${++ip}` }, body: f });
  };
  const fake = (text: string): AiProvider => ({ id: "anthropic", model: "test", generate: async () => ({ text: "", inputTokens: 0, outputTokens: 0 }), extractTypes: ["image/jpeg", "application/pdf"], extract: async () => ({ text, inputTokens: 1, outputTokens: 1 }) });

  it("is honest when no vision provider is configured", async () => {
    __setExtractProviderForTests(null);
    expect((await (await handleExtractCapabilities()).json()).available).toBe(false);
    const res = await handleExtract(form(new Blob(["x"], { type: "image/jpeg" })));
    expect(res.status).toBe(501);
  });

  it("requires consent and a supported, non-empty file", async () => {
    __setExtractProviderForTests(fake("Roll,A\nR1,2"));
    expect((await handleExtract(form(new Blob(["x"], { type: "image/jpeg" }), "no"))).status).toBe(422);
    expect((await handleExtract(form(new Blob(["x"], { type: "image/gif" })))).status).toBe(415);
    expect((await handleExtract(form(new Blob([], { type: "image/jpeg" })))).status).toBe(422);
  });

  it("returns cleaned CSV and handles 'no table'", async () => {
    __setExtractProviderForTests(fake("```csv\nRoll,Algebra\nMAX,10\nR01,8\n```"));
    const ok = await handleExtract(form(new Blob(["img"], { type: "image/jpeg" })));
    expect((await ok.json()).text).toBe("Roll,Algebra\nMAX,10\nR01,8");
    __setExtractProviderForTests(fake("NO_TABLE"));
    expect((await handleExtract(form(new Blob(["img"], { type: "image/jpeg" })))).status).toBe(422);
  });

  it("cleanExtractedCsv", () => {
    expect(cleanExtractedCsv("Here you go")).toBeNull();
    expect(cleanExtractedCsv("a,b\n1,2")).toBe("a,b\n1,2");
  });
});
