import type { MetadataRoute } from "next";
import { nonIndexedPrefixes } from "@/config/routes";
import { absoluteUrl, siteConfig } from "@/config/site";

/**
 * Only the real production origin is crawlable. Preview/staging deployments
 * (any other NEXT_PUBLIC_SITE_URL, or localhost) disallow everything.
 */
export default function robots(): MetadataRoute.Robots {
  const isProductionOrigin = siteConfig.url.startsWith("https://") && process.env.VERCEL_ENV !== "preview";
  if (!isProductionOrigin) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: nonIndexedPrefixes }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
