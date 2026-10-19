# Testing guide — how to test every feature

Owner: Kartikeya Mishra · Version 0.6.0 · 15 October 2026

This guide explains how to reach and test every feature, including the ones that are hidden until a setting or user action turns them on, and how developer-only access is kept off the live site.

---

## 1. Three ways to run the site

| Mode | Command | Developer console | Use it for |
|---|---|---|---|
| **Development** (everyday testing) | `npm run dev:memory` → http://localhost:3000 | ✅ `/dev` | All features, forms saved in memory, emails captured in the dev inbox |
| **Production build** (what users get) | `npm run build` then `npm start` | ❌ 404 | Install button, offline page, service worker, real performance, final checks |
| **Vercel preview** (test on your phone / share with a tester) | Set `HERAMB_DEV_TOOLS=true` for the **Preview** environment only | ✅ `/dev` | Testing on real devices before going live |

`dev:memory` = development with `DEV_MEMORY_STORE=true`, so invite, pilot and contact forms are saved in memory (lost on restart) instead of answering "nothing was saved".

Testing on your phone over Wi-Fi: `npx next dev -H 0.0.0.0` with `DEV_MEMORY_STORE=true` in `.env.local`, then open `http://<your-PC-IP>:3000` on the phone (same Wi-Fi). Find the IP with `ipconfig` in PowerShell.

---

## 2. The developer console — `/dev`

Open http://localhost:3000/dev (there's also a "Developer console" link in the footer, shown only in development).

| Section | What it gives you |
|---|---|
| **Environment** | Every integration (storage, email, signed links, AI, analytics, ads, store badges, owner name, site URL): On / Dev / Off and how to change it. Secrets are never shown. |
| **Feature map** | Every feature: who it's for, where it is, **when it appears to users**, how to test it, and an Open link. |
| **Seed & reset** | One click: tracker demo (2 classes, 4 tests) or student history (3 reports). "Clear all local Heramb data" wipes this browser's tracker, student history, consent choice and saved institute name. |
| **Submissions & dev inbox** | Invite requests, pilot applications and contact messages saved in memory, and every email the site would have sent, with clickable links (confirm, unsubscribe). "Clear" resets submissions, inbox and rate limits. |
| **Test files** | Every test file with what it tests and the expected result, with Download and Copy buttons. |
| **Report-link cases** | Valid and broken student report links (tampered, phishing, wrong version, too long). |
| **Plan matrix** | What each plan can use today (in the plan **and** built). |
| **Production safety** | How the console is kept off the live site, plus `/dev/crash` to see the error page. |

### How developer access stays out of production (3 independent locks)

1. **Not compiled.** Developer pages are `*.dev.tsx` / `*.dev.ts` files. `next.config.ts` only treats that extension as a page when developer tools are on at build time, so a production build has no `/dev` routes at all.
2. **Runtime gate.** Every developer route checks `devToolsEnabled()` and answers 404 if it's off. It's **never** on for the production deployment (`VERCEL_ENV=production`) or for `heramb.study` / `www.heramb.study`, even if `HERAMB_DEV_TOOLS` is set there by mistake.
3. **Build check.** `npm run build` automatically runs `scripts/assert-no-devtools.mjs`, which **fails the build** if a developer route appears in a production build.

The dev inbox and the development-only link-signing secret follow the same gate. A real email provider always takes priority over the dev inbox.

**Prove it yourself before every release:**
```powershell
npm run build
npm start
# in a second terminal:
npm run smoke:prod -- http://localhost:3000
```
Expected: `/dev`, `/dev/crash` and `/api/dev/state` → 404, main pages 200, no developer links in the HTML. Also run it against the live site: `npm run smoke:prod -- https://heramb.study`.

---

## 3. When does each feature appear? (flows)

### Teacher / school / college / coaching flow
1. `/resources/class-test-analyser` → paste or upload marks → **Analyse class**.
2. **Appears only after a successful analysis:** teaching plan, gap map, students needing attention, reteach-groups CSV, printable student reports, **teaching summary + parent note**, **student report links**, **save to a class**, **follow-up check**.
3. **Save this test to a class** → `/tracker?class=…`.
4. In the tracker: topic trends appear after **1** test; **"since the previous test"** and **"gaps that keep repeating"** need **2+** tests; **term reports** appear once a class has tests.
5. After reteaching: next test → follow-up check (in the analyser) or add it in the tracker.

### Student flow
1. The teacher sends a personal link `/r#…` (WhatsApp).
2. The student opens it → report → **Save to my progress**.
3. `/me` shows every saved report and each topic over time (empty until the first save).
4. `/r` without the part after `#` shows "This report link is incomplete" (by design).

### Institution sales flow
`/for-schools`, `/for-colleges` or `/for-institutes` → **Apply for a free pilot** → `/pilot?type=school|college|coaching` (type pre-selected) → stored → owner alert email (or dev inbox).

### Invite and email flow
`/invite` → stored once per email (a duplicate gives the same success message and a counter, never a second record) → acknowledgement email **only for new requests** → if "product updates" was ticked: confirm link → `/email/confirm` → press the button → confirmed. Unsubscribe: `/email/unsubscribe` or the one-click header in the email.

---

## 4. "Why can't I see…?" — troubleshooting

