# Changelog

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
