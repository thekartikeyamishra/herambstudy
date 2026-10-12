# Architecture

## Overview

```
Browser ──HTTPS──▶ Next.js 15 (App Router, TypeScript strict)
                     ├─ 25 statically prerendered public pages (CDN-cacheable)
                     ├─ /api/invite, /api/contact, /api/pilot, /api/email/{confirm,unsubscribe}
                     │     validate (Zod) → anti-spam → rate limit → Firestore (Admin SDK)
                     └─ /sitemap.xml, /robots.txt, /manifest.webmanifest, /opengraph-image
Cloud Firestore: inviteRequests · contactMessages · pilotApplications · rateLimits (TTL)
Optional: Resend HTTPS API for transactional email (sent after the response via next/server `after`)
Security rules: deny ALL client access. Only the server (Admin SDK) reads/writes.
```

No Firebase client SDK, no Auth, no Redis, no queue, no microservices. They are not needed for a static site with two form endpoints. The Firebase web config variables are reserved for the future learning app.

## Directory structure

```
src/
  app/                    routes (one folder per page), API routes, metadata routes
  components/
    ads/AdSlot.tsx        isolated AdSense unit (renders nothing unless configured)
    analytics/            consent-gated GA4 loader + banner
    brand/                original logo
    forms/                InviteForm, ContactForm, accessible Field primitives
    layout/               header, footer, language menu, legal page shell
    marketing/            hero preview, workflow diagram, sample report, sections
    pwa/                  install control, store badges, SW registration
    resources/            the five interactive tools
    seo/JsonLd.tsx
    ui/                   Button, Badge, Callout, PageHeader…
  config/                 site, ads, csp, payments (adapter boundary), routes
  content/                resources metadata, article bodies, fictional sample data
  fonts/                  self-hosted Inter + Fraunces (OFL), via next/font/local
  lib/
    client/               analytics (allow-listed events), postJson
    server/               backend selection, Firestore/memory stores, handlers, http guards
    tools/                pure, unit-tested logic for every interactive tool
    validation/schemas.ts shared Zod schemas (client + server)
tests/
  unit/                   Vitest: validation, API integration, config, tools, SEO, components
  e2e/                    Playwright: 3 viewports, axe accessibility, journeys, headers
  rules/                  Firestore rules tests (emulator)
video/                    isolated Remotion project
scripts/                  icon generator, owner-only waitlist admin CLI
```

## Data model

### `inviteRequests/{requestId}`
`requestId = sha256("invite|" + normalizedEmail)[0..32]` — deterministic, so the same email always maps to the same document. `create()` fails atomically if it exists, giving race-free de-duplication.

| Field | Type | Notes |
|---|---|---|
| requestId | string | doc id |
| normalizedEmail | string | trimmed, lower-cased |
| name | string \| null | optional |
| role | enum | student, teacher, tutor, institute_owner, other |
| country | ISO-2 \| "OTHER" | |
| useCase | enum | |
| useCaseNote | string \| null | ≤ 500 chars |
| institute | {name, size} \| null | only for teacher / institute_owner |
| consentRecords.privacyNotice | {granted, version, recordedAt} | required |
| consentRecords.marketingUpdates | {granted, version, recordedAt, confirmedAt, withdrawnAt} | optional, never pre-checked; double opt-in — only `granted && confirmedAt && !withdrawnAt` may be emailed |
| status | pending \| invited \| declined \| withdrawn | server-set only |
| createdAt / updatedAt | timestamp | |
| sourceCampaign / sourceLandingPage | string \| null | validated `utm_campaign` and same-origin referrer path |
| duplicateAttempts | number | incremented on re-submission; original data never overwritten |

### `pilotApplications/{autoId}` — contactName, role, email, phone, instituteName, city, country, studentCount, exams[], testFrequency, currentTools, startWindow, priceComfort, notes, privacyNoticeVersion, status (new → contacted → qualified → piloting → closed), createdAt.
### `contactMessages/{autoId}` — name, email, topic, message, privacyNoticeVersion, status, createdAt.
### `rateLimits/{sha256(salt|scope|key)}` — count, windowStart, expiresAt (TTL policy deletes).

## Request pipeline (`src/lib/server/handlers.ts`)

1. Origin check (CSRF): `Origin` must match host; missing Origin rejected in production.
2. Per-instance IP limiter (memory) — cheap first line.
3. JSON-only, 16 KB body limit.
4. Zod validation → field errors (422). Unknown fields stripped; status/consent never taken from client.
5. Honeypot (400) and minimum fill time 2.5 s (429 `too_fast`).
6. Backend availability → honest 503 if none.
7. Shared Firestore limiter: 5/10 min per IP, 3/hour per email (configurable).
8. `createIfAbsent`; created and duplicate return the **same** 200 message (no email enumeration).

