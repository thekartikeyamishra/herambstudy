<!-- Revision 3 (v0.7.0, 19 Oct 2026). HANDOVER.pdf is revision 2 (v0.6.1); this Markdown is the current source of truth. -->
Heramb**.**study

# Project handover & continuation guide

Everything needed to pick up development, deployment and go-to-market exactly where we left off, without losing context, breaking production or repeating past mistakes.

Version**0.7.1**

Date**19 October 2026**

Owner**Kartikeya Mishra**

Live site**herambstudy.vercel.app**

Intended domain**heramb.study**

Status**All checks passing**

## Contents

1. Start here: resume in 10 minutes
2. Project snapshot
3. What the product does today
4. Pages, routes and APIs
5. Architecture and stack
6. Data, privacy and AI design
7. Developer tools that never reach production
8. Environment variables
9. Local setup on Windows
10. Quality gates and testing
11. Updating GitHub and Vercel
12. Non-negotiable rules
13. Troubleshooting: errors and fixes
14. Known limitations
15. Business model and open decisions
16. Development roadmap (prioritised)
17. Go-to-market: outreach status
18. Outreach playbook
19. Pitch video
20. Deliverables and file index
21. Status board: done, owner tasks, and to build
22. Integration blueprint: how each future feature plugs in
23. Sprint plan and definition of done
24. Prompt to resume with Claude
25. Change history

**How to read this:** sections 1, 11, 12 and 24 are the minimum before touching code. Section 21 shows what is done and what is left. Sections 16, 22 and 23 are the work queue and how to build it without breaking anything. Section 17 is the sales pipeline. Everything else is reference.

## 0. What changed in v0.7 (read first)

v0.7 answers the question of how to show real users and usage when nobody has an account.

- **`/founding`** issues an institute code and a numbered founding seat. Teachers connect with `#connect=CODE` invite links.
- **Every real test, shared link and student action** is counted anonymously for that institute. Only counts are kept, never marks or names.
- **`/institute#CODE`** shows the institute its 7 goals. **`/admin`** (set `OWNER_DASHBOARD_PASSWORD`) shows you every institute, with WhatsApp nudges, follow-up dates and a CSV export.
- **The weekly Monday digest** (`CRON_SECRET` plus Vercel Cron) keeps institutes regular. The **public live counter** appears once at least 3 institutes have joined.
- **Import without retyping:**
  - Excel files, plus test-platform and ERP exports (auto-tidied);
  - Google Sheet links (remembered, one-tap refresh);
  - photos and PDFs of marksheets (needs `AI_PROVIDER`).
- **Students get** "Was this useful?" and "Add to calendar" revision reminders.
- **Before the first meeting:**
  - Point the visiting-card QR at `https://herambstudy.vercel.app/founding?source=meeting`.
  - Set `OWNER_DASHBOARD_PASSWORD`, `CRON_SECRET` and the Firestore and email variables in Vercel Production.
  - Redeploy, then join once yourself as a test and delete that entry from `/admin`.
- The full playbook is in `docs/FOUNDING-PROGRAM.md`.

New environment variables: `FOUNDING_CAP`, `PUBLIC_STATS_MIN`, `OWNER_DASHBOARD_PASSWORD`, `CRON_SECRET`, `IMPORT_PHOTO_DAILY_LIMIT` (see `.env.example`).

New routes:
- **Pages:** `/founding`, `/institute`, `/admin`.
- **APIs:** `/api/institutes` (with `/stats`, `/feedback`, `/digest`), `/api/events`, `/api/stats/public`, `/api/admin/session`, `/api/admin/institutes`, `/api/cron/digest`, `/api/import/sheet`, `/api/import/extract`.

> **Updating from a zip:** always use the clean-replace steps in `docs/DEPLOYMENT.md` (“Updating the repository from a release zip”). `npm run build` refuses to build when files from older releases are left behind.

## 1. Start here: resume in 10 minutes

On Windows, in PowerShell, inside your local clone of the GitHub repo:

```
# 1. Get the latest code (if you're working from this zip instead, copy it over your clone, keeping .git and .env.local)
git pull
# 2. Correct Node version (22.12 or newer, below 23)
node -v
# 3. Install exactly the locked dependencies
npm ci
# 4. Local env file (never commit it)
Copy-Item .env.example .env.local   # first time only, then fill values
# 5. Run with in-memory storage (no Firebase needed) and developer tools on
$env:HERAMB_DEV_TOOLS="true"; npm run dev:memory
# 6. Open http://localhost:3000 and http://localhost:3000/dev (developer console)
# 7. Before every push: the full gate
npm run check            # typecheck + lint + 212 unit tests + build + no-devtools guard
npm run test:e2e         # 203 browser tests (optional locally, required before releases)
```

**Current state ({{DATE}}):** {{GATES}}

### The five things most likely to trip you up

1. **Old dev servers serve stale or unstyled pages.** Stop every `npm run dev` (Ctrl+C), delete `.next`, then start again.
2. **The live site isn't on heramb.study yet.** All outreach links and QR codes use `https://herambstudy.vercel.app/`. Keep that URL working even after the domain is connected; Vercel can redirect it.
3. **Never set `HERAMB_DEV_TOOLS` for Production.** The build fails on purpose if developer routes would be shipped.
4. **Firestore must be configured in production.** Without it, the invite, contact and pilot forms return an honest 503. Locally, `npm run dev:memory` stores them in memory instead.
5. **Feature claims must match `src/config/plans.ts`.** Website copy, outreach and videos may only say "available" for features that config marks available.

## 2. Project snapshot

| Item | Value |
| --- | --- |
| Product | **Heramb.study**: an invite-only edtech platform that turns test marks into chapter-wise teaching plans and student progress, for JEE/NEET coaching institutes first, then schools and colleges. |
| Tagline | Progress, made visible. |
| Owner / operator | Kartikeya Mishra, solo founder and full-stack developer (Lucknow; outreach currently in Prayagraj) |
| Stage | Launch website with free tools live; **Founding Institute Programme** (codes, dashboards, owner CRM) recruiting 20–50 founding coachings; no accounts or billing yet |
| Live URL | `https://herambstudy.vercel.app/` (Vercel). Free test analyser: `/resources/class-test-analyser` |
| Canonical domain | `heramb.study` (set by `NEXT_PUBLIC_SITE_URL`). Ownership and trademark still to be confirmed. |
| Code version | 0.7.1, Node 22, about 125 TypeScript source files and 64 test files |
| Hosting options | Vercel (current) or Firebase App Hosting (`apphosting.yaml` ready) |
| Data store | Cloud Firestore, accessed only through server routes (Admin SDK); clients are denied by the rules |
| Primary metric now | Founding institutes meeting the 7 programme goals (see `docs/FOUNDING-PROGRAM.md`) — activation, teacher adoption, distribution, student engagement, repeat usage, 30-day retention, value |

### Who it is for, and the one job it does

A teacher pastes one test's marks: roll numbers, chapter-wise marks and a `MAX` row. In seconds Heramb shows which chapters the **whole class** needs re-taught, which need a **small group**, and which **students** need attention. Over time the tracker shows trends and gaps that keep repeating, and every student gets a personal report link carrying the institute's name. Free tools need no sign-up, and individual marks never leave the device.

**Coaching institutes (primary)**  
Daily and weekly tests already exist. Pain: parents can't see progress, crowded batches hide weak students, and reviews complain about syllabus and management.

**Schools and colleges (hypothesis)**  
Board and semester gaps are found too late. `/for-schools` and `/for-colleges` exist. Fit will be validated by pilot applications grouped by `institutionType`.

## 3. What the product does today

The single source of truth is `src/config/plans.ts`. Status: AVAILABLE works today · PILOT only with pilot partners · PLANNED not built; say "coming".

