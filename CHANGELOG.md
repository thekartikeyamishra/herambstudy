# Changelog

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
