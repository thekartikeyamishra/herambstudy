# Heramb.study — launch website

**Progress, made visible.** *Understand every learner. Make every next step count.*
HERAMB = Holistic Education, Results, Assessment, Mentorship & Betterment.

Invite-only launch site for an education platform that turns assessments into topic-level learning gaps, targeted practice and verified progress. Built first for JEE/NEET coaching institutes in India.

## What's included

| Area | Status |
|---|---|
| 13 public pages (home, how it works, institutes, students, resources, invite, pilot, about, contact, our approach, privacy, terms, refund) + 404, error, offline | Built, statically prerendered |
| 6 free resources with working browser-only tools — including the flagship **class test analyser** (whole-batch gap map, reteach groups, bulk student reports) plus readiness diagnostic, learning-gap analyser, progress-report template, assessment comparer, mistake tally | Built and tested |
| Institute pilot application (`/pilot`) with optional willingness-to-pay signal | Built and tested |
| Optional email: invite acknowledgement, double opt-in, one-click unsubscribe, owner alerts for pilot leads (Resend) | Built and tested, off until configured |
| Invite request + contact forms → server validation → anti-spam → rate limits → Firestore | Built and tested |
| Honest failure: no storage configured / storage error → 503 "nothing was saved" | Built and tested |
| PWA: manifest, icons, service worker, offline page, honest install control | Built |
| Google Play / App Store "Coming soon" badges that become real links via env vars | Built and tested |
| SEO: per-page metadata, canonical, OG image, sitemap, robots, JSON-LD | Built and tested |
| GA4 (consent-gated) and AdSense (disabled by default) integration points | Built, off by default |
| Razorpay / PayPal adapter boundary | Interface only, disabled |
| Remotion launch video (16:9, 9:16, 1:1, captions, silent) | Source + rendered MP4s |
| Owner CLI to export / find / delete waitlist records | Built |

## Quick start (Windows, PowerShell)

```powershell
npm install
Copy-Item .env.example .env.local     # then set DEV_MEMORY_STORE=true for local testing
npm run dev                            # http://localhost:3000
```

Full setup including Firebase: [`docs/SETUP-WINDOWS.md`](docs/SETUP-WINDOWS.md).

## Stack
Next.js 15.5 (App Router, static rendering) · React 19.1 · TypeScript 5.9 strict · Tailwind CSS 3.4 · Zod · Firebase Admin 14 / Cloud Firestore · Vitest 5 · Playwright + axe · Remotion 4. Node 22.

## Scripts
`dev` · `build` · `start` · `typecheck` · `lint` · `test` · `test:e2e` · `test:rules` · `check` (all gates) · `icons` · `waitlist`

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## Documentation
| Doc | Contents |
|---|---|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Structure, data model, request pipeline, SEO, PWA, analytics, design tokens, exit path |
| [SETUP-WINDOWS](docs/SETUP-WINDOWS.md) | Install, Firebase, commands, waitlist admin, backups |
| [DEPLOYMENT](docs/DEPLOYMENT.md) | Vercel or Firebase App Hosting, domain, verification, future payments |
| [SEO-AND-SEARCH-CONSOLE](docs/SEO-AND-SEARCH-CONSOLE.md) | Search Console, GA4, content and backlink strategy |
| [ADSENSE-READINESS](docs/ADSENSE-READINESS.md) | Traffic maths for $2,500/month, eligibility, enabling rules |
| [SECURITY](docs/SECURITY.md) | Trust boundaries, controls, threat model, residual risks |
| [PERFORMANCE](docs/PERFORMANCE.md) | Lighthouse results and fixes |
| [RESEARCH](docs/RESEARCH.md) | Competitors, ICP, keyword candidates (unverified), experiments |
| [TEST-RESULTS](docs/TEST-RESULTS.md) | Actual results of every check run on this build |
| [LAUNCH-CHECKLIST](docs/LAUNCH-CHECKLIST.md) | What must happen before going public |
| [KNOWN-LIMITATIONS](docs/KNOWN-LIMITATIONS.md) | Open issues by severity |
| [video/README](video/README.md) | Launch video storyboard, render commands, attribution |

## Ground rules this codebase keeps
No fabricated testimonials, statistics, ratings, launch dates or outcome guarantees. All sample data is fictional and labelled. Ads, payments and store links stay off until real, verified configuration exists. Legal pages are drafts until a lawyer reviews them.