| Feature | Status | Where / notes |
| --- | --- | --- |
| Class test analyser (paste/upload, chapter plan, small groups, needs-attention) | AVAILABLE | `/resources/class-test-analyser` · logic `src/lib/tools/classAnalysis.ts` · up to 500 students, 40 topics |
| Follow-up check (re-test vs first test) | AVAILABLE | `compareClasses()` in classAnalysis.ts |
| Class progress tracker (trends, repeating gaps, export/import) | AVAILABLE | `/tracker` · browser storage · `src/lib/tools/tracker.ts`, `src/lib/client/workspace.ts` |
| Instant rule-based teaching summary | AVAILABLE | Zero cost; used whenever AI is off or fails |
| AI teaching summary and parent note | AVAILABLE | Only when `AI_PROVIDER` is set · 5 a day free · aggregates only · `/api/ai/summary` |
| Student term reports | AVAILABLE | In the tracker; print-all |
| Personal student report links (institute name) | AVAILABLE | `/r#…`: the report lives in the URL fragment (20,000-character cap) · `src/lib/tools/studentReport.ts` |
| Student "My progress" | AVAILABLE | `/me` · browser storage · `src/lib/client/studentStore.ts` |
| Student tools: readiness, gaps, mistakes, compare | AVAILABLE | `/resources/*` · `src/lib/tools/{readiness,gaps,mistakes,compare}.ts` |
| Data export any time | AVAILABLE | On every plan (enforced by tests) |
| Invite waitlist, contact form, pilot application | AVAILABLE | Needs Firestore in production · owner CLI `npm run waitlist` |
| Email: acknowledgement, double opt-in, one-click unsubscribe, owner alerts | AVAILABLE | Only when Resend is configured |
| Targeted practice assigned to students | PILOT | Concierge, with pilot partners |
| Onboarding and priority support | PILOT | Founder-led |
| Cloud history, multi-device | PLANNED | Needs accounts (roadmap P1) |
| Letterhead reports, parent delivery (WhatsApp/email) | PLANNED | Paid layer |
| Multi-teacher workspace, owner dashboard, multi-branch | PLANNED | Institute plan |
| Topic-tagged question bank | PLANNED | Later |

### Plans

Free (₹0), Teacher Pro, Institute and Network. Paid prices are deliberately unpublished ("Founding price on request") until at least five pilot conversations. Two public guarantees exist and are honoured: **data export any time**, and **what is free stays free; paid plans only add**.

## 4. Pages, routes and APIs

| Route | Purpose |
| --- | --- |
| `/` | Home |
| `/how-it-works` | The assess → diagnose → practise → verify loop |
| `/for-institutes`, `/for-schools`, `/for-colleges`, `/for-students` | Audience pages with FAQs (fit for colleges is stated honestly; no CO-PO calculation) |
| `/guide` | Every tool explained, with pilot links per institution type |
| `/resources` + 6 articles | class-test-analyser, assessment-readiness-diagnostic, learning-gap-analysis, student-progress-report-template, comparing-assessments, interpreting-repeated-mistakes |
| `/tracker` | Class progress tracker |
| `/r`, `/me` | Student report link and student history (noindex, no analytics, no ads) |
| `/pricing` | Plans rendered from config |
| `/invite`, `/pilot?type=coaching|school|college|tutor`, `/contact` | Forms |
| `/about`, `/trust`, `/privacy`, `/terms`, `/refund-policy` | Company and legal pages (legal pages are drafts with placeholders) |
| `/email/confirm`, `/email/unsubscribe`, `/offline` | Utility pages |
| `/dev`, `/dev/crash`, `/api/dev/state` | **Developer only**: compiled only when developer tools are on (§7) |

### API routes

| Endpoint | Behaviour |
| --- | --- |
| `POST /api/invite` | Zod validation → origin check → honeypot and timing → rate limit → Firestore `create()` on a deterministic ID (sha256 of the email) for de-duplication |
| `POST /api/contact`, `POST /api/pilot` | Same pipeline; the pilot route also sends an owner alert email when configured |
| `GET /api/email/confirm`, `/unsubscribe` | HMAC-signed tokens; RFC 8058 one-click unsubscribe |
| `POST /api/ai/summary` | Aggregate-only input, quotas, cache and rule-based fallback |
| `GET /api/health` | `{"ok":true,"storage":"firestore"}` in a correctly configured production |

Also generated: `/sitemap.xml` (from `src/config/routes.ts`), `/robots.txt` (blocks crawling on previews), `/manifest.webmanifest`, `/opengraph-image`. Never add a short robots prefix such as `/r`; a test guards this because it would block `/resources`.

## 5. Architecture and stack

```
Browser ──HTTPS──▶ Next.js 15 (App Router, TypeScript strict)
                     ├─ ~25 statically prerendered public pages (CDN-cached)
                     ├─ /api/invite · /api/contact · /api/pilot · /api/email/* · /api/ai/summary · /api/health
                     │     Zod → Origin check → anti-spam → rate limit → Firestore (Admin SDK)
                     └─ sitemap · robots · manifest · opengraph-image
Cloud Firestore: inviteRequests · contactMessages · pilotApplications · rateLimits (TTL)
Optional: Resend (email), AI provider (anthropic | openai_compatible) — both off by default
Firestore rules: deny ALL client access. Only the server reads and writes.
Browser-only: tracker workspace, student history, report links (URL fragment)
```

| Layer | Choice (pinned) | Why |
| --- | --- | --- |
| Framework | Next.js 15.5.27, React 19.1.9 | Static pages plus a few server routes |
| Language | TypeScript strict | Safety |
| Styling | Tailwind 3.4.19 with CSS-variable tokens in `globals.css` | Matches the brand system |
| Validation | Zod 3.25.76 (`src/lib/validation/schemas.ts`, shared client and server) | One schema |
| Database | firebase-admin 14.5.0 (Firestore) | No client SDK |
| Tests | Vitest 5, Playwright 1.64 + axe, Firebase rules tests | Unit, end-to-end and accessibility |
| Video | Remotion 4.0.535 in `video/` (isolated package) | Never part of the site build |
| Fonts | Self-hosted Inter + Fraunces via `next/font/local` | No layout shift, no third-party requests |
| Runtime | Node 22.12+ (<23) | Engines field enforced |

### Directory map

```
src/app/               routes (one folder per page), api/, layout.tsx (hydration fix), *.dev.tsx dev pages
src/components/        ads · analytics · brand · forms · layout · marketing · pwa · resources · seo · ui
src/config/            site.ts · plans.ts · ads.ts · csp.ts · routes.ts · devtools.ts · payments.ts
src/content/           resources metadata, article bodies, fictional sample data
src/lib/server/        handlers · http · backend · firestoreBackend · memoryBackend · email · devState · aiHandler
src/lib/tools/         classAnalysis · tracker · studentReport · compare · gaps · mistakes · readiness (pure, unit-tested)
src/lib/client/        workspace · studentStore · analytics · postJson
tests/unit/ (14 files, 212 tests) · tests/e2e/site.spec.ts · tests/rules/ · tests/fixtures/ (39 data, 5 backups, 11 links)
scripts/               assert-no-devtools.mjs · smoke-prod.mjs · waitlist-admin.mjs · generate-icons.mjs
video/                 Remotion project + PITCH-VIDEO-PROMPT.md + public/heramb-qr.svg|png
docs/                  ARCHITECTURE · DEPLOYMENT · SETUP-WINDOWS · TESTING · SECURITY · PERFORMANCE · SEO · ADSENSE · RESEARCH · BUSINESS-MODEL · LAUNCH-CHECKLIST · KNOWN-LIMITATIONS · TEST-RESULTS · HANDOVER
```

## 6. Data, privacy and AI design

### Server data (Firestore)

