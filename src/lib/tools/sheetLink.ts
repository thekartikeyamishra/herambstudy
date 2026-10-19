/**
 * Google Sheets links → CSV export URLs. Shared by client (validation) and server (fetch).
 *
 * Works with:
 *  - a normal share link: https://docs.google.com/spreadsheets/d/<id>/edit?gid=123#gid=123
 *    (the sheet must be shared as "Anyone with the link — Viewer")
 *  - a "Publish to web" link: https://docs.google.com/spreadsheets/d/e/<pubId>/pubhtml
 */
export type SheetLink = { kind: "shared" | "published"; id: string; gid: string | null; csvUrl: string };

const ID = /^[A-Za-z0-9_-]{20,120}$/;

export function parseSheetLink(input: string): SheetLink | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "spreadsheets" || parts[1] !== "d") return null;
  const gidRaw = url.searchParams.get("gid") ?? /(?:^|[#&])gid=(\d+)/.exec(url.hash)?.[1] ?? null;
  const gid = gidRaw && /^\d{1,12}$/.test(gidRaw) ? gidRaw : null;
  if (parts[2] === "e") {
    const id = parts[3] ?? "";
    if (!ID.test(id)) return null;
    const q = new URLSearchParams({ output: "csv", ...(gid ? { gid, single: "true" } : {}) });
    return { kind: "published", id, gid, csvUrl: `https://docs.google.com/spreadsheets/d/e/${id}/pub?${q}` };
  }
  const id = parts[2] ?? "";
  if (!ID.test(id)) return null;
  return { kind: "shared", id, gid, csvUrl: `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid ?? "0"}` };
}

/** Hosts the server may follow redirects to when downloading the CSV. */
export function isAllowedSheetHost(host: string): boolean {
  return host === "docs.google.com" || /^[a-z0-9-]+\.googleusercontent\.com$/.test(host);
}
