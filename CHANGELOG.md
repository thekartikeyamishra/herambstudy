# Changelog

## 0.7.2 — 19 October 2026

Focus: deployments that cannot be broken by leftover files, whatever way the release is copied in.

### Fixed
- Repeated Vercel failure (`api/dev/reset/route.dev.ts … devResetMemory`). Two causes: (1) pasting a release over the folder keeps files a newer release removed; (2) Vercel “Redeploy” on an old deployment rebuilds that old commit (18c045d) again. Verified: the current GitHub `main` builds cleanly, and an old tree with all ten leftovers pasted over now builds too.

### Changed
- Stale-file guard now **removes leftover code files automatically on Vercel/CI** (a throw-away copy) and lists them; locally it stops and points to the new `npm run clean:stale`, which deletes them so the next commit cleans GitHub as well.
- `/api/health` reports `version` and the live Git `commit`, so you can confirm what is deployed.
- `HOW-TO-UPDATE.txt` at the project root: the paste-over update steps and the Redeploy pitfall.

## 0.7.1 — 19 October 2026

Focus: make deployments from a release zip reliable.

### Fixed
- **Vercel build failed with `Module '"@/lib/server/backend"' has no exported member 'devResetMemory'`** in `src/app/api/dev/reset/route.dev.ts`. That file is not part of any shipped release; it was left in the repository from an older version, because copying a zip over a repository never deletes removed files. `next build` still type-checks every `.ts` file, so the leftover broke the build. Fix: delete it (`git rm -r src/app/api/dev/reset`, plus `src/lib/dev/` if present) — see the new guard below.

### Added
- **Stale-file guard** (`prebuild` → `scripts/check-release-files.mjs`): compares the repository's code files with `scripts/release-manifest.json` and stops the build — locally and on Vercel — with the exact `git rm` commands when a leftover file would be compiled. `npm run release:manifest` re-lists files you add on purpose; `ALLOW_UNLISTED_FILES=true` overrides in an emergency.
- `docs/DEPLOYMENT.md` → “Updating the repository from a release zip”: a clean-replace procedure for PowerShell (`git rm -r .`, `robocopy`, `git add -A`) and the Vercel Node.js 22.x setting.

## 0.7.0 — 19 October 2026

Focus: real users and usage to show **without accounts**, a loop that keeps institutes regular, and marks that arrive without retyping.

### Added
- **Founding Institute Programme (`/founding`)** — a 30-second form issues a free institute code (`HRB-XXXX-XXXX`) and a numbered founding seat (first `FOUNDING_CAP`, default 50; founding discount on any future paid plan, never charged automatically). `?source=meeting` tags in-person sign-ups. Welcome email (if an email is given) and an owner alert.
- **Teacher connection** — an `InstituteBar` on the class analyser and tracker; WhatsApp invite links (`#connect=CODE`) connect a teacher's browser in one tap.
- **Anonymous usage ledger** (`POST /api/events`) — counts only (tests analysed, links created/shared, reports opened/saved, useful taps, reminders, imports), per India day, with hashed random device ids. Opt-out switch on the institute dashboard and on My progress. Report links carry the institute code (`c`) so student actions count for the right institute.
- **Institute dashboard (`/institute#CODE`)** — the seven programme goals (activation, teacher adoption, distribution, student engagement, repeat usage, 30-day retention, value), health, 8-week rhythm, weekly streak, next step, teacher invite and a value-feedback form.
- **Owner dashboard (`/admin`)** — password-gated (`OWNER_DASHBOARD_PASSWORD`, HMAC session cookie, 404 when unset): every institute's goals and health, filters (not activated, at risk, dormant, follow-up due), one-tap WhatsApp nudges, notes / next follow-up / status, formula-safe CSV export, delete.
- **Weekly digest** — Monday 08:30 IST via Vercel Cron (`vercel.json`, `CRON_SECRET`), only for institutes that opted in; signed stop link + RFC 8058 one-click unsubscribe.
- **Public live counter** — `/api/stats/public` and a homepage band with real totals, hidden until `PUBLIC_STATS_MIN` institutes (default 3).
- **Import marks — no retyping:** Excel `.xlsx` (read in the browser, sheet chooser), CSV, **result exports from test platforms/ERPs/Google Forms** (title rows, names, contacts, totals, ranks removed; question-wise marks combined into chapters via a "Chapter" row), **Google Sheet link** (remembered for one-tap refresh), **photo/PDF of a marksheet** via the configured AI provider (consent, 4 MB, per-network and global daily caps; always shown for checking first). Failed pastes of raw exports offer **Tidy and analyse**.
- **Student report actions** — "Was this useful?" and "Add to calendar" (a revision reminder `.ics` at 6 pm the day before the next test).
- `docs/FOUNDING-PROGRAM.md` — meeting-day flow, metric definitions, consistency loop, configuration.