| Collection | Key fields |
| --- | --- |
| `inviteRequests/{id}` | id = sha256("invite|"+email)[0..32]; role, country, useCase, institute, consent records (privacy + marketing double opt-in), status, utm source, duplicateAttempts |
| `pilotApplications/{auto}` | contact, institutionType, instituteName, city, studentCount, exams[], testFrequency, startWindow, priceComfort, status new→contacted→qualified→piloting→closed |
| `contactMessages/{auto}` | name, email, topic, message, status |
| `rateLimits/{hash}` | count, windowStart, expiresAt (TTL policy deletes) |

### Browser-only data (never reaches our servers)

* **Tracker workspace:** localStorage, with export/import JSON backups (versioned and validated).
* **Student report links:** the report is base64url-encoded in the URL *fragment* (`/r#…`), which browsers never send to servers. Decode cap is 20,000 characters, and links are decoded before they're offered.
* **Student history (`/me`):** localStorage on the student's device.

### AI layer

* `AI_PROVIDER=none|anthropic|openai_compatible`; default model is the small, low-cost tier; `AI_MODEL` and `AI_BASE_URL` (https only) are swappable.
* **Aggregate-only input:** topic names, class averages and counts. Never names, roll numbers or individual marks. Topic names are sanitised.
* **Always works:** a rule-based summary is used when AI is off, over quota, slow (12 s timeout), failing or returns unusable output.
* **Cost ceilings:** per-visitor daily allowance (5 on free), global daily cap (`AI_GLOBAL_DAILY_LIMIT`, default 300), 450 max output tokens, LRU cache, token usage logged.

### Security controls

CSP from `src/config/csp.ts` (allows `'unsafe-inline'` scripts as a trade-off for static rendering), HSTS, frame-deny, Origin/CSRF checks, 16 KB JSON body limit, honeypot plus timing check, two-layer rate limits (memory, then Firestore), salted IP hashing (`CLIENT_IP_MODE` first or gcp), formula-injection-safe CSV exports, header-injection-safe fields, and stripping of direction-override characters.

## 7. Developer tools that never reach production

The developer console at `/dev` lets the owner test everything, including hidden and not-yet-active features. It shows:

* environment status (never secrets) and a feature map with how to test each feature;
* buttons to seed tracker and student data, and to clear local data;
* in-memory submissions, and a dev inbox showing every email the site would send, with working links;
* the test files and report-link cases;
* the plan matrix, and `/dev/crash` for the error page.

**Three locks, all of which must stay:**

1. **Page extensions.** `*.dev.tsx` / `*.dev.ts` routes are compiled only when `devToolsEnabled()` is true (`next.config.ts` pageExtensions).
2. **Runtime gate.** Every dev route returns 404 unless `devToolsEnabled()` is true.
3. **Build guard.** `postbuild` runs `scripts/assert-no-devtools.mjs`, which fails the build if any dev route exists in the output. The build must print *"OK — no developer routes"*.

`devToolsEnabled()` (`src/config/devtools.ts`) is true in `next dev`, or when `HERAMB_DEV_TOOLS=true` on a **non-production** deployment. It is always false when `VERCEL_ENV=production` or the site URL is heramb.study, even if the variable is set by mistake.

| Where | Developer tools | How |
| --- | --- | --- |
| Local `npm run dev` | On | Automatic |
| Vercel Preview (branch / PR) | Optional | Set `HERAMB_DEV_TOOLS=true` for the **Preview** environment only |
| Vercel Production / heramb.study | **Never** | Blocked in code; `npm run smoke:prod -- <url>` verifies dev routes return 404 |

### When hidden features appear to users

* **AI summary button:** real AI only when `AI_PROVIDER` and a key are set; otherwise rule-based.
* **Email features:** only when `RESEND_API_KEY`, `EMAIL_FROM` and `EMAIL_TOKEN_SECRET` are set.
* **Ads:** never unless `NEXT_PUBLIC_ADSENSE_ENABLED=true` with real IDs. Keep them disabled.
* **Analytics:** only with `NEXT_PUBLIC_GA_MEASUREMENT_ID`, and only after consent.
* **Store badges:** show "Coming soon" until store URLs exist.

## 8. Environment variables

Template: `.env.example`. Local file: `.env.local`, which is git-ignored and must never be committed. `NEXT_PUBLIC_*` values are embedded in the browser bundle, so they must never hold secrets. Use one credential per environment and prefer ADC on Google infrastructure.

| Variable | Needed | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Prod | https origin, no trailing slash. Today the Vercel URL; later https://heramb.study |
| `NEXT_PUBLIC_OPERATOR_NAME` | Prod | Kartikeya Mishra |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Prod | **Empty today.** Set a business email (e.g. hello@heramb.study) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Prod (Vercel) | Service account. Paste the key with literal `\n` sequences |
| `FIREBASE_USE_ADC` | App Hosting | true on Firebase App Hosting / Cloud Run, with the three fields above empty |
| `RATE_LIMIT_SALT` | Prod | Long random string |
| `CLIENT_IP_MODE` | Prod | `first` (Vercel) or `gcp` (App Hosting) |
| `DEV_MEMORY_STORE` | Dev only | Ignored in production |
| `HERAMB_DEV_TOOLS` | Preview only | **Never** in Production |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TOKEN_SECRET`, `OWNER_NOTIFICATION_EMAIL` | Optional | Turns email on. Verify the domain (SPF/DKIM) first. Rotating the token secret invalidates old links |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`, `AI_FREE_DAILY_LIMIT`, `AI_GLOBAL_DAILY_LIMIT` | Optional | Off by default. Check provider docs before enabling |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional | Analytics is consent-gated. Prefer DNS verification for Search Console |
| `NEXT_PUBLIC_ADSENSE_*` | Keep off | See `docs/ADSENSE-READINESS.md` |
| `RAZORPAY_ENABLED`, `PAYPAL_ENABLED` | Keep false | Not implemented (see §22-E) |
| `NEXT_PUBLIC_FIREBASE_*` | Unused | Reserved for the future authenticated app |

Changing environment variables on Vercel takes effect only after a redeploy: Deployments → ⋯ → Redeploy.

## 9. Local setup on Windows

1. **Node 22.** Install nvm-windows, then `nvm install 22.12.0` and `nvm use 22.12.0`. Check with `node -v`.
2. **Git.** Clone the private GitHub repo, then `cd heramb-study`.
3. **Dependencies.** Run `npm ci`. Use `npm install` only when deliberately changing dependencies; `package.json` pins exact versions and overrides `postcss` to 8.5.29.
4. **Env file.** Run `Copy-Item .env.example .env.local`. For local work without Firebase, leave the Firebase fields empty and use `npm run dev:memory`.
5. **Run** `npm run dev` or `npm run dev:memory`, then open `http://localhost:3000`. The developer console is at `/dev`.
6. **Browsers for end-to-end tests:** `npx playwright install chromium` (once).
7. **Firestore rules tests:** install Java 11+, then `npm run test:rules` (uses the Firebase emulator via npx).
8. **Video project:** `cd video; npm ci; npm run studio`.

### Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` / `dev:memory` | Dev server (memory store keeps form submissions in RAM) |
| `npm run check` | typecheck → lint (zero warnings) → unit tests → build → no-devtools guard |
| `npm run test:e2e` | Playwright on 3 viewports with axe accessibility checks |
| `npm run test:rules` | Firestore security rules against the emulator |
| `npm run build && npm start` | Production build served locally |
| `npm run smoke:prod -- https://herambstudy.vercel.app` | Checks the live site: pages, APIs and SEO files respond, and dev routes return 404 |
| `npm run waitlist -- list|pilots|export|delete …` | Owner CLI for invites and pilots (needs Firebase credentials locally) |
| `npm run icons` | Regenerate PWA icons |

