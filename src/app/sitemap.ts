import type { MetadataRoute } from "next";
import { indexableRoutes } from "@/config/routes";
import { absoluteUrl, siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRoutes().map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: r.lastModified ?? siteConfig.legalLastUpdated,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
