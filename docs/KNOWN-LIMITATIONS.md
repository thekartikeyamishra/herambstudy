# Known limitations and unresolved issues

| # | Severity | Item | Notes / next step |
|---|---|---|---|
| 1 | Medium | Legal pages are drafts with [placeholders] | Need operator details and legal review before public launch |
| 2 | Medium | Firestore rules tests not executed in the build environment | Emulator download was blocked there. Run `npm run test:rules` locally (Java 11+) |
| 3 | Medium | No real keyword volume, Trends data or user interviews yet | `RESEARCH.md` lists candidates as unverified and the steps to measure them |
| 4 | Low | CSP permits `'unsafe-inline'` scripts | Trade-off for static rendering; see `SECURITY.md` |
| 5 | Low | Email needs a Resend account and verified domain; contact-form replies are manual | Built-in acknowledgement, double opt-in, unsubscribe and pilot alerts activate once configured. No newsletter-sending tool is included — export confirmed subscribers and use a provider with unsubscribe handling |
| 6 | Low | No admin web UI | Waitlist is managed with the owner CLI (`npm run waitlist`); deliberate — avoids building auth for one user |
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