## 10. Quality gates and testing

**Verified today:** {{GATES}}

| Gate | Last result | Rule |
| --- | --- | --- |
| TypeScript (`tsc --noEmit`) | Pass | Must pass before every push |
| ESLint (`--max-warnings=0`) | Pass | Zero warnings |
| Unit tests (Vitest) | {{UNIT}} | Add a test for every bug fixed |
| Build + no-devtools guard | {{BUILD}} | Must print "OK — no developer routes" |
| End-to-end (Playwright + axe) | 203 passed, 0 failed (v0.6.0 run) | Run before each release |
| Firestore rules tests | **Not yet run** (emulator blocked in the build sandbox) | Run locally with Java before launch |
| Production dependency audit | 0 vulnerabilities | Dev-tool advisories are documented in TEST-RESULTS.md |
| Real-device manual checks | **Pending:** 28 items in the test-plan CSV | Android Chrome, iOS Safari, low-end phones |

### Test assets

* `tests/fixtures/`: 39 class-data files (happy path, edge cases, errors, security), 5 tracker backups, 11 report-link cases. `manifest.json` declares each expected result and `fixtures.test.ts` enforces it.
* **Test kit** (`Heramb-Test-Kit-v0.6.zip`): the fixtures, a PDF testing guide and a 107-row CSV test plan.
* **Outreach sample CSVs** (§17): each runs cleanly through the real parser, with 0 issues and 0 warnings.

### Edge cases already handled (keep their tests)

The parser handles:

* **Maximum-marks row:** labelled "Full marks", "Out of:", "Total marks" or "Marks out of"; a misplaced MAX row triggers a warning.
* **Percentages:** `%` and `15/20` cells, and values over 100% are flagged.
* **Rejected number forms:** hex, exponent, Infinity and numbers with spaces inside (`+5`, `7,5` and `70 %` are still accepted).
* **Absences:** AB, A and absent variants.
* **Spreadsheet noise:** Average/Total rows, a BOM, CRLF line endings, invisible characters and trailing empty columns.
* **Hindi and Unicode names.**
* **Sorting:** "Unit 2" before "Unit 10".
* **Security:** formula injection, HTML or URLs in names, and direction-override characters.
* **Limits:** 500 students and 40 topics.

## 11. Updating GitHub and Vercel

Vercel deploys automatically: a push to `main` goes to **Production**, and any other branch gets a **Preview** URL.

```
# 1. Verify locally
npm ci; npm run check            # must end with "OK — no developer routes"
# 2. Check what you are committing (no .env.local, no key .json, no exports/)
git status
# 3. Preview first (recommended)
git checkout -b release/v0.6.1
git add -A
git commit -m "v0.6.1: hydration fix, pitch video prompt v2, handover docs"
git push -u origin release/v0.6.1   # Vercel posts a Preview URL — click through it
# 4. Ship
git checkout main; git pull; git merge release/v0.6.1; git push
# 5. Verify production
npm run smoke:prod -- https://herambstudy.vercel.app
```

* **Vercel settings to check once:** Node.js 22.x; production environment variables (§8); function region `bom1` (Mumbai), close to Firestore `asia-south1`.
* **Rollback:** Deployments → last good deployment → ⋯ → **Promote to Production**.
* **Domain:** Domains → add `heramb.study` and `www`, then redirect `www` to the apex. Keep `herambstudy.vercel.app` working, because every outreach QR code points to it.
* **After a deploy:** the PWA service worker may serve the previous version once. A hard refresh fixes it, or DevTools → Application → Service workers → Update.

### Firebase production setup (still to do)

1. Create a Firebase project and Firestore in `asia-south1`. Run `firebase deploy --only firestore` (rules and indexes).
2. Turn on the TTL policy for `rateLimits.expiresAt` and enable point-in-time recovery.
3. Create a least-privilege service account (Cloud Datastore User) and put its fields into Vercel's environment variables.
4. Check that `/api/health` returns `"storage":"firestore"`. Submit a real invite, confirm it in Firestore, then delete it with the CLI.

## 12. Non-negotiable rules

**Breaking any of these causes real damage (legal, security or trust).**

| Area | Rule |
| --- | --- |
| Secrets | Never commit `.env*` files (except `.env.example`), service-account JSON or `exports/`. Never put secrets in `NEXT_PUBLIC_*`. One credential per environment; prefer ADC; no `firebase login:ci` tokens. |
| Developer tools | Keep all three locks (§7). Never set `HERAMB_DEV_TOOLS` on Production. Run `smoke:prod` after releases. |
| Client data access | Firestore rules deny every client. All writes go through server routes with validation, origin check and rate limit. |
| Student privacy | Free tools keep individual marks on the device. AI receives aggregates only. Report links live in the URL fragment. `/r` and `/me` stay noindex, with no analytics and no ads. |
| Truth in claims | No invented users, testimonials, ratings, results, logos, scarcity or guarantees. Planned features say "coming". Sample data is labelled. Prices stay unpublished until decided. Applies equally to website, outreach and video. |
| Reviews | Never offer anything in exchange for reviews, and never suggest fake or staff reviews. In outreach, describe review patterns factually and never accuse anyone. |
| Consent | Marketing email only with double opt-in (`granted && confirmedAt && !withdrawnAt`). One-click unsubscribe must keep working. |
| Payments | Stay disabled until the §22-E payments checklist is complete. Never trust a client-side success redirect. |
| Ads | AdSense stays off until approval, and a certified CMP is needed before ads in the EEA or UK. |
| Change discipline | Every bug fix gets a test. Every release updates CHANGELOG and the version. `npm run check` passes before any push. |

## 13. Troubleshooting: errors and fixes

| Symptom | Cause and fix |
| --- | --- |
| Hydration mismatch mentioning `data-scribe-…`, `data-gr-…` or other attributes on `<html>`/`<body>` | A browser extension injects the attributes. **Fixed in 0.6.1** with `suppressHydrationWarning` on those two elements in `src/app/layout.tsx`. A mismatch on any other element is a real bug: look for `Date.now()`, `Math.random()` or `window` reads during render. |
| Page loads without styles, or shows old content | A stale dev server or `.next` cache. Stop all dev servers, run `Remove-Item -Recurse -Force .next`, then restart. |
| `EADDRINUSE :3000` | Another server is running. Use `npx kill-port 3000` or `npm run dev -- -p 3001`. |
| Forms return 503 "storage unavailable" | Firestore isn't configured. Locally, use `npm run dev:memory`; in production, set the Firebase variables and redeploy. |
| "Invalid PEM formatted message" / Firebase auth errors | The private key was pasted wrongly. Keep the literal `\n` sequences and the full BEGIN/END lines; on Vercel, paste without surrounding quotes. |
| API returns 403 from curl or Postman | The Origin check is working as designed. Send an `Origin` header matching the host, or test through the site. |
| Build fails in `assert-no-devtools` | `HERAMB_DEV_TOOLS` is set in that build environment. Remove it from Production. |
| `npm ci` engine error | Wrong Node version. Use 22.12+ (<23) via nvm-windows. |
| End-to-end tests time out | Run `npx playwright install chromium`, close other dev servers, and run the long suite on its own. The config starts its own server. |
| `test:rules` fails to start | Java 11+ is missing, or the emulator download is blocked. Install a JDK and retry on an open network. |
| Analyser says "more than 100%" or warns about the MAX row | The MAX row is missing or misplaced, or marks exceed the maximum. Fix the sheet. This is intended behaviour. |
| Report link won't open | The link was truncated by the messaging app, or exceeds the 20,000-character cap. Shorten topic names, or keep to 40 topics or fewer. |
| AI summary looks rule-based | AI is off, over quota or failed, and the fallback is working. Check the `AI_*` variables and the daily caps. |
| Tracker data "disappeared" | Browser data was cleared, or another browser or profile is in use. Restore from an exported backup. Cloud sync is planned. |
| Same student appears twice in the tracker | The roll number or name changed between tests. Keep roll numbers consistent. |
| Vercel deploy succeeded but changes aren't visible | Service worker or browser cache. Hard refresh, or update the SW in DevTools. |

