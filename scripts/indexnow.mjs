#!/usr/bin/env node
/**
 * Tells Bing (and other IndexNow engines: Yandex, Seznam, Naver) that pages changed, so they
 * are crawled within hours instead of weeks. Run from your computer after each deploy:
 *
 *   npm run indexnow -- https://herambstudy.vercel.app
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
  console.error("[indexnow] Pass the live https address, e.g.  npm run indexnow -- https://herambstudy.vercel.app");
  process.exit(1);
}
const host = new URL(site).host;

const keyCheck = await fetch(`${site}/${key}.txt`);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== key) {
  console.error(`[indexnow] ${site}/${key}.txt isn't live yet. Deploy first, then run this again.`);
  process.exit(1);
}
const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter((u) => new URL(u).host === host);
if (!urlList.length) {
  console.error(`[indexnow] The sitemap has no URLs on ${host}. Check NEXT_PUBLIC_SITE_URL matches the live domain (see /admin → Launch readiness).`);
  process.exit(1);
}
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList }),
});
console.log(`[indexnow] Submitted ${urlList.length} URLs for ${host}: HTTP ${res.status} ${res.status === 200 || res.status === 202 ? "(accepted)" : await res.text()}`);
