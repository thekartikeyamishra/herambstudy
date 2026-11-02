# Resilience, security and third-party independence

This covers every external dependency, what happens when it fails, and the controls against abuse. **Honest framing: nothing on the internet is "attack-proof".** The goal is that no single failure or attacker can take the core product down, leak student data, or cost money uncontrollably.

## 1. The core design that makes failures survivable
- **The core tools run in the user's browser:** analyser, paper map, imports from Excel/CSV, test builder (with seating and the question check), online tests, doubt log, report links, QR slips, tracker and Hindi. If every server-side service is down, these pages still work, because they're static files served from a CDN and computed on the device.
- **Student data is not stored on our servers:**
  - Report links and online tests live in the link fragment, which browsers never send to servers.
  - Responses travel from student to teacher as a code.
  - Our database holds only institute contacts, counts and teacher-shared class *averages*.

  A breach can't leak marks that were never stored.
- **Every server feature degrades with a clear message, never a crash or a fake success.**

## 2. Failure map

| Dependency | Used for | If it fails or changes direction | Fallback already in the code | How hard to replace |
|---|---|---|---|---|
| **Vercel** (hosting/CDN) | Serving the site, cron | Site down | `apphosting.yaml` for Firebase App Hosting; it's a standard Next.js app that runs on any Node 22 host (`npm run build && npm start`) | Low: change DNS |
| **Firestore** | Institutes, counts, invites, rate-limit counters | Server forms return an honest "not saved" 503; usage counts are dropped silently (202); dashboards show "unavailable"; **all browser tools keep working** | `Backend` interface with `memory` and `unavailable` modes; every store sits behind one interface | Medium: write one adapter (e.g. Postgres/Supabase) for the same interface |
| **Resend** (email) | Welcome, digest, owner alerts | Emails skipped; sign-up still succeeds | Email is optional (`emailConfig().sending`); `/admin` shows the readiness item | Low: one `deliver()` function |
| **AI provider** (Anthropic / OpenAI-compatible) | AI summary, photo import | Rule-based summary is used automatically; the photo import tab says it's off | Provider abstraction plus daily global and per-IP caps | Low: change `AI_PROVIDER` |
| **Google Sheets** | Sheet import | Clear error; Excel/CSV/paste still work | 10 s timeout, 1 MB cap, host allowlist | n/a |
| **Google Analytics / AdSense** | Optional analytics | Nothing breaks; consent-gated, off by default | Features check IDs before loading | n/a |
| **WhatsApp** | `wa.me` share links | Copy-paste always works | Every share button has Copy as well | n/a |
| **ChatGPT / Grok / Claude** | Extra channel (MCP) | Channel lost; website unaffected | Stateless read-only endpoint; nothing depends on it | n/a |
| **npm packages** | 6 production dependencies (next, react, react-dom, zod, firebase-admin, qrcode-generator) | Lockfile pins exact versions; no runtime CDN scripts | `package-lock.json`; CSP blocks third-party scripts | n/a |

## 3. Abuse, fraud and attack controls (in the code today)

| Threat | Control |
|---|---|
| Spam sign-ups / bots | Honeypot field, minimum fill time, per-network limits (`RATE_LIMIT_*`), origin check on every form |
| Request floods (throttling) | Per-IP in-memory burst limits on every API, plus Firestore-backed limits for writes. Large bodies are rejected (16 KB forms, 512 KB tools) |
| Inflated usage / fake traction | Counts clamped server-side (1 per action, max 3 per batch), role checks, events without a real institute code dropped, per-code limits, device ids hashed |
| Faked student data in reports | Report text is validated: no URLs, no hidden characters, size limits, schema checks |
| Cross-site request forgery | Origin/host check on all state-changing routes; `SameSite=Strict` owner cookie |
| XSS / injection | React escaping, strict CSP (`script-src 'self'`), Zod validation of every input, formula-safe CSV exports |
| Owner dashboard attacks | Off unless `OWNER_DASHBOARD_PASSWORD` (12+ chars) is set; HMAC session cookie; login rate limit (5 per 15 min); 404 when off |
| Developer tools reaching production | Three locks (build-time extension filter, runtime gate, post-build check) |
| Database exposed to browsers | Firestore rules deny everything; all access goes through server code |
| AI cost attacks / prompt abuse | AI only receives aggregates; per-IP and global daily caps; fallback to rule-based; no tool can be made to write data |
| Leaked old files breaking deploys | Stale-file guard before every build (auto-cleans on Vercel) |
| Wrong answer key published to a batch | The question check flags any question where most students agree on another option, before marks reach parents |
| Online test cheating | Answer key never in the link; shuffled sets A–D; response codes checked for edits and wrong paper. **Limit:** students taking a test at home can still look things up, which is true of any unproctored online test |
| SSRF via Sheet import | Host allowlist (docs.google.com, *.googleusercontent.com), manual redirects, timeout |

## 4. Known gaps (not yet built)
1. **Single database vendor.** The interface exists, but only a Firestore adapter is written. A Postgres adapter is about a day of work when needed.
2. **Instance-level rate limits.** Burst limits live in each server instance's memory, so a distributed attack spread across instances gets more through. Durable limits cover the important writes. Vercel's firewall or Cloudflare can be added in front without code changes.
3. **No external uptime monitor yet.** Add a free UptimeRobot check on `/api/health` and `/`.
4. **Backups:** *closed in v0.13.* Run `npm run backup` weekly. It writes every collection to JSON-lines files you own, and `npm run backup -- --restore <folder> --yes` writes them back into any Firebase project. These files are also the starting point for moving to another database. Optionally, also turn on Firestore point-in-time recovery in Google Cloud (one setting).

## 5. What to check monthly (10 minutes)
- `npm run backup` (weekly is better) and keep the folder somewhere private, off the laptop too.
- `/admin` → Launch readiness is all green.
- `/api/health` shows `storage: firestore` and the current version.
- `npm audit --omit=dev` is clean (it is as of v0.13: next 15.5.28, zod 4.6.7, and a scoped `rimraf → glob 14.0.3` override). If a new advisory sits deep inside firebase-admin, prefer a scoped override in `package.json` to waiting for Google, then re-run `npm run check`.
- Vercel → Firewall: no unusual spikes.