## 14. Known limitations

The full list (29 items) is in `docs/KNOWN-LIMITATIONS.md`. The ones that matter most:

| Severity | Limitation | Next step |
| --- | --- | --- |
| MED | Legal pages are drafts with [placeholders] | Fill operator details, grievance officer, region and retention; get a lawyer's review (DPDP); remove the Draft banner |
| MED | Rules tests not yet executed | Run `npm run test:rules` locally |
| MED | No accounts or billing; tracker data is single-browser | Roadmap P1 (accounts + cloud history) |
| MED | Report links can be forwarded by anyone holding them | Guidance to share in personal chats; sign-in for paid delivery |
| LOW | No CRM for pilots | Owner alerts plus CLI export, and the outreach tracker sheet |
| LOW | Anti-spam is honeypot, timing and rate limits | Add Cloudflare Turnstile if abuse appears |
| LOW | English site only; light theme only | Hindi translation after pilots |
| LOW | The analyser works on topic totals, not individual questions | Question-level analysis belongs in the full platform |
| LOW | AI quotas are per IP until accounts exist | The global cap bounds cost |
| INFO | Next 15.5 and Tailwind 3.4 (not 16 and 4) | Upgrade deliberately later, on a branch with the full test suite |
| INFO | No contact email set; domain and trademark unconfirmed | Launch checklist |

## 15. Business model and open decisions

* **Free tools are the acquisition engine**, and they stay free. Paid plans add things that cost money to run: cloud history, letterhead reports, parent delivery, multi-teacher workspaces, owner dashboard, multi-branch.
* **Ethical retention:** institutions stay because their record (test after test, year after year, in their own name) lives in Heramb. Export is always available. They stay because it's useful, not because they're locked in.
* **Student habit loop:** a report after every test, saved to `/me`. Institutes push students onto the platform because it's their brand on each report.
* **AI cost strategy:** rule-based first, a small model by default, aggregate inputs, caching and hard daily caps.

### Decisions only the owner can make

| Decision | When |
| --- | --- |
| First prices per plan | After 5 or more pilot conversations (use the `priceComfort` answers) |
| Founding-partner 2-year price lock | Before the first paid deal |
| Renewal reminders (30 and 7 days) and 12 months of read-only access after cancelling | Once billing exists; then add them to the public guarantees |
| AI provider, model and monthly budget (sets `AI_GLOBAL_DAILY_LIMIT`) | Before enabling AI in production |
| Operator entity (sole proprietor or company), business email, domain, trademark | Before public launch |

### Product roadmap (business view)

1. Now: free tools and pilots.
2. Institute plan: accounts, cloud history, multi-teacher, principal dashboard, branded parent reports. This is the first revenue.
3. Student practice app.
4. Parent channel.
5. Question bank.
6. Consented, anonymised benchmarks.
7. B2C student plan.

## 16. Development roadmap (prioritised)

### P0: launch blockers (owner tasks plus small code changes)

| Task | Done when |
| --- | --- |
| Firebase production setup and Vercel environment variables (§11) | `/api/health` reports firestore; a real invite round-trips |
| Set `NEXT_PUBLIC_CONTACT_EMAIL` | The contact email shows in the footer, about page and legal pages |
| Legal placeholders, lawyer review, remove Draft banner | No "[" placeholders remain in `/privacy`, `/terms` or `/refund-policy` |
| Resend: domain verified, email variables set | Acknowledgement, confirm, unsubscribe and pilot alert all tested |
| Run `npm run test:rules` and the 28 real-device checks | Both recorded in TEST-RESULTS.md |
| Connect heramb.study, keep vercel.app working, verify Search Console via DNS | Sitemap submitted; old QR links still open |

### P1: first revenue (Institute plan)

| Feature | Approach and acceptance criteria |
| --- | --- |
| Accounts (institute owner and teacher) | Firebase Auth (email link or Google). Server-verified ID tokens. Rules allow only the institute's own data. Free tools still work without an account. |
| Cloud history and multi-device | Sync the tracker workspace to Firestore under the institute. Keep local-first behaviour, with one-click import of existing local backups. Export unchanged. |
| Multi-teacher workspace and owner dashboard | Roles (owner, teacher). The dashboard shows batches, latest tests, repeating gaps and needs-attention counts. |
| Letterhead reports and parent delivery | Verified institute name and logo on reports. WhatsApp/email delivery through an approved provider, with opt-in and an audit log. |
| Payments (Razorpay first) | Server-side orders, HMAC webhook verification on a raw-body route, idempotency, reconciliation, GST invoices, refund policy, and the subscription state machine. CSP updated only for checkout. |
| Pilot CRM-lite | Owner-only view or CLI to move `pilotApplications` through their statuses, with notes and next-contact dates. |

### P2: after pilots

* Hindi interface (with hreflang).
* Turnstile anti-spam, if abuse appears.
* Question-level and mistake-type analysis.
* CO-PO attainment for colleges, only if demand is proven.
* Question bank.
* Student practice app.
* Dark mode.
* Next 16 / Tailwind 4 upgrade, on a branch.

**For every task:** branch → implement → tests (unit, plus e2e for UI) → `npm run check` → Preview deploy → CHANGELOG and version → merge → `smoke:prod`. Update `plans.ts` availability only when a feature truly works in production.

## 17. Go-to-market: outreach status

We researched 10 coaching institutes around Civil Lines, Tashkent Marg, Tagore Town, Preetam Nagar and Old Cantt (Prayagraj) from their Google reviews. Each has a 2-page PDF, two WhatsApp images and a sample CSV that runs cleanly through the real parser. All links and QR codes point to `herambstudy.vercel.app` (analyser and tracker only; the pilot form was left out until production storage is confirmed).

| # | Institute | Rating | Angle (pain point) | Contact | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Gyan Coaching, 14/4 Stanley Rd | 4.8 (72) | Superseded: same organisation as Medica IIT Wing | n/a | DON'T SEND |
| 2 | Amit Tripathi Classes, Tashkent Marg | 4.5 (73) | "Your name is the brand"; Justdial shows "Closed Down"; syllabus review | +91 93051 24332 (verify) | Ready |
| 3 | M.K. Gupta Classes, opp. Patrika House | 4.9 (28) | 10–15-student batches are invisible to parents; review burst | 096286 58273 | Ready |
| 4 | Omega Institute, near Patrika Chauraha | 5.0 (88) | Protect the 5.0 (69 of 88 in 3 weeks); show progress before results | GBP Call button | Ready |
| 5 | La Pristine Akademy, 136-A Tashkant Marg | 5.0 (64) | Keep Class 6 students through Class 12 ("Class 11 risk") | GBP Call button | Ready |
| 6 | Pandey Classes, 116B Tagore Town | 4.0 (886) | Scale hides students; "a rank vs a plan"; management 2/5 | +91 63902 98336 · 63918 05546 · WA 80813 57252 · pandeyclassestt@gmail.com | Ready |
| 7 | Medica IIT Wing | 4.9 (445) | Repeated review wording across two listings makes real results harder to believe | GBP Call · facebook.com/medicaiitwing | Ready |
| 8 | The Science Hub (Ashish Tiwari sir) | 4.9 (83) | "Concepts, not mugging up", but parents see only marks; 10 unanswered reviews | GBP Call button | Ready |
| 9 | Future Classes, Preetam Nagar | 4.5 (13) | Word of mouth with nothing to forward; thin online presence | 94158 61655 | Ready |
| 10 | Gurukul Classes, Old Cantt (Sanjay sir) | 4.1 (137) | Maths is loved; reviews hurt about other subjects and regularity | GBP Call button | Ready |