### Hardened (audit, same release)
- Usage counts can't be pumped: single actions count once (max 3 per batch), link counts are capped by class size, roles can't send the other side's events, and events without a registered institute code are not stored (public totals reflect institutes only).
- The same test analysed again on a device counts once; each student's link counts once however often it's copied or downloaded; a teacher previewing links on a connected device isn't counted as a student.
- Health and 30-day retention follow teacher activity (students re-opening old reports no longer keep an institute "active").
- Deleting the most recent sign-up releases its founding seat (test sign-ups don't burn seat #01). Founding page copy follows `FOUNDING_CAP`; sign-ups after the cap are told plainly there's no seat.
- Join success screen: "Not your device? Disconnect it" for sign-ups made on someone else's phone.
- Pasted exports with a one-cell title row are split on the right delimiter.
- `docs/TEST-PLAN-v0.7.md` — 45-minute manual test plan by role (head, teacher, student, owner, abuse cases).

### Changed
- Firestore rules explicitly deny `institutes/**` and `meta/**` (rules tests extended).
- Privacy policy covers founding-programme data, usage counts, Google Sheet pass-through and photo import.
- Primary institute CTAs on home, `/for-institutes`, `/guide` and the footer point to `/founding`; `/pilot` remains for supported pilots. `/admin` is disallowed in robots; `/admin` and `/institute` are noindex.

## 0.6.1 — 18 October 2026

Focus: a hydration fix, plus the go-to-market material that sits alongside the code.

### Fixed
- **Hydration warning caused by browser extensions.** Extensions such as Scribe and Grammarly add attributes like `data-scribe-recorder-ready` to `<html>` and `<body>` before React loads. `src/app/layout.tsx` now sets `suppressHydrationWarning` on those two elements only. Real mismatches inside page content are still reported.

### Added
- `video/PITCH-VIDEO-PROMPT.md` v2 is a prompt for Claude to build, audit and fix the pitch videos. It covers three cuts (institutions, investor, social), each in English and Hindi, with full voice-over scripts and an audit checklist. The checklist includes programmatic decoding of the QR code, which must point to `https://herambstudy.vercel.app/`.
- `docs/HANDOVER.md` and `docs/HANDOVER.pdf` contain the complete project context needed to continue development.

## 0.6.0 — 15 October 2026

Focus: let the owner test everything — including hidden and not-yet-active features — without any of it reaching the live site, and close the edge cases found while doing so.

### Added
- **Developer console (`/dev`)** — environment status (never shows secrets), feature map with “when it appears” and “how to test”, seed tracker / student data, clear local data, in-memory submissions, **dev inbox** (every email the site would send, with working confirm/unsubscribe links), test files with download/copy, report-link cases, plan matrix, `/dev/crash` error page. Footer link in development only.
- **Three locks keep developer tools out of production:** `*.dev.tsx` routes are compiled only when developer tools are on; every dev route returns 404 unless `devToolsEnabled()`; `npm run build` runs `scripts/assert-no-devtools.mjs`, which fails the build if a dev route is present. Never enabled on `VERCEL_ENV=production` or heramb.study, even if `HERAMB_DEV_TOOLS=true` is set there.
- **`npm run smoke:prod -- <url>`** — checks a production build or the live site: developer routes 404, main pages/APIs/SEO files respond, no developer links in HTML.
- **Test kit:** 39 class-data files (happy, edge, error, security), 5 tracker backups, 11 student-link cases — each expected result verified by `tests/unit/fixtures.test.ts`. Plus `docs/TESTING.md`, a PDF testing guide and a CSV test-plan checklist (107 rows).
- Owner name **Kartikeya Mishra** set in `.env.example` and `apphosting.yaml` (`NEXT_PUBLIC_OPERATOR_NAME`).

### Fixed
- Student report links with many Hindi topic names exceeded a 12,000-character limit and failed to open → limit 20,000, and every link is decoded before it's offered.
- “Full marks”, “Out of:”, “Total marks”, “Marks out of” rows were read as a student → recognised as the maximum-marks row.
- A MAX row placed at the bottom silently switched to percentages → explicit warning.
- `0x10`, `1e3`, `Infinity` and numbers with spaces inside (`1 5`) were accepted as numbers → rejected with a clear message; `+5`, `7,5`, `15 / 20`, `70 %` still accepted.
- `120%` / `25/20` gave misleading MAX-row advice → “more than 100% — please check it”.
- Rows without roll numbers were silently named by position → warning.
- Same-date tests sorted “Unit 10” before “Unit 2” → natural order.
- Earlier in v0.6: Excel `%` and `15/20` cells, Average/Total rows, invisible characters and empty trailing columns; impossible dates in backups/links; web addresses and direction-override characters in report text; line breaks in single-line fields (header/CSV injection); unsafe characters in topic names sent to AI.


## 0.5.0 — 14 October 2026

Focus: a sustainable business model built into the product — value that compounds with use (ethical retention), clear free-vs-paid lines, and AI that is cheap, swappable and optional.

### Added
- **Personal student report links** — after analysing a class test, teachers create one link per student (institute name, test, date) and copy them all for WhatsApp or download as CSV. The report lives inside the link (URL fragment), so marks never reach Heramb's servers.
- **Student report page (`/r`)** — the student's topics with class averages, status, focus topics, next-step tools, "Save to my progress" and install prompt; tampered/incomplete links explain themselves.
- **My progress (`/me`)** — every report a student saved on their device, per-topic history across tests, "focus now", delete. This is the student habit loop: a new report after every test.
- `/r` and `/me` are `noindex`, never load analytics, never show ads.
- **Plans and entitlements** (`src/config/plans.ts`, `src/lib/entitlements.ts`) — one source of truth for plans (Free, Teacher Pro, Institute, Network), features with honest availability (available / pilot / planned), daily AI allowances, and customer guarantees. Tests enforce that higher plans never remove features and data export is on every plan.
- **`/pricing`** — plans rendered from config; unpublished prices show "Founding price on request"; planned/pilot badges; "Why institutions stay"; guarantees; FAQ. AI is shown as available only when a provider is configured on the deployment.
- **Teaching summary + parent note** in the class test analyser — one click gives a 3-point plan and a forwardable parent note.
  - **Aggregate-only:** only topic names, class averages and counts leave the browser — never names, roll numbers or marks.
  - **Always works:** rule-based summary (zero cost) when AI is off, over quota, slow, failing or returns unusable output; local fallback when offline.
  - **Swappable models:** `AI_PROVIDER=none|anthropic|openai_compatible`, `AI_MODEL`, `AI_BASE_URL` (https only); default small model `claude-haiku-5-5`.
  - **Cost ceilings:** per-visitor daily allowance (can only be lowered by env), global daily cap (default 300), 450 max output tokens, 12 s timeout, LRU cache keyed by prompt version + model + input; token usage logged per call.
- **Student term reports** in the tracker — one page per student across every saved test (first vs latest per topic, change, status, strengths, most improved, focus next); on-screen preview and print-all.
- **`docs/BUSINESS-MODEL.md`** — five ethical retention levers, free-vs-paid rule, pricing approach, revenue metrics, AI cost strategy with formula, vertical roadmap, and decisions still open.

### Changed
- Public guarantees now list only what the product honours today (data export; free stays free). Renewal reminders and post-cancellation access moved to `docs/BUSINESS-MODEL.md` as proposals awaiting a decision; the matching pricing FAQ answer was corrected.
- Plans include "Personal report link for every student" on every plan; letterhead/logo remains paid.
- Robots guard: a test ensures no `Disallow` prefix ever matches a public route (a `/r` rule would have blocked `/resources`).
- Privacy policy names the optional AI provider and exactly what is sent; it also covers student report links and student history.
- Footer adds "Plans & pricing"; guide and home roadmap mention summaries and term reports.


## 0.4.0 — 14 October 2026

Focus: make the free tools a habit. Teachers now build a history of each class over a term — the behaviour the paid platform will monetise (cloud sync, sharing with HODs, institute-wide views).

### Added
- **Class progress tracker (`/tracker`)** — create classes, add each test (paste or CSV), and see:
  - the change since the previous test (gaps closed / still below 50% / slipped), shown first;
  - topic trends across all tests (class average per topic per test, colour-coded, with last change);
  - **gaps that keep repeating** — students below 50% in the same topic in their last two or more attempts, grouped by topic as ready-made reteach groups (absences skipped, not counted as recovery).
  - Data is stored only in the browser (localStorage, versioned schema, 4 MB guard, quota/private-mode handling, multi-tab sync). Backup export/import as JSON with full validation; imports never overwrite existing classes. Limits: 50 classes, 60 tests per class.
- **“Save this test to a class”** in the class test analyser — saves exactly the analysed data to a new or existing class and links to the tracker.
- Tracker on the resources page, guide, footer, home roadmap and sitemap; analytics event `tracker_test_saved` (no data content).

### Changed
- Privacy policy explains that tracker data stays in the user's browser and how to back it up.


## 0.3.0 — 14 October 2026

Focus: prove the product's core promise (verified progress) with a free tool, and open the market beyond coaching to schools and colleges.

### Added
- **Follow-up check in the class test analyser** — compare a follow-up test with the first, by topic and roll number (case-insensitive). Shows class-average change (with a noise margin), **gaps closed**, gaps still open and students who slipped, per topic and in total; reports topics/students that couldn't be matched; CSV export; fictional follow-up sample. This is the VERIFY step, now usable for free.
- **`/for-schools` and `/for-colleges`** — audience pages built from the school/college pitch: features, the one-class pilot, honest "why now", and 18 sceptical questions answered (cost, teacher time, ERP overlap, proof, data/DPDP, AI, parents, management, NAAC/NBA scope for colleges).
- **`/guide`** — "How to use Heramb.study": what students, teachers, schools, colleges and coaching institutes can use today, step by step, and what is planned.
- **Pilot applications now record institution type** (coaching / school / college / tutoring centre), pre-selected from `/pilot?type=…`; new exam option "University / semester exams"; owner alert subject and CSV export include the type.

### Changed
- Main navigation: How it works · Coaching · Schools · Colleges · Students · Free tools ("Our approach" stays in the footer). The full nav shows from 1280 px; below that the compact menu is used so labels never wrap.
- Pilot page and copy now address coaching institutes, schools and colleges.

### Data model
`pilotApplications.institutionType` (required for new applications). Older records without it should be treated as `coaching`.


## 0.2.0 — 12 October 2026

Focus: turn the launch site into a lead engine for the target customer (JEE/NEET coaching institutes) and make product-update consent provable.

### Added
- **Class test analyser** (`/resources/class-test-analyser`) — paste from Excel/Google Sheets or upload a CSV of a whole batch's topic-wise marks. Produces a teaching plan (whole-class reteach vs small-group recap), a colour-coded gap map, students needing attention, a reteach-groups CSV and bulk printable one-page student reports. Runs entirely in the browser; supports MAX rows, absences, negative marking, tabs/commas/semicolons, and gives row/column-precise error messages.
- **Institute pilot application** (`/pilot`, `POST /api/pilot`, Firestore `pilotApplications`) — structured lead capture: role, institute, city, size, exams, test frequency, current software, start window and an optional price-comfort range (₹/student/month) to validate pricing.
- **Email layer (optional, off until configured)** via Resend:
  - acknowledgement email for new invite requests (never for duplicates);
  - **double opt-in** for product updates with HMAC-signed confirm links;
  - unsubscribe page plus **RFC 8058 one-click unsubscribe** (`List-Unsubscribe-Post`);
  - instant owner alert for each pilot application (reply-to = applicant).
  - Consent changes require an explicit click (POST), so link scanners can't confirm or unsubscribe anyone.
- `/email/confirm` and `/email/unsubscribe` pages (noindex).
- Owner CLI: `npm run waitlist -- pilots`; marketing exports now include only confirmed, non-withdrawn subscribers by default.
- Analytics event `pilot_application_submitted`.

### Changed
- "Discuss a pilot" CTAs now go to `/pilot`; footer and roadmap updated; class analyser is the featured resource.
- Resource tools are code-split per page (mobile Lighthouse on resource pages 88 → 91–93).
- Privacy policy covers pilot applications, Resend as a processor, and double opt-in.
- Firestore rules/indexes cover `pilotApplications`.

### Data model
`inviteRequests.consentRecords.marketingUpdates` gains `confirmedAt` and `withdrawnAt` (both `null` initially). Existing records without these fields are treated as unconfirmed.

## 0.1.0 — 12 October 2026
Initial launch site: 12 public pages, 5 resources with tools, invite + contact flows on Firestore, PWA, SEO, consent-gated analytics, disabled AdSense/payment boundaries, Remotion launch video, tests and docs.
