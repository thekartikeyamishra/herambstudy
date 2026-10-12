import { resources } from "@/content/resources";

/** Canonical, indexable public routes. The sitemap is generated from this list only. */
export type RouteEntry = {
  path: string;
  priority: number;
  changeFrequency: "weekly" | "monthly" | "yearly";
  lastModified?: string;
};

export const staticRoutes: RouteEntry[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
  { path: "/for-institutes", priority: 0.8, changeFrequency: "monthly" },
  { path: "/for-students", priority: 0.8, changeFrequency: "monthly" },
  { path: "/resources", priority: 0.9, changeFrequency: "weekly" },
  { path: "/invite", priority: 0.7, changeFrequency: "monthly" },
  { path: "/pilot", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/trust", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refund-policy", priority: 0.2, changeFrequency: "yearly" },
];

export function indexableRoutes(): RouteEntry[] {
  return [
    ...staticRoutes,
    ...resources.map((r) => ({
      path: `/resources/${r.slug}`,
      priority: 0.8,
      changeFrequency: "monthly" as const,
      lastModified: r.reviewed,
    })),
  ];
}

/** Never indexed and disallowed for crawlers (robots.txt is not access control). */
export const nonIndexedPrefixes = ["/api/", "/offline", "/email/"];