Packs 2–5 use the earlier "Free snapshot" design with a warmer tone. Packs 6–10 (and 7, which replaces 1) use the restrained "Review analysis" voice the owner asked for later. If you send 2–5 now, the restrained message templates in §18 work with them too. Phone numbers marked "verify" come from directories, so confirm them against the Google listing first.

### Suggested sequence

* **Day 1:** one walking route covers 2, 3, 4, 5 and 7 (all near Patrika Chauraha).
* **Day 1 (email):** 6 Pandey Classes, then WhatsApp a few hours later.
* **Day 2:** 8 The Science Hub, 9 Future Classes and 10 Gurukul Classes.

Log every touch in a tracker sheet with institute, contact, pack sent, date, reply, meeting date, pilot status and next follow-up.

## 18. Outreach playbook

### Voice

Write like a high-value tech company: data-led, calm and specific. No exclamation marks, no "limited offer" and no chasing after day 7. Name their strength first, then the pain as something parents can't see, never as a failure. Open with value before any ask, such as fixing their listing or replying to a review.

### Sequence

1. **Message 1:** the page-1 image plus 3–4 lines: who we are, what we found, one sentence on Heramb, and two specific slots (e.g. Tuesday 11 AM or Wednesday 12 PM).
2. **Message 2:** the page-2 image plus the analyser link (try "Load a fictional class").
3. **Day 3:** one data point from their sample ("21 of 30 below half in one chapter…").
4. **Day 7:** a close-the-loop message. Then stop.

### Meeting (20 minutes)

1. **Give first (5 min):** help with their listing or review replies.
2. **Demo (8 min):** their own test, or the sample CSV, through the analyser.
3. **Show (5 min):** the tracker and one student's report link.
4. **Close:** "Shall we run your next test and review it together in a week?" Book the day-7 check-in on the spot.

### One-line answers to the usual doubts

| They say | Reply |
| --- | --- |
| Cost? | Today's tools are free and stay free; paid plans only add features. |
| Student data? | Roll numbers are enough, and individual marks stay on your device. |
| Teachers won't adopt it. | It's paste-and-read from the sheet they already use. |
| We already have test series and ranks. | Good, this uses them. A rank says where a student stands; this says what to fix. |
| Why not ChatGPT? | It forgets the last test, can miscount a table, and needs students' marks pasted in. This doesn't. |
| Can you build our website? | No. A complete Google listing plus student progress links does that job for free. |
| You're new. | Don't trust us. Test it on one paper first. |

**Ethics guardrails:** never call reviews fake; describe patterns factually. Never suggest incentivised or staff reviews. Never promise results or a conversion rate. Two packs must never land on the same organisation (Gyan Coaching and Medica IIT Wing).

## 19. Pitch video

* **Prompt:** `video/PITCH-VIDEO-PROMPT.md` (v2), also saved in the claude.ai project "Heramb Project" as `claude/pitch-video-prompt.md`. Paste it into Claude Code opened in `heramb-study/video`.
* **Output:** six masters (Institutions, Investor and Social cuts, each in English and Hindi). Full voice-over scripts, a visual system matching the site, motion/SFX/music/caption specs, and a 13-point audit with programmatic QR decoding.
* **QR:** `video/public/heramb-qr.svg` and `.png` both decode to `https://herambstudy.vercel.app/` (verified with OpenCV).
* **Existing launch video:** compositions `LaunchVideo`, `LaunchVideoVertical` and `LaunchVideoSquare`. Render with `npm run render:all`. Voice-over is not included; captions are in `captions.srt`.
* **Before rendering the investor cut:** fill every `[FOUNDER TO FILL]` placeholder (market size with source, traction, the ask, contact). Frames containing one carry a red VERIFY tag.

## 20. Deliverables and file index

Everything is in `Heramb-Handover-v0.6.1.zip`:

```
Heramb-Handover-v0.6.1/
├─ HANDOVER.pdf                         this document
├─ heramb-study/                        full source (no node_modules/.next) — v0.6.1
│   ├─ docs/HANDOVER.md                 this document as Markdown
│   ├─ video/PITCH-VIDEO-PROMPT.md      pitch video prompt v2
│   └─ … (see §5 directory map)
├─ outreach/
│   ├─ 02-amit-tripathi-classes/        PDF · page1.png · page2.png · sample CSV
│   ├─ 03-mk-gupta-classes/
│   ├─ 04-omega-institute/
│   ├─ 05-la-pristine-akademy/
│   ├─ 06-pandey-classes/
│   ├─ 07-medica-iit-wing/              (replaces 01 — Gyan Coaching)
│   ├─ 08-the-science-hub/
│   ├─ 09-future-classes/
│   ├─ 10-gurukul-classes/
│   └─ _superseded/01-gyan-coaching/    kept for reference — do not send
├─ test-kit/Heramb-Test-Kit-v0.6.zip    fixtures, PDF testing guide, CSV test plan
└─ qr/heramb-qr.svg · heramb-qr.png     → https://herambstudy.vercel.app/
```

Also produced earlier (outside the zip): the launch videos, and the outreach kit spreadsheet from the first round of research.

## 21. Status board: done, owner tasks, and to build

This is a one-page view of where everything stands. "Done" means it is built, tested and deployed on `herambstudy.vercel.app`. Items that also need production configuration are marked under "Owner tasks".

### Done (v0.6.1)

| Area | What is complete |
| --- | --- |
| Launch website | 25+ public pages: home, how it works, four audience pages, guide, resources and 6 articles, pricing, about, trust, legal drafts, invite, pilot, contact and offline. SEO (sitemap, robots, OG image, JSON-LD), PWA and security headers. |
| Free teacher tools | Class test analyser, follow-up check, class progress tracker (trends, repeating gaps, export and import), term reports, student report links, and rule-based teaching summary and parent note. |
| Free student tools | Readiness diagnostic, learning-gap analysis, repeated-mistakes guide, comparing assessments, and "My progress" (`/me`). |
| Server | Invite, contact and pilot APIs (Zod, origin check, honeypot and timing, two-layer rate limits, Firestore de-duplication). Email confirm and unsubscribe with HMAC tokens. AI summary endpoint with quotas, cache and fallback. Health endpoint. |
| Plans and entitlements | `plans.ts` (Free, Teacher Pro, Institute, Network), `entitlements.ts` (`canUse`, `aiDailyAllowance`), and a pricing page rendered from config. |
| Developer tooling | `/dev` console with three production locks, `smoke:prod`, owner CLI (`npm run waitlist`), and the test kit (39 data files, 5 backups, 11 link cases). |
| Quality | 212 unit tests, 203 end-to-end and accessibility tests, zero lint warnings, strict TypeScript, and 0 production dependency vulnerabilities. |
| Go-to-market | Outreach packs for 10 institutes (9 to send), the pitch video prompt v2 (English and Hindi), the existing launch video, and a QR code verified to decode correctly. |

### Owner tasks (no new code, needed before public launch)

| Task | Status | Proof it is done |
| --- | --- | --- |
| Firebase project, Firestore (asia-south1), rules deployed, TTL on `rateLimits.expiresAt` | TO DO | `/api/health` → `"storage":"firestore"` |
| Vercel production environment variables (§8) | TO DO | A real invite round-trips |
| Business email in `NEXT_PUBLIC_CONTACT_EMAIL` | TO DO | Shown in footer and legal pages |
| Legal placeholders and a lawyer's review (DPDP) | TO DO | No "[" placeholders; Draft banner removed |
| Resend domain (SPF and DKIM) and email variables | OPTIONAL | Confirm and unsubscribe tested |
| Connect `heramb.study`, keeping vercel.app working | TO DO | Both URLs open; Search Console verified |
| Run `npm run test:rules` and the 28 real-device checks | TO DO | Recorded in TEST-RESULTS.md |
| Send the 9 outreach packs and log them in a tracker | IN PROGRESS | First pilot meeting booked |

