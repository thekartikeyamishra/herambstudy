# Known limitations and unresolved issues

| # | Severity | Item | Notes / next step |
|---|---|---|---|
| 1 | Medium | Legal pages are drafts with [placeholders] | Need operator details and legal review before public launch |
| 2 | Medium | Firestore rules tests not executed in the build environment | Emulator download was blocked there. Run `npm run test:rules` locally (Java 11+) |
| 3 | Medium | No real keyword volume, Trends data or user interviews yet | `RESEARCH.md` lists candidates as unverified and the steps to measure them |
| 4 | Low | CSP permits `'unsafe-inline'` scripts | Trade-off for static rendering; see `SECURITY.md` |
| 5 | Low | Email needs a Resend account and verified domain; contact-form replies are manual | Built-in acknowledgement, double opt-in, unsubscribe and pilot alerts activate once configured. No newsletter-sending tool is included — export confirmed subscribers and use a provider with unsubscribe handling |
| 6 | Low | Owner dashboard (`/admin`) covers founding institutes only | Single owner password (no multi-user admin). Invites and pilots are still managed with `npm run waitlist` |
| 7 | Low | Anti-spam is honeypot + timing + rate limits | Add Cloudflare Turnstile if automated abuse appears |
| 8 | Low | Only English content; Hindi/German shown as planned | Add full translations before hreflang |
| 9 | Low | Light theme only | Dark mode not in v1 scope |
| 10 | Low | Lighthouse numbers are lab data from a sandbox | Re-measure on the live CDN; field CWV needs real traffic |
| 11 | Low | Next.js 15.5 and Tailwind 3.4 rather than Next 16 / Tailwind 4 | Production deps audit clean; 14 dev-tooling advisories remain (see TEST-RESULTS.md). Upgrade deliberately later |
| 12 | Info | Analytics consent banner covers analytics only | A Google-certified CMP is required before serving ads in EEA/UK |
| 13 | Info | Video voiceover not included | Silent + captioned versions are complete; add an owner-licensed `video/public/voiceover.mp3` |
| 14 | Info | Store badges use original generic glyphs | Switch to official Google Play / App Store badge artwork only when real listings exist, following each brand's guidelines |
| 15 | Low | Class analyser works on topic-level totals only | It can't see individual questions or mistake types; the full platform is where that analysis belongs |
| 16 | Info | Pilot applications have no CRM | Use `npm run waitlist -- pilots` exports and the owner alert emails; add a CRM once volume justifies it |
| 17 | Low | School and college fit is a hypothesis | The product was designed for coaching first; pilot applications by `institutionType` will show whether schools/colleges convert |
| 18 | Low | Colleges: no CO-PO attainment calculation | Stated plainly on `/for-colleges`; build only if pilot demand is clear |
| 19 | Info | Audience pages score 86–89 (mobile lab) | Long FAQ; see PERFORMANCE.md for the planned fix if field data needs it |
| 20 | Medium | Tracker data lives in one browser only | Lost if browser data is cleared; no cross-device sync. Mitigated by prominent Export/Import. Cloud sync is a planned paid feature |
| 21 | Low | Tracker matches students by roll number/name text | A renamed or re-numbered student appears as two students; tell teachers to keep roll numbers consistent |
| 22 | Medium | No accounts or billing yet | Plans and gates exist in config; paid features stay "planned" until accounts, cloud storage and payments are built (see BUSINESS-MODEL.md roadmap) |
| 23 | Low | AI quotas are per IP until accounts exist | Shared networks (a school's Wi-Fi) share one allowance; the global cap bounds total cost |
| 24 | Low | Anthropic API details not re-verified against live docs in this session | Endpoint/version header follow the long-standing Messages API; the model is configurable via `AI_MODEL`. Verify at docs.claude.com before enabling |
| 25 | Medium | Student report links can be forwarded | Anyone with a link sees that report. Mitigation: guidance to send in personal chats and use roll numbers; future paid delivery adds sign-in |
| 26 | Low | "Shared by" name is not verified | Labelled as sender-typed on the report page; verified institute branding comes with paid accounts |
| 27 | Low | Very long topic lists make long links | Capped at 40 topics; typical links are under 1,000 characters, the largest (40 long Hindi topic names) about 13,000 — within the 20,000 limit and what WhatsApp and browsers handle |
| 28 | Low | Developer console reads test files from the repository folder | On a Vercel preview the files may be absent; the console says so and the downloadable test kit has them |
| 29 | Info | Hindi text appears as “[Hindi text]” in the PDF testing guide | The PDF font has no Devanagari; the CSV checklist and the test files keep the real text |
| 30 | Medium | Founding-programme counts can be inflated by anyone holding an institute's code | Counts are evidence of activity, not an audit; rate-limited and capped per batch. Treat spikes with caution; a future signed-in teacher account removes this |
| 31 | Low | Student counts only for links created after the teacher connected | The code travels inside the report link (`c`); older links count nowhere |
| 32 | Low | Photo/PDF import needs an AI provider and can misread handwriting | Off (501) until `AI_PROVIDER` is set; imported marks are always shown for checking before analysis; PDFs need Anthropic |
| 33 | Low | Google Sheet import needs "Anyone with the link — Viewer" | No Google sign-in by design; private sheets can be downloaded as .xlsx and uploaded instead |
| 34 | Low | Old binary `.xls` files aren't read | Users are asked to save as .xlsx or CSV |
| 35 | Info | Weekly digest depends on Vercel Cron | On another host, call `GET /api/cron/digest` weekly with `Authorization: Bearer $CRON_SECRET` |
