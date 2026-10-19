# Test results — v0.6.0, 15 October 2026

Environment: Linux sandbox, Node 22.22.0, npm 10.9.4, Chromium (Playwright build 1194). These are the actual results of commands run on this code.

| Gate | Command | Result |
|---|---|---|
| TypeScript (strict) | `npm run typecheck` | **Pass** — 0 errors |
| Lint | `npm run lint` | **Pass** — 0 errors, 0 warnings |
| Unit / integration / component | `npm test` (Vitest 5) | **Pass** — 212/212 tests in 14 files (includes every test file in `tests/fixtures` checked against its documented expected result) |
| Production build | `npm run build` | **Pass** — 36 routes; every page statically prerendered, only `/api/*` dynamic |
| End-to-end | `npm run test:e2e` (desktop 1366px, tablet 820px, mobile 360px) | **Pass** — 203 passed, 0 failed, 10 skipped (single-viewport tests run once by design), one uninterrupted run |
| Accessibility | axe-core WCAG 2.0/2.1/2.2 A+AA on 24 public pages | **Pass** — 0 serious or critical violations |
| Lighthouse | see `PERFORMANCE.md` | Perf 86–100 (mobile; audience pages 86–89), 100 (desktop); A11y 100; Best practices 100 |
| Developer tools absent from production | `npm run build` (postbuild guard) + `npm run smoke:prod` | **Pass** — guard prints “OK — no developer routes”; `/dev`, `/dev/crash`, `/api/dev/state` → 404; no developer links in HTML. Guard verified to FAIL (exit 1) when dev routes are present, including with the flag set on the production domain |
| Video | `cd video && npx tsc --noEmit` + full renders | **Pass** — 16:9, 9:16, 1:1 MP4s rendered |
| Firestore rules | `npm run test:rules` | **Not run** — emulator download blocked in the build sandbox. Run locally. |
| Dependency audit (production) | `npm audit --omit=dev` | **0 vulnerabilities** (after firebase-admin 14.5 upgrade + PostCSS override) |
| Dependency audit (all, incl. dev tooling) | `npm audit` | 14 (2 moderate, 12 high), **dev-only**, see below |

## What the tests prove (selected)
- A visitor can complete the invite request; success appears **only** after the server confirms storage.
- Duplicate requests get the identical response; the original record (name, consent) is never overwritten.
- Invalid emails, missing fields, honeypot hits, too-fast submissions, non-JSON, oversized bodies and cross-site origins are rejected with the right status codes.
- With no storage, or a storage error, the API returns 503 and the UI says nothing was saved.
- Rate limiting triggers after 5 requests per IP per 10 minutes, with `Retry-After`.
- Client-sent `status` or consent objects are ignored.
- Consent boxes are never pre-checked.
- App-store badges are non-navigating "Coming soon" controls with no configured URL.
- The install control shows an honest message when installation isn't available, and the real button only after `beforeinstallprompt`.
- Ads render nothing without valid config; no ad script loads on resource pages.
- Every public page has one H1, a canonical URL, a description, and no horizontal scroll (including at 320px).
- Security headers (CSP, nosniff, frame-ancestors, referrer policy) are present; `X-Powered-By` is removed.
- Sitemap lists only public pages; `GET /api/invite` returns 405 and exposes no data.
- The gap analyser and readiness diagnostic produce correct results end to end.

## Added in v0.2 (selected)
- Class analyser: delimiter detection, quoted cells, MAX rows, absences, precise row/column errors, whole-class vs small-group thresholds, deterministic sample, formula-safe CSV; E2E on the fictional class (24 rows, plan ordering) and on bad data.
- Pilot: valid application stored with normalised email/phone and de-duplicated exams; required-field errors; invalid phone; honest 503; owner alert sent only when email is configured (reply-to = applicant); E2E submission on 3 viewports.
- Email: tokens bound to purpose and id, constant-time compare; acknowledgement sent once per new request (not on duplicates), confirm link only when opted in; provider failure still returns success; confirm refused for people who didn't opt in; RFC 8058 one-click unsubscribe without Origin; 503 when links aren't configured; HTML escaping in templates; E2E double-opt-in round trip including a wrong-purpose token.

## Added in v0.3 (selected)
- Follow-up comparison: case-insensitive matching of topics and students, unmatched items reported, gaps closed / still below / slipped per topic, margin applied to class-average change, formula-safe CSV, fictional follow-up shows real progress; E2E round trip on 3 viewports.
- Pilot: institution type required and stored; `/for-schools` → `/pilot?type=school` pre-selects "School".
- New pages `/for-schools`, `/for-colleges`, `/guide`: one H1, canonical, metadata, no horizontal scroll at 320 px, axe clean.