### To build (in order)

Accounts → cloud history → multi-teacher and owner dashboard → branded and stored reports → payments → parent delivery → pilot CRM-lite → Hindi interface → question-level analysis → student practice. §22 shows how each one plugs in, and §23 sequences them into sprints.

## 22. Integration blueprint: how each future feature plugs in

The codebase already has the seams these features need. Each feature below names the seam it uses, the files to add, the data model, the security rules, the tests, and how to turn it on safely. Follow it and nothing that works today will break.

### The integration contract (applies to every feature)

| # | Rule | Why |
| --- | --- | --- |
| 1 | **Free tools never require login.** The analyser, tracker, report links and `/me` keep working with no account. | They are the acquisition engine and a public promise. |
| 2 | **Old report links decode forever.** `/r#…` v1 links (`REPORT_VERSION = 1`) keep working. A new format means a new version branch in `decodeReport()`, plus fixtures in `report-links.json`. | Parents have links saved in WhatsApp chats. |
| 3 | **Old backups import forever.** The workspace schema is `version: 1`. Add a `migrateWorkspace()` that upgrades v1 to v2 on load and import; never delete the v1 parser. | Teachers' only copy of their history may be a backup file. |
| 4 | **Existing Firestore rules stay deny-all.** New collections get their own narrow rules and rules tests. | The current security model is proven; extend it, never loosen it. |
| 5 | **Every feature ships behind a flag** (e.g. `ACCOUNTS_ENABLED`), off by default, on in Preview first, and on in Production last. | Instant rollback without a redeploy of old code. |
| 6 | **Flip `plans.ts` availability last**, only after the feature works in production. The pricing page and copy follow automatically. | Truth in claims. |
| 7 | **Authenticated app pages are noindex** and live under `/app/*`. Only public pages go in `routes.ts` and the sitemap. | SEO hygiene and privacy. |
| 8 | **CSP changes are scoped** to the routes that need them (Firebase Auth on `/app` and `/login`, Razorpay on `/app/billing`). | Public pages keep the strict policy. |
| 9 | **Same server pipeline for every write:** Zod schema in `src/lib/validation`, origin check and rate limit from `http.ts`, store behind the `getBackend()` pattern, and a memory implementation for dev and tests. | One validation path, testable without Firebase. |

### A. Accounts (institute owner and teacher), sprint S1

* **Seam:** the reserved `NEXT_PUBLIC_FIREBASE_*` variables, and `firebaseAdmin.ts` for server-side token verification.
* **Add:**
  + `src/lib/client/auth.ts` for the Firebase Auth client, loaded only on `/login` and `/app`. Use email-link and Google sign-in.
  + `src/lib/server/session.ts`, which verifies the ID token with the Admin SDK and issues an HTTP-only session cookie (`createSessionCookie`, 7 days).
  + `middleware.ts` to protect `/app/*`.
  + Pages: `src/app/login`, `src/app/app/layout.tsx` and an onboarding page ("Create your institute").
* **Data:**
  + `users/{uid}`: name, email, createdAt.
  + `institutes/{iid}`: name, city, type, plan (default `free`), createdAt.
  + `institutes/{iid}/members/{uid}`: role `owner|teacher`, invitedBy, joinedAt.
* **Rules:** if all access goes through server routes, keep deny-all. If you later use the client SDK, allow only members to read their own institute, never write billing or plan, and add a rules test for every allow and deny.
* **Tests:** session verification (valid, expired, revoked tokens), middleware redirect, the onboarding flow end to end, and a rules test if rules change.
* **Flag:** `ACCOUNTS_ENABLED`. While it is false, `/login` and `/app` return 404.

### B. Cloud history and multi-device, sprint S2

* **Seam:** `src/lib/client/workspace.ts` (Zod `workspaceSchema`, `mergeWorkspaces()`, `parseBackup()`), whose types already describe classes and tests.
* **Data:** `institutes/{iid}/classes/{classId}` (name, subject, board, teacherUid) and `…/classes/{classId}/tests/{testId}` (date, topics, max, rows). Store rows by roll number only. Firestore's 1 MB document limit easily fits 500 students × 40 topics, but enforce the existing 500 × 40 caps.
* **API:** `GET/PUT /api/app/workspace` (session required, Zod-validated with the same schema, last-write-wins per test, and an `updatedAt` check to refuse stale overwrites).
* **Client:** a "Sync to cloud" toggle in the tracker, local-first. Writes go to localStorage immediately and sync in the background. The first sign-in offers to import the existing local workspace and any backup file with one click, using `mergeWorkspaces()`.
* **Keep:** export and import JSON unchanged; signed-out tracker behaviour identical to today.
* **Tests:** merge conflicts, import of all 5 fixture backups, offline then online sync, and a quota test at 500 × 40.

### C. Multi-teacher workspace and owner dashboard, sprint S3

* **Seam:** the `members` roles from A, and the pure analysis functions in `src/lib/tools/tracker.ts`, reused on the server.
* **Add:** invite a teacher by email (a signed token, reusing the HMAC helpers in `email.ts`), and an `/app/dashboard` showing batches, the latest test per class, repeating gaps, needs-attention counts and "classes not tested in 14 days".
* **Permissions:** teachers edit their own classes; owners read everything and manage members.
* **Tests:** a role matrix test (owner and teacher × read and write × own and other class).

### D. Branded and stored reports, sprint S4

* **Seam:** `studentReport.ts` (`buildReports`, `reportSchema`) and `/r`.
* **Add:** an institute profile (verified name, logo via Firebase Storage with size and type limits, and colours), plus a stored report at `/s/{token}` where the token is random with 128 bits, has an expiry, is revocable and is noindex. `reports/{token}` holds the institute id, the payload and `expiresAt`.
* **Keep:** free fragment links `/r#…` exactly as they are. Stored links are a paid upgrade that can be revoked and branded.
* **Tests:** token entropy and expiry, revocation, no PII in logs, and noindex headers.

### E. Payments (Razorpay first), sprint S5

* **Seam:** the `PaymentProvider` interface in `src/config/payments.ts`; `RAZORPAY_ENABLED`; `canUse()` and `getPlan()` in `entitlements.ts`.
* **Add:**
  + `src/lib/server/payments/razorpay.ts`, implementing `createOrder` and `verifyWebhook` (HMAC-SHA256 over the raw body).
  + `POST /api/billing/order`, which computes the server-side price from `plans.ts` and requires an idempotency key.
  + `POST /api/billing/webhook`: Node runtime, raw body, de-duplicated via `billingEvents/{eventId}`.
  + Billing state in `institutes/{iid}/billing` (server-only): status `trialing → active → past_due → cancelled`, plan, period end.
* **Entitlements:** the plan comes only from server billing state. Move the AI allowance from per-IP to per-institute (`aiDailyAllowance(plan)`).
* **Also:** GST invoices, a refund flow matching `/refund-policy`, and a daily reconciliation job. Load the Razorpay script only on `/app/billing`.
* **Prerequisite:** the owner decides prices (§15), then sets `priceInr` in `plans.ts`.
* **Tests:** invalid signature rejected, duplicate webhook ignored, out-of-order events, the downgrade path, and never trusting a client redirect.

### F. Parent delivery (email first, then WhatsApp), sprint S6

