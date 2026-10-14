# Launch checklist

Items marked **(you)** need your accounts, identity or decisions — they can't be done in code.

## Identity & legal
- [ ] **(you)** Trademark search for "Heramb" / "Heramb.study" (IP India classes 9, 41, 42; WIPO) and domain ownership confirmed.
- [ ] **(you)** Decide the operator: sole proprietor name or registered company. Set `NEXT_PUBLIC_OPERATOR_NAME`.
- [ ] **(you)** Business email (e.g. hello@heramb.study) → `NEXT_PUBLIC_CONTACT_EMAIL`.
- [ ] **(you)** Fill the [bracketed] placeholders in `/privacy` (grievance officer, Firestore region, hosting provider, retention periods) and `/terms` (jurisdiction, venue).
- [ ] **(you)** Lawyer review of privacy policy, terms and refund page (DPDP Act 2023 + Rules; GDPR before accepting EU users). Then remove the "Draft" banner in `src/components/layout/LegalPage.tsx`.

## Infrastructure
- [ ] Firebase project + Firestore (asia-south1) created; rules and indexes deployed (`firebase deploy --only firestore`).
- [ ] TTL policy on `rateLimits.expiresAt` shows "Serving".
- [ ] Least-privilege service account; key stored only in the host's secret store.
- [ ] Production env vars set (see `DEPLOYMENT.md`); `NEXT_PUBLIC_SITE_URL` = final https domain.
- [ ] Point-in-time recovery enabled.
- [ ] `/api/health` returns `"storage":"firestore"` in production.

## Verification
- [ ] `npm run check` passes locally.
- [ ] `npm run test:e2e` passes.
- [ ] `npm run test:rules` passes (needs Java).
- [ ] Submit a real invite and contact message on production; confirm in Firestore; delete via `npm run waitlist -- delete`.
- [ ] Check `robots.txt` allows crawling on production and `sitemap.xml` lists the real domain.
- [ ] Lighthouse on the live URL (mobile + desktop).
- [ ] Test install on Android Chrome and "Add to Home Screen" on iOS Safari.

## Email (recommended before outreach)
- [ ] **(you)** Resend account, domain verified (SPF/DKIM), env vars set (see `SETUP-WINDOWS.md` §3b).
- [ ] Test: invite with updates ticked → acknowledgement arrives → confirm works → unsubscribe works.
- [ ] Test: pilot application → owner alert arrives.

## Search & analytics
- [ ] **(you)** Search Console domain property verified via DNS; sitemap submitted.
- [ ] **(you)** (Optional) GA4 property, 2-month retention, `NEXT_PUBLIC_GA_MEASUREMENT_ID` set.

## Content & growth
- [ ] Review every resource page once more for accuracy; update `reviewed` dates in `src/content/resources.ts` if edited.
- [ ] Render the launch video (`cd video; npm run render:all`) and add captions file where you post it.
- [ ] Share `/for-schools` and `/for-colleges` with school principals and college HODs alongside a live class-analyser demo; send them to `/pilot?type=school` or `?type=college`.
- [ ] Start the interview and concierge-pilot experiments in `RESEARCH.md`. Use the class test analyser with each institute's real (anonymised) test as the opening demo, then point them to `/pilot`.

## Explicitly NOT at launch
- [ ] AdSense stays disabled (see `ADSENSE-READINESS.md`).
- [ ] Payments stay disabled (see `DEPLOYMENT.md`).
- [ ] Store badges stay "Coming soon" until real listings exist.