| You don't see… | Why | How to see it |
|---|---|---|
| `/dev` (404) | You're running a production build | `npm run dev:memory` |
| Forms say "nothing was saved" | No storage configured | `npm run dev:memory`, or set Firebase variables |
| Emails | Email is off | Development: check `/dev` → Dev inbox. Live: set `RESEND_API_KEY` + `EMAIL_FROM` |
| Confirm/unsubscribe pages say links aren't active | No `EMAIL_TOKEN_SECRET` (production) | Set a 32+ character secret. Development uses a dev-only secret automatically |
| "Install Web App" button | Only in a **production build**, in Chrome/Edge, when not already installed | `npm run build && npm start` → open in Chrome. iPhone shows "Add to Home Screen" steps |
| Offline page | Needs the service worker (production build) | Production build → visit pages → DevTools › Network › Offline → open an unvisited page |
| Analytics consent banner | No GA4 ID, or you already chose | Set `NEXT_PUBLIC_GA_MEASUREMENT_ID`; `/dev` → Clear all local data |
| Ads | Disabled until AdSense approval (correct) | Never test with fake IDs; placement rules are unit-tested |
| AI-written summary (you see "Made from your numbers") | No AI provider configured | Set `AI_PROVIDER=anthropic` + `AI_API_KEY` (costs money) — the rule-based summary is the free default |
| "Save this test to a class" disabled | Private/incognito browsing blocks storage | Use a normal window |
| Tracker "since previous test" / repeating gaps | The class has only 1 test | Add a second test (files 41 → 42 → 43) or `/dev` → Tracker demo |
| Store badges are "Coming soon" | Store URLs not set (correct until apps exist) | Set `NEXT_PUBLIC_GOOGLE_PLAY_URL` to any https URL and restart |
| Hindi / German in the language menu | Planned, not built | — |
| Cloud history, parent delivery, principal dashboard… | **Not built yet** — only described on `/pricing` as Planned | Nothing to switch on; they appear when built |
| A student's report link "incomplete" | The link was cut (WhatsApp line break) or it contains a web address | Send the whole link; remove web addresses from institute/test/topic names |

---

## 5. Test files (the test kit)

All files are in `tests/fixtures/` and downloadable from `/dev` → Test files. Every file's expected result is **checked automatically** by `tests/unit/fixtures.test.ts`, so these descriptions can't silently become wrong.

| Range | Type | Examples |
|---|---|---|
| 01–19 | Valid and edge-case class data | marks with MAX, percentages, Excel `%` cells, negative marking, absences, semicolons + decimal commas, quotes + BOM, Hindi names, Excel trailing columns, Average/Total rows, `15/20` cells, Windows line endings, an all-absent topic, 1×1, 500 students × 40 topics, "Full marks" label, misplaced MAX row, missing roll numbers, 40 long Hindi topics |
| 20–29, 34–35 | Errors (must be rejected with a clear message) | score above max, non-numeric, duplicate roll/topic, no header, student named MAX, too many topics/students, empty topic name, bad MAX row, hex/exponent/space-in-number, percentages above 100% |
| 30–31 | Follow-up check pair | renamed and new topics, students who left or joined |
| 41–43 | Tracker sequence | three tests of one class with repeating gaps |
| 50–52 | Security | spreadsheet formula injection, HTML in names, web addresses in names |
| 60–64 | Tracker backups | valid, corrupt, wrong version, bad test data, impossible date |
| `report-links.json` | Student links | valid, Hindi, tampered, phishing URL, wrong version, truncated, longest valid |

`TEST-PLAN-CHECKLIST.csv` (in the downloadable test kit) lists every manual test with steps, expected result and blank Result/Notes columns to fill in.

---

## 6. Automated tests

| Command | What it runs |
|---|---|
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | ESLint, zero warnings |
| `npm test` | Unit, integration, component and test-file checks (Vitest) |
| `npm run test:e2e` | Browser tests on desktop, tablet and mobile, accessibility scan, developer console (first time: `npx playwright install chromium`) |
| `npm run test:rules` | Firestore security rules (needs Java 11+) |
| `npm run build` | Production build + automatic developer-route check |
| `npm run smoke:prod -- <url>` | Production smoke test against a running build or the live site |
| `npm run check` | typecheck + lint + test + build |

---

## 7. Edge cases fixed in v0.6

| Problem found | Effect before | Now |
|---|---|---|
| Report links with many Hindi topic names | Link over 12,000 characters → student saw "link incomplete" | Limit 20,000; every link is decoded before it's offered, so a link that wouldn't open is never shown |
| "Full marks", "Out of:", "Total marks" rows | Read as a student, so every score was misread | Recognised as the maximum-marks row |
| MAX row at the bottom of the sheet | Values silently read as percentages | Clear warning telling you to move it to row 2 |
| `0x10`, `1e3`, `1 5` in a cell | Silently became 16, 1000, 15 | Rejected with a message; `+5`, `7,5`, `15 / 20`, `70 %` still accepted |
| `120%` in a cell | Unhelpful advice about adding a MAX row | "“120%” is more than 100% — please check it." |
| Rows without roll numbers | Silently named Student 1, 2… | Warning asking for roll numbers |
| Two tests on the same date | "Unit 10" sorted before "Unit 2" | Natural order |
| Excel `45%` / `15/20` cells, Average/Total rows, invisible characters, empty trailing columns | Errors or summary rows counted as students | Handled (earlier v0.6 work) |
| Impossible dates (`2026-02-31`) in backups and links | Accepted | Rejected |
| Web addresses or direction-override characters in report text | A crafted link could show "pay fees at …" on heramb.study | Rejected; the generator explains why |
| Line breaks in names | Could inject email headers / break CSV exports | Refused for single-line fields |
| Topic names with `<>{}` sent to AI | Could produce an empty name | Cleaned, never empty |

Passing tests are evidence of testing, not proof that nothing can go wrong. Test on real phones (Android Chrome, iPhone Safari) before launch.
