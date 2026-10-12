# SEO, Search Console and analytics

## Implemented
- Unique title, meta description and canonical URL on every page (asserted in E2E for 17 pages).
- Open Graph + Twitter cards; build-time social image (`/opengraph-image`).
- `sitemap.xml` from `src/config/routes.ts` (17 URLs: 12 pages + 5 resources), absolute URLs.
- `robots.txt`: allows crawling only on the https production origin; disallows `/api/` and `/offline`; blocks everything on localhost/previews.
- JSON-LD: Organization, WebSite, BreadcrumbList, Article. No fabricated ratings, reviews, prices or FAQ markup.
- One H1 per page, logical headings, descriptive link text, breadcrumbs on resources, related-resource links (no orphan pages).
- `/offline`, `/404` and API routes are `noindex`.

## Search Console checklist (owner)
1. search.google.com/search-console → **Add property → Domain** → `heramb.study`.
2. Verify with the **DNS TXT record** at your registrar (preferred). Alternative: set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and redeploy (URL-prefix property).
3. **Sitemaps** → submit `https://heramb.study/sitemap.xml`.
4. **URL inspection** → test the home page and one resource → "Request indexing".
5. After 2–4 weeks: **Pages** report (indexing issues), **Core Web Vitals** (needs real traffic), **Performance** (actual queries — use these, not guesses, to choose new content).
Do not record Search Console as verified until it says so.

## GA4 (optional)
1. analytics.google.com → create property → Web stream → copy `G-XXXXXXX` to `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
2. Admin → Data retention → **2 months**. Admin → Data collection → keep Google signals **off**.
3. Mark `invite_request_submitted` as a key event.
The consent banner appears automatically; nothing loads before consent.

## Content strategy (what to publish next)
Publish only resources that are genuinely more useful than what ranks today, prioritised by verified keyword data (see `RESEARCH.md`). Good next candidates: a downloadable topic-tagging spreadsheet, a "how to run a 15-minute reteach group" guide, and a Hindi version of the readiness diagnostic (then add `hreflang`).
Avoid: one page per city/exam/keyword variant, AI-spun articles, and fake case studies.

## International SEO
`lang="en-IN"` today. When a full Hindi page exists, add `alternates.languages` (`en-IN`, `hi-IN`, `x-default`) in `buildMetadata` for both versions. Do not translate only navigation.

## Legitimate backlink plan
1. Share the free tools in teacher communities you genuinely participate in (not link drops).
2. Offer the progress-report template to coaching associations and education bloggers as a free resource.
3. Guest articles on mistake-type analysis for education publications.
4. After pilots, publish an honest pilot write-up (with institute permission) — real data earns links.
5. List on relevant directories only where the listing is useful to users.
Never buy links, join link schemes, or fabricate press coverage.
