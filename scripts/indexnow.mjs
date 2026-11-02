#!/usr/bin/env node
/**
 * Tells Bing (and other IndexNow engines: Yandex, Seznam, Naver) that pages changed, so they
 * are crawled within hours instead of weeks. Run from your computer after each deploy:
 *
 *   npm run indexnow -- https://herambstudy.com
 *
 * Reads the live sitemap and submits every URL. The key file public/<key>.txt is served at the
 * site root, which proves to the search engine that you own the site. No account or secret needed.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const keyFile = readdirSync(join(root, "public")).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("[indexnow] No key file (public/<32 hex>.txt) found.");
  process.exit(1);
}
const key = readFileSync(join(root, "public", keyFile), "utf8").trim();
const site = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
if (!/^https:\/\//.test(site)) {
  console.error("[indexnow] Pass the live https address, e.g.  npm run indexnow -- https://herambstudy.com");
  process.exit(1);
}
const host = new URL(site).host;
const urlListHosts = (xml) => [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).host))].join(", ");

let keyCheck;
try {
  keyCheck = await fetch(`${site}/${key}.txt`, { redirect: "manual" });
} catch (err) {
  console.error(`[indexnow] Couldn't reach ${site}: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
// A redirect means this isn't the primary domain (e.g. vercel.app → herambstudy.com, or www → apex).
if (keyCheck.status >= 300 && keyCheck.status < 400) {
  const to = new URL(keyCheck.headers.get("location") ?? "/", site);
  console.error(`[indexnow] ${site} redirects to ${to.origin}. Submit the primary domain instead:\n  npm run indexnow -- ${to.origin}`);
  process.exit(1);
}
const body = keyCheck.ok ? (await keyCheck.text()).trim() : "";
if (body !== key) {
  console.error(
    keyCheck.status === 404
      ? `[indexnow] ${site}/${key}.txt returns 404: the latest release isn't deployed on this domain yet. Check Vercel → Deployments shows your newest commit as "Current", then run this again.`
      : `[indexnow] ${site}/${key}.txt answered HTTP ${keyCheck.status} without the key. Deploy the latest release, then run this again.`,
  );
  process.exit(1);
}
const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter((u) => new URL(u).host === host);
if (!urlList.length) {
  const other = urlListHosts(xml);
  console.error(`[indexnow] The sitemap lists ${other || "no"} URLs, not ${host}. Set NEXT_PUBLIC_SITE_URL=${site} in Vercel → Environment Variables (Production), redeploy, then run this again.`);
  process.exit(1);
}
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList }),
});
console.log(`[indexnow] Submitted ${urlList.length} URLs for ${host}: HTTP ${res.status} ${res.status === 200 || res.status === 202 ? "(accepted)" : await res.text()}`);
