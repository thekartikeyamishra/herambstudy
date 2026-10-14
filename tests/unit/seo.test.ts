import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { indexableRoutes } from "@/config/routes";
import { resources } from "@/content/resources";
import { articles } from "@/content/articles";
import { buildMetadata, serializeJsonLd } from "@/lib/seo";

describe("sitemap", () => {
  it("lists every indexable route once, as absolute URLs, and nothing private", () => {
    const urls = sitemap().map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.length).toBe(indexableRoutes().length);
    for (const u of urls) expect(u).toMatch(/^https?:\/\/[^/]+\//);
    expect(urls.some((u) => u.includes("/api/") || u.includes("/offline"))).toBe(false);
    for (const r of resources) expect(urls.some((u) => u.endsWith(`/resources/${r.slug}`))).toBe(true);
  });
});

describe("robots", () => {
  it("disallows everything when the site URL is not an https production origin", () => {
    // NEXT_PUBLIC_SITE_URL is unset in tests → http://localhost:3000
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    expect(rules[0]?.disallow).toBe("/");
  });
});

describe("page metadata", () => {
  it("sets a canonical URL, Open Graph and index directives", () => {
    const m = buildMetadata({ title: "T", description: "D", path: "/how-it-works" });
    expect(m.alternates?.canonical).toMatch(/\/how-it-works$/);
    expect(m.openGraph?.url).toMatch(/\/how-it-works$/);
    expect(m.robots).toEqual({ index: true, follow: true });
    expect(buildMetadata({ title: "T", description: "D", path: "/x", noindex: true }).robots).toEqual({ index: false, follow: true });
  });

  it("escapes JSON-LD so it cannot break out of its script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
  });
});

describe("resources content", () => {
  it("every resource has a body, limitations and unique slug", () => {
    const slugs = resources.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const r of resources) {
      expect(articles[r.slug]?.limitations.length).toBeGreaterThan(20);
      for (const rel of r.related) expect(slugs).toContain(rel);
    }
  });
});

describe("web app manifest", () => {
  it("is installable: name, start_url, standalone display and 192/512 + maskable icons", () => {
    const m = manifest();
    expect(m.name).toBeTruthy();
    expect(m.start_url).toBeTruthy();
    expect(m.display).toBe("standalone");
    const sizes = (m.icons ?? []).map((i) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  });
});

describe("robots safety", () => {
  it("never disallows a prefix of a public route", async () => {
    const { nonIndexedPrefixes } = await import("@/config/routes");
    for (const route of indexableRoutes()) {
      for (const prefix of nonIndexedPrefixes) expect(route.path.startsWith(prefix)).toBe(false);
    }
  });
});