* **Seam:** `email.ts` (Resend, double opt-in, RFC 8058 unsubscribe), plus stored reports from D.
* **Add:** parent contacts per student (stored only with recorded consent, deletable); sending a report by email; and later the WhatsApp Business Cloud API with approved templates (Meta business verification is a long lead-time owner task). An audit log goes in `deliveries/{id}` (who, when, channel, status).
* **Privacy:** parents' numbers are personal data under DPDP. Record the purpose, retention and deletion path, and update `/privacy` before launch.

### G. Pilot CRM-lite, sprint S7

* **Seam:** `pilotApplications` (status field `new → contacted → qualified → piloting → closed`) and `scripts/waitlist-admin.mjs`.
* **Add:** an owner-only `/app/admin/pilots` (owner uid allow-list via env) with status changes, notes and next-contact date. Import the outreach tracker CSV once.

### H. Hindi interface, sprint S7

* **Approach:** dictionaries in `src/i18n/{en,hi}.ts`, used first for the tools' UI strings, then the pages. Add a `/hi` route segment for public pages, with `hreflang` alternates in metadata and the sitemap. Devanagari font: Noto Sans Devanagari via `next/font/local`.
* **Tests:** no missing keys (a test compares the key sets), and screenshot checks for conjunct rendering.

### I. Question-level and mistake-type analysis (P2)

* **Add** a new pure module, `src/lib/tools/questionAnalysis.ts`. The input is per-question marks plus a question→topic map row. Leave `classAnalysis.ts` untouched; its 212 tests remain the regression net.

### J. Student practice (pilot, then app)

* **Start** as a concierge pilot. Then build PWA screens under `/app/student`, fed by the gaps in a student's report (`focusTopics()`). A native Flutter app comes only after retention is proven.

## 23. Sprint plan and definition of done

These are one-week sprints for a solo founder. Each sprint ends deployable, with its flag off in Production until the exit check passes on a Preview URL.

| Sprint | Goal | Main work | Exit check |
| --- | --- | --- | --- |
| S0 | Launch-ready | All owner tasks in §21; send the outreach packs; first pilot meetings | `smoke:prod` 13/13; health shows firestore |
| S1 | Accounts | Firebase Auth, session cookie, `/app` shell, institutes and members, onboarding | Sign up → create institute → sign out → sign in |
| S2 | Cloud history | Workspace API, background sync, one-click import of local data and backups | Same tracker on two devices; offline edits sync |
| S3 | Team and dashboard | Teacher invites, role matrix, owner dashboard | Owner sees every class; a teacher sees only their own |
| S4 | Branded reports | Institute profile and logo, stored and revocable report links | A revoked link stops working; free `/r#` links unchanged |
| S5 | Payments | Razorpay test mode, webhook, billing state, server-side entitlements, invoices | A test-mode subscription unlocks the Institute plan; a duplicate webhook is ignored |
| S6 | Parent delivery | Parent consent and contacts, email delivery, audit log; start Meta verification | A parent receives the report email and unsubscribe works |
| S7 | Ops and Hindi | Pilot CRM-lite, Hindi tool UI, hreflang | Pilots manageable in-app; `/hi` tools usable |

### Definition of done (every task)

1. A branch per task: `feat/<name>` or `fix/<name>`.
2. Unit tests for logic; Playwright and axe for any UI; rules tests for any rules change.
3. `npm run check` passes, and the build prints "OK — no developer routes".
4. The Preview deploy has been clicked through, with the flag on for Preview only.
5. `CHANGELOG.md` and the version are bumped, and this handover is regenerated if the scope changed.
6. Merge to `main`, then `npm run smoke:prod -- https://herambstudy.vercel.app`.
7. Turn the flag on in Production, watch it for 24 h, then flip the availability in `plans.ts`.

### Risk register

| Risk | Mitigation |
| --- | --- |
| Breaking existing users' data (links, backups) | Integration contract rules 2 and 3, with fixtures as permanent regression tests |
| Auth widening Firestore access | Server routes and deny-all rules by default; any client rule needs a rules test first |
| Payment fraud or false unlocks | Webhook-only state changes, HMAC on the raw body, idempotency, reconciliation |
| DPDP exposure (parents' numbers, minors' data) | Consent records, purpose and retention in `/privacy`, deletion via the contact page, a lawyer's review before S6 |
| AI cost overrun | Per-institute allowance plus the global daily cap, rule-based fallback, small default model |
| Solo-founder bandwidth | One sprint at a time; pilots guide priority (§15). Don't start S5 before at least 5 pilot conversations |

## 24. Prompt to resume with Claude

Open Claude Code in the `heramb-study` folder and paste:

```
You are continuing development of Heramb.study (v0.6.1). Before doing anything:
1. Read docs/HANDOVER.md fully, then CHANGELOG.md, docs/KNOWN-LIMITATIONS.md,
   docs/ARCHITECTURE.md and src/config/plans.ts.
2. Run: npm ci && npm run check. Report the result. If anything fails, fix it first.
3. Respect the non-negotiable rules in HANDOVER §12 (secrets, dev-tool locks,
   Firestore deny-all, student privacy, truth in claims, payments disabled).

Stack: Next.js 15.5.27 App Router, React 19.1.9, TypeScript strict, Tailwind 3.4.19,
Zod, firebase-admin 14.5 (server-only Firestore), Vitest + Playwright/axe, Node 22.
Owner: Kartikeya Mishra (Windows/PowerShell, VS Code). Live: https://herambstudy.vercel.app/

Task for this session: [describe the task — e.g. "Sprint S1: Accounts, following HANDOVER §22-A"].
Follow the integration contract in HANDOVER §22 and the definition of done in §23.

Working rules:
- Small, reviewable steps. Every bug fix and feature gets tests.
- Update plans.ts availability only when a feature truly works in production.
- Never weaken the three developer-tool locks; the build must print
  "OK — no developer routes".
- Before finishing: npm run check (and npm run test:e2e for UI changes),
  update CHANGELOG.md and the version, and give me exact PowerShell commands
  to push a Preview branch and promote it to production.
- Give me complete files for anything you change, and list every changed path.
```

## 25. Change history

| Version | Highlights |
| --- | --- |
| 0.7.1 (19 Oct 2026) | Deploy fix: stale-file guard before every build (a leftover `api/dev/reset/route.dev.ts` from an older copy broke the Vercel build); clean-replace update procedure in DEPLOYMENT.md |
| 0.7.0 (19 Oct 2026) | Founding Institute Programme: institute codes and founding seats, anonymous usage ledger, institute dashboard with 7 goals, owner dashboard (`/admin`) with WhatsApp nudges and CSV, weekly digest (Vercel Cron), public live counter, import from Excel / platform exports / Google Sheet / photo-PDF, student useful-tap and revision reminder |
| 0.6.1 (18 Oct 2026) | Hydration fix for browser-extension attributes; pitch video prompt v2 (EN + HI); this handover (revision 2 adds the status board, integration blueprint and sprint plan); outreach packs for 10 institutes |
| 0.6.0 (15 Oct) | Developer console and three production locks; `smoke:prod`; test kit (39 data files, 5 backups, 11 links); parser edge-case fixes (Hindi long links, MAX-row variants, odd number formats, >100%, unnamed rows, natural sort) |
| 0.5.0 (14 Oct) | Student report links, `/r` and `/me`; plans and entitlements; `/pricing`; AI and rule-based teaching summary and parent note with cost ceilings; term reports; BUSINESS-MODEL.md |
| 0.4.0 (14 Oct) | Class progress tracker (trends, repeating gaps, change since last test, export/import) |
| 0.3.0 | Schools and colleges pages, pilot application flow, email (Resend) with double opt-in and owner alerts |
| 0.1–0.2 | Launch site, invite waitlist, contact form, free resources and tools, SEO, PWA, security headers, CI-grade tests |

Full details are in `CHANGELOG.md`. This document is generated from the repository state on 18 October 2026. Regenerate it whenever the version changes.