Storage selection: Firestore if Admin credentials exist → in-memory **only** when `NODE_ENV≠production` and `DEV_MEMORY_STORE=true` → otherwise `unavailable` (503). Production can never silently pretend to save.

## SEO architecture

- Per-page `buildMetadata()` → unique title, description, canonical, Open Graph, Twitter.
- `sitemap.ts` generated from `config/routes.ts` (single source of truth).
- `robots.ts` disallows everything unless the site URL is an https production origin (protects previews).
- JSON-LD: Organization + WebSite (global), BreadcrumbList, Article (resources). No FAQPage (Google limits FAQ rich results to authoritative government/health sites), no ratings/reviews.
- One H1 per page (asserted in E2E).
- `lang="en-IN"`; hreflang deliberately absent until a real Hindi/German equivalent exists.

## PWA

- `manifest.ts`: standalone, 192/512 + maskable icons, shortcuts.
- `public/sw.js`: network-first navigations with cached fallback → `/offline`; cache-first for hashed `/_next/static`; never caches `/api` or RSC payloads. Registered in production only.
- `InstallControl`: real `beforeinstallprompt` → "Install Web App"; iOS → "Add to Home Screen" instructions; otherwise an honest "not available" note.
- `StoreBadges`: aria-disabled "Coming soon" buttons until `NEXT_PUBLIC_GOOGLE_PLAY_URL` / `NEXT_PUBLIC_APP_STORE_URL` hold https URLs, then real links automatically.

## Analytics plan

GA4 loads **only** with a valid `NEXT_PUBLIC_GA_MEASUREMENT_ID` **and** explicit consent. Allow-listed events: `invite_form_started`, `invite_request_submitted`, `contact_message_submitted`, `resource_tool_started`, `resource_tool_completed`, `pwa_install_prompt_shown`, `pwa_install_completed`, `app_store_coming_soon_clicked`. Params are allow-listed (`role`, `country`, `tool`, `store`, `outcome`, `platform`, `page`) and anything email-like is dropped.

## Design system

Tokens in `src/app/globals.css` (`:root` RGB triplets) mapped to semantic Tailwind colours: `ink`, `paper`, `line`, `brand` (violet), `night` (dark sections), and status colours `good`/`warn`/`gap` used only for data meaning. Fluid display sizes (`text-display-xl/lg/md`), 44 px minimum touch targets, one global focus ring, `prefers-reduced-motion` honoured globally, print styles for reports. Breakpoints: 400 / 640 / 768 / 1024 / 1280. Light theme only (by design for v1).

## Exit path (vendor lock-in)

- Firestore data: `npm run waitlist -- export` (CSV/JSON) or `gcloud firestore export`.
- No Firebase Auth users exist yet.
- Next.js runs on Vercel, Firebase App Hosting, Cloud Run, or any Node 22 host.
- Storage is behind the `InviteStore`/`ContactStore` interfaces — swapping to Postgres is one new adapter.

## Email (optional)

`src/lib/server/email.ts`. Enabled when `RESEND_API_KEY` + `EMAIL_FROM` are set; signed links need `EMAIL_TOKEN_SECRET`.

| Event | Email | Notes |
|---|---|---|
| New invite request (not duplicates) | Acknowledgement to the requester | Includes confirm + unsubscribe links only if they ticked "product updates"; carries `List-Unsubscribe` + `List-Unsubscribe-Post` headers |
| Confirm link clicked → button pressed | — | `POST /api/email/confirm` sets `confirmedAt` |
| Unsubscribe | — | Page button or RFC 8058 one-click POST sets `withdrawnAt` |
| New pilot application | Alert to `OWNER_NOTIFICATION_EMAIL` | reply-to = applicant |

Tokens are `HMAC-SHA256(EMAIL_TOKEN_SECRET, purpose:requestId)` (base64url), compared in constant time, and bound to their purpose. Email runs after the response is sent; a provider failure never changes the user-facing result, and no success message promises an email.

## Class test analyser

`src/lib/tools/classAnalysis.ts` (pure, unit-tested) + `components/resources/ClassAnalyser.tsx`. Parses pasted/uploaded tables in the browser (≤ 500 students, 40 topics, 1 MB), never uploads data, and prints per-student reports through a body-level portal with print-only CSS.
