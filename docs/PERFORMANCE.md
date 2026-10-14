# Performance audit

Measured 12 October 2026 on the production build (`next build && next start`), Lighthouse 12, headless Chromium, in a cloud sandbox. **Lab data, not real-user (field) data** — Core Web Vitals at the 75th percentile can only be confirmed from Search Console / CrUX after launch with real traffic.

## Lighthouse results (after fixes)

| Page | Mode | Perf | A11y | Best practices | SEO* | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` | mobile | 95 | 100 | 100 | 66* | 2.6 s | 150 ms | 0 |
| `/` | desktop | 100 | 100 | 100 | 66* | 0.6 s | 0 ms | 0 |
| `/invite` | mobile | 96 | 100 | 100 | 66* | 2.6 s | 100 ms | 0 |
| `/invite` | desktop | 100 | 100 | 100 | 66* | 0.6 s | 0 ms | 0 |
| `/resources/learning-gap-analysis` | mobile | 100 | 100 | 100 | 66* | 1.5 s | 50 ms | 0 |
| `/resources/learning-gap-analysis` | desktop | 100 | 100 | 100 | 66* | 0.6 s | 0 ms | 0 |
| `/for-institutes` | mobile | 97 | 100 | 100 | 66* | 2.4 s | 100 ms | 0 |
| `/for-institutes` | desktop | 100 | 100 | 100 | 66* | 0.6 s | 0 ms | 0 |

\* The only failing SEO audit was "Page is blocked from indexing" — intentional, because `robots.txt` blocks every non-production origin (the audit ran on `localhost`). On the real https domain this audit passes.

Mobile LCP of 2.4–2.6 s under Lighthouse's simulated slow-4G throttling is at the 2.5 s target; re-measure on the deployed CDN.

## Issues found and fixed during the audit
1. **Layout shift up to 0.69 (desktop)** — late web-font swap re-flowed headings. Fixed by moving fonts to `next/font/local` (preloaded, metric-matched fallbacks).
2. **Layout shift 0.6 (mobile)** — the root `loading.tsx` streamed a short skeleton first, so the footer painted high and was pushed down. Every page is static, so the boundary was removed.
3. **Install control height change after hydration** — placeholder and final states now share a fixed height.

## Bundle (from `next build`)
- Shared first-load JS: **103 kB** (React + Next runtime).
- Heaviest routes: `/invite` 126 kB, `/contact` 124 kB (include the Zod schemas for instant client-side validation), resource pages 121 kB (interactive tools).
- All 25 pages are statically prerendered; only `/api/*` runs on demand.

## What's in place
Static prerendering + CDN; self-hosted, subset (latin) variable fonts with `display: swap`; no images on the critical path (SVG/CSS illustrations); GA and AdSense scripts absent unless configured and consented; service worker caches hashed assets; `compress: true`; reduced motion respected; no third-party scripts by default.

Not added (not justified by measurements): Redis, load balancer, search cluster, edge caching of API responses.

## How to re-run
```powershell
npm run build; npm start
npx lighthouse http://localhost:3000/ --preset=desktop --view
npx lighthouse http://localhost:3000/ --form-factor=mobile --view
```
After launch, use Search Console → Core Web Vitals and PageSpeed Insights on the live URL.

## v0.2 additions (measured 12 Oct 2026, mobile unless stated)

| Page | Perf | A11y | Best practices | LCP | TBT | CLS |
|---|---|---|---|---|---|---|
| `/resources/class-test-analyser` | 93 | 100 | 100 | 2.6 s | 220 ms | 0 |
| `/resources/learning-gap-analysis` | 91 | — | — | 2.8 s | 260 ms | 0 |
| `/pilot` (2 runs) | 92–94 | 100 | 100 | 2.3 s | 230–250 ms | 0 |
| `/pilot`, `/resources/class-test-analyser` (desktop) | 100 | 100 | 100 | 0.6 s | 0 ms | 0 |

Fix made: resource tools were all statically imported by the article registry, so every resource page shipped all six tools. Each tool is now its own chunk via `next/dynamic` (server rendering kept). Single Lighthouse runs in the 2-CPU sandbox vary by ±5 points; re-measure on the live site.

## v0.3 additions (mobile, 14 Oct 2026)

| Page | Perf | A11y | Best practices | LCP | TBT | CLS |
|---|---|---|---|---|---|---|
| `/for-schools` (3 runs) | 78–89 | 100 | 100 | 2.7–2.9 s | 320–670 ms | 0 |
| `/guide` (2 runs) | 86–87 | 100 | 100 | 2.6–2.7 s | 390–430 ms | 0 |
| `/for-institutes` (control, same session) | 95 | — | — | 2.1 s | 210 ms | 0 |

Cause: the audience pages carry 18 FAQ answers, so the HTML document is ~102 KB vs ~70 KB and the main thread does ~150 ms more work. Accepted for now because the answers are the conversion content. If field data shows LCP above 2.5 s, move the FAQ below a "Show all questions" disclosure rendered only on interaction.

## v0.4 (14 Oct 2026)
| Page | Mode | Perf | A11y | Best practices | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/tracker` | mobile | 94 | 100 | 100 | 2.9 s | 130 ms | 0 |
| `/tracker` | desktop | 100 | 100 | 100 | 0.6 s | 0 ms | 0 |

## v0.5 (14 Oct 2026, mobile, same-session comparison)
Lab conditions in the sandbox were slower in this session: the `/for-institutes` control page scored 80 (95 earlier). Measured side by side:

| Page | Perf | LCP | TBT | CLS |
|---|---|---|---|---|
| `/for-institutes` (control) | 80 | 2.6 s | 660 ms | 0 |
| `/r#…` (student report) | 78–80 | 2.0–2.8 s | 240–620 ms | 0 |
| `/pricing` | 83–89 | 2.2–2.7 s | 420–520 ms | 0 |

New pages are in line with existing pages. Accessibility and best practices: 100 on both. Re-measure on the live CDN.