## Added in v0.4 (selected)
- Tracker logic: date ordering, case-insensitive topic series with gaps for missing topics, last change, persistent gaps that skip absences, last-two-test comparison.
- Workspace storage: localStorage round trip, corrupt and wrong-version data, blocked storage, 4 MB guard, quota errors, backup validation (including re-parsing every stored test), merge without overwriting, ID/date formats.
- E2E (desktop, tablet, mobile): demo class shows trends, repeating gaps and change summary and survives reload; save from analyser → open tracker → add second test → repeating gap and "1 gap closed"; invalid marks are rejected and nothing is saved.

## Added in v0.5 (selected)
- Student links: per-student reports with class averages and absences, UTF-8 round trip (Hindi names), tampered/oversized/wrong-version payloads rejected, focus topics, WhatsApp list and formula-safe CSV, stable ids; student history save/de-dupe/remove/topic history/corrupt/full/unavailable.
- E2E: teacher creates links → student opens in a new tab → "Shared by" + focus topics → save → My progress shows topic history; invalid link explains itself; /r and /me carry noindex.
- Plans: higher plans never remove features; free contains every available zero-cost tool including student links; public guarantees contain no unbacked promises (unit + E2E check on /pricing).
- AI summary (from the earlier v0.5 work, now verified): aggregate-only input, provider fallback, quotas, cache; rule-based summary works with no AI configured.

## Added in v0.6 (selected)
- Developer-tools gate: 8 environment combinations (dev, production, tests, preview with flag, flag on production deployment, flag with production domain in any case, non-exact flag value) — app and build script agree in every case.
- Dev inbox and dev link secret exist only with developer tools; a real email provider wins.
- Test kit: 39 data files, 5 backups, 11 link cases each checked against the manifest; links count only if they decode exactly as `/r` will.
- Regressions: decimal-only numbers, all maximum-marks labels, misplaced MAX warning, >100% message, missing roll numbers, same-date natural sort, largest Hindi report link.
- E2E: developer console (environment, dev inbox → confirm link → confirmed, seeding, file count from manifest), odd number formats rejected, "Full marks" row, longest Hindi link opens.

## Issues found by testing and fixed
1. Layout shift on desktop from web-font swap → `next/font/local`.
2. Layout shift on mobile from root `loading.tsx` streaming → removed.
3. Install-control height change after hydration → fixed height.
4. Spoofable `X-Forwarded-For` on Google load balancers → host-aware IP extraction (`CLIENT_IP_MODE`).
5. Moderate advisories in firebase-admin 13 → upgraded to 14.5; high PostCSS advisory bundled with Next → override to 8.5.29; critical Vitest/Tinypool advisory → Vitest 5.
6. v0.2: every resource page shipped all six tools → per-tool code splitting.
7. v0.2: axe scan exceeded the 60 s default timeout on a cold dev server → test budget raised (no violations).
11. v0.6: Hindi-heavy report links over 12,000 characters failed to open; “Full marks”/“Out of:” rows were read as a student; hex/exponent/space-inside numbers were silently accepted; MAX row at the bottom silently switched to percentages; misleading advice for “120%”; unnamed rows not flagged; “Unit 10” sorted before “Unit 2”. All fixed with regression tests and test files 16–19, 34, 35.
10. v0.5: `/pricing` publicly promised renewal reminders and 12 months of read-only access after cancelling — neither exists or was decided; removed and moved to BUSINESS-MODEL.md as proposals. A planned robots `Disallow: /r` would have blocked `/resources` (prefix match) — replaced with noindex and a guard test.
9. v0.4: "Save to class" could save an unnamed class (validation ran after the save) → validation moved first; it also saved the textarea rather than the analysed data → now saves exactly what was analysed; "1 gaps" grammar fixed.
8. v0.3: six-item nav wrapped labels at 1024 px → full nav from 1280 px, compact menu below, `whitespace-nowrap`.

## Remaining dev-only advisories
Tailwind CSS 3 (chokidar/fast-glob/micromatch file-watching libraries), `eslint-config-next` 15, and the `firebase` client SDK used only by the rules tests. None ship to the browser or run in production; they process only this repository's own files. Fixing them needs a Tailwind 4 migration and a Next 16 upgrade — planned, not urgent.

Passing tests are evidence of testing, not proof the application cannot be attacked.
