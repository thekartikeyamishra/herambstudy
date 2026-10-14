# Testing guide — Heramb.study v0.6

How to see and test every feature, including ones normal visitors never see. Covers when each feature appears, the user flows, the test files, and how developer access is kept out of the live site.

---

## 1. Quick start (Windows PowerShell)

```powershell
npm install
Copy-Item .env.development.example .env.development.local   # developer settings (dev only)
npm run dev                                                  # http://localhost:3000
```

Open **http://localhost:3000/dev**, the developer hub. It shows:

- **Environment:** which features are switched on right now.
- **Feature map:** every feature, where it lives, when users see it, and how to turn it on.
- **All pages:** links to every page, including hidden ones (`/r`, `/me`, email pages, the error page and the 404 page).
- **Browser data:** what this browser has saved, with buttons to seed demo data, simulate damaged data, or clear it.
- **Submissions:** every invite, pilot and contact form you submit (in-memory store), and buttons to reset it and the rate limits.
- **Email outbox:** every email the site would have sent, captured instead of sent.
- **Signed email links:** a tool that makes confirm and unsubscribe links, so you can test double opt-in without a mailbox.
- **Test files:** download links for all 53 test files.

**Automated checks:**

| Command | What it runs | Time |
|---|---|---|
| `npm test` | 207 unit, integration and fixture tests | ~10 s |
| `npm run test:e2e` | 207 browser tests on desktop, tablet and mobile, plus accessibility scans (12 run on one size only) | ~10 min |
| `npm run smoke` | 28 live edge-case requests against your running `npm run dev` | ~5 s |
| `npm run smoke:prod` | 29 checks against a production build, including "dev tools don't exist" | ~5 s |
| `npm run test:rules` | Firestore security rules (needs Java 11+) | ~30 s |

---

## 2. How developer access stays out of production

Three independent layers protect the live site:

1. **The routes aren't in the build.** Dev pages are named `*.dev.tsx` / `*.dev.ts` (`src/app/dev/page.dev.tsx`, `src/app/api/dev/*/route.dev.ts`). `next.config.ts` recognises that extension only during `npm run dev`. A production build doesn't see those files, so `/dev` and `/api/dev/*` return 404.
2. **Dev switches are removed at build time.** The mock AI, email outbox and ad preview check `process.env.NODE_ENV`, which the build replaces with `"production"`. Those branches are deleted from the output. Verified on 14 Oct 2026: none of the dev-only code appears anywhere in `.next/`.
3. **Dev settings are never loaded for production.** Next.js reads `.env.development.local` only for `npm run dev`. The code also ignores every dev flag when `NODE_ENV=production`, including on Vercel or App Hosting preview deployments.

**Verify it yourself before every release:**

```powershell
npm run build
npm start                 # in a second terminal: npm run smoke:prod
```

`smoke:prod` must report every `/dev` and `/api/dev/*` route as **404**.

---

## 3. Developer settings (`.env.development.local`)

| Setting | Effect in `npm run dev` |
|---|---|
| `DEV_MEMORY_STORE=true` | Form submissions are kept in memory and shown at `/dev`. No Firebase needed. |
| `EMAIL_DEV_OUTBOX=true` | Emails are captured at `/dev` instead of sent. This takes priority over Resend, so development never emails real people by accident. |
| `OWNER_NOTIFICATION_EMAIL=…` | Turns on the pilot alert email (lands in the outbox). |
| `EMAIL_TOKEN_SECRET=…` | Signs confirm and unsubscribe links. Any string of 32+ characters works locally. |
| `AI_PROVIDER=mock` | A free, offline AI for the teaching summary. `AI_MOCK_MODE` is `ok`, `fail`, `garbage` or `slow`; the last three test the fallbacks. |
| `NEXT_PUBLIC_ADS_PREVIEW=true` | Shows a dashed placeholder box where an ad would go. No Google script loads. |
| `NEXT_PUBLIC_GOOGLE_PLAY_URL` / `NEXT_PUBLIC_APP_STORE_URL` | Turns the "Coming soon" store badges into real links. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-…` | Shows the analytics consent banner. |
| `RATE_LIMIT_*_PER_IP=100` | Raises the form limits so manual testing isn't blocked. The hub's reset button also clears them. |

Restart `npm run dev` after changing this file. The end-to-end tests pin their own values, so your local file can't change their results.

---

## 4. Every feature: where it is, when users see it, how to test it

| Feature | How to reach it | Users see it when… | How to test it |
|---|---|---|---|
| Class test analyser | Free tools → Class test analyser (`/resources/class-test-analyser`) | Always | Press "Load a fictional class", or upload any file from `test-fixtures/class-analyser/` |
| Teaching plan, gap map, reteach CSV, printed student reports | Same page, below the results | After a successful "Analyse class" | `14-valid-plan-whole-class-group-maintain.csv` shows all three plan labels; "Print individual student reports" prints one page per student |
| Follow-up check | Analyser → "Compare with a follow-up test" | After analysing | `follow-up/01-unit-test.csv`, then `02-follow-up-check.csv`: 23 students matched, mismatches listed |
| Student report links | Analyser → "Create student report links" | After analysing, once institute, test and date are filled in | Press "Preview" on any student, or open the links in `student-links/` |
| Save to tracker | Analyser → "Save this test to a class" | After analysing. Not offered in private browsing | Save, then follow the link to `/tracker` |
| Teaching summary + parent note | Analyser → "Write my summary" | After analysing | No AI configured: "Made from your numbers". `AI_PROVIDER=mock`: "[MOCK AI]" text. `AI_MOCK_MODE=fail`: rule-based text plus a note |
| Class progress tracker | Footer → Class progress tracker (`/tracker`) | Always. Trends need 1 test; repeating gaps and "since previous test" need 2+ | Add `tracker/unit-1.csv`, `unit-2.csv`, `unit-3.csv` to one class. Expect R03 Algebra (3×), R08 Statistics (3×), R05 Algebra (2×), R07 Geometry (2×) |
| Tracker backup and import | `/tracker` → Export / Import | Always | Import each `tracker/backup-*.json`; the expected results are in `test-fixtures/README.md` |
| Student term reports | `/tracker`, inside a class | Class has 1+ test | Choose "Preview student", then print all |
| Student report page | Only via a link (`/r#…`) | A teacher sends the link. Never shown in navigation or search | `/dev` → All pages → "/r — student report" |
| My progress (students) | `/me`, linked from every report | Always; content appears after saving | `/dev` → "Seed student history", then `/me` |
| Invite form | Header → Request an invite (`/invite`) | Always. Saving needs storage | `forms/invite-test-cases.csv` (9 cases) |
| Pilot form | Footer → Apply for a pilot (`/pilot`, or `?type=school`, `college`, `coaching`, `tutor`) | Always | `forms/pilot-test-cases.csv` (8 cases) |
| Contact form | Footer → Contact (`/contact?topic=…`) | Always | `forms/contact-test-cases.csv` (5 cases) |
| Invite acknowledgement email | — | First request from a new address, when email is configured | Submit an invite, then check `/dev` → Email outbox. A duplicate request sends no second email |
| Double opt-in (confirm / unsubscribe) | Links inside the email | Signed links configured, and updates ticked | `/dev` → Signed email links → open Confirm, then Unsubscribe. The "Tampered" link must be refused |
| Pilot alert to owner | — | Email + `OWNER_NOTIFICATION_EMAIL` configured | Submit a pilot, then check the outbox |
| Analytics consent banner | Bottom of public pages | GA4 ID set and no choice yet. Never on `/r`, `/me`, `/dev` | Set a fake `G-…` ID; `/dev` → clear "Analytics consent choice" |
| Ad slot | `/resources/<article>` only | AdSense approved with real IDs + visitor consent | `NEXT_PUBLIC_ADS_PREVIEW=true`; never appears on home, forms, legal pages, `/r` or `/me` |
| Store badges | Footer, `/for-students` | Always: "Coming soon" without URLs, real links with URLs | Set the two store URLs |
| "Install Web App" | Footer, `/for-students`, `/r` | Production build, Chrome or Edge. iPhone shows "Add to Home Screen" instructions instead | `npm run build && npm start`, open in Chrome |
| Offline page | `/offline` | Production build, after one visit, then offline on an uncached page | Production build → DevTools → Network → Offline |
| Plans & pricing | Footer → Plans & pricing (`/pricing`) | Always | Check: no promises that don't exist yet |
| Error page / 404 | Any URL | A page crashes / an unknown address | `/dev/crash` (dev only), or `/anything` |
| Planned features | — | Not built; shown only as "Planned" badges on `/pricing` and `/guide` | Nothing to test yet |
| Payments | — | Not implemented | Nothing to test |

### When will planned features appear?

They don't exist in the code yet, so there's nothing to hide or unlock. Their status is defined in one file, `src/config/plans.ts`. Each feature there is marked `available`, `pilot` or `planned`, and the pricing page and guide read that value. When a feature is built, change its availability there. `canUse(plan, feature)` in `src/lib/entitlements.ts` is the gate any new feature should check.

---

## 5. User flows to walk through before each release

**Teacher, about 5 minutes**

1. Open the class test analyser and upload `01-valid-sample-24-students.csv`.
2. Read the teaching plan.
3. Download the reteach groups CSV.
4. Print the student reports.
5. Write a summary.
6. Create student report links, then copy all.
7. Save the test to a new class.
8. Open the tracker and add `follow-up/02-follow-up-check.csv`. You should see "gaps closed" and repeating gaps.
9. Export a backup, delete the class, then import the backup.

**Student, about 2 minutes**

1. Open a report link in a different browser or a private window.
2. Check the report shows "Shared by…" and the focus topics.
3. Press "Save to my progress".
4. Open a second report for the same student and save it.
5. Open `/me` and check the topic history.

**Institution, about 3 minutes**

1. Open `/for-schools` and press "Apply for a free pilot". "School" should be pre-selected.
2. Submit the form.
3. In `/dev`, check the submission and the owner alert email.

**Invite and email, about 3 minutes**

1. Submit an invite with "updates" ticked.
2. Check that the outbox shows the acknowledgement with a confirm link.
3. Submit the same email again: the response should be identical, with no second email.
4. Use the confirm link: in `/dev`, Submissions should show "confirmed".
5. Unsubscribe: it should now show "unsubscribed".
6. Try the tampered link: it must be refused.

---

## 6. Test files (`test-fixtures/`, 53 files)

Every file is checked by `npm test` against `test-fixtures/manifest.json`. The full table with expected results is in `test-fixtures/README.md`. The files are never deployed.

| Folder | Files | Covers |
|---|---|---|
| `class-analyser/` | 14 valid + 18 error + 1 too large + 1 wrong type | MAX row, percentages, absences, negative marking, `;` and decimal commas, tabs, quotes and BOM, Hindi, college units, M.M. and `75%`, the 500-student / 40-topic limits, formula-like IDs; plus every error rule |
| `follow-up/` | 3 | Case-insensitive matching, added and removed topics and students, a test with nothing in common |
| `tracker/` | 3 tests + 6 backups | Repeating gaps with an absence; valid, corrupt, future-version, broken-test, over-limit and script-in-names backups |
| `student-links/` | 24 valid links + 12 edge cases | Trailing punctuation, Hindi, HTML in names, truncated, tampered, wrong version, too many topics |
| `forms/` | 22 cases | Every validation rule for invite, pilot and contact |

---

## 7. Edge-case audit (v0.6): problems found and fixed

| Problem | Before | Now |
|---|---|---|
| A "Total"/"Average" row at the bottom of a sheet | Counted as a student, or a confusing error | Clear error naming the row |
| A "Total", "Percentage", "Rank" or "Grade" column | Silently counted as a topic | Error explaining it's not a topic |
| Name and Roll No columns both present | Roll numbers analysed as marks | Error: keep one ID column |
| Max-marks row labelled "M.M.", "Full marks" or "Max. Marks" | Treated as a student scoring 100% | Recognised as the max-marks row |
| Blank roll number | Invented "Student 1" (breaks test-to-test matching) | Error |
| "0x10", "1e1", "Infinity" | Accepted as numbers | Rejected |
| "75%" in a cell | Rejected | Accepted and converted against the topic maximum |
| Pasted text over 1 MB saved to the tracker | Could make all saved classes unreadable | Refused before parsing; storage validates before every write |
| One damaged entry in a student's history | Whole history discarded | Valid reports kept |
| Report link with a trailing "." or "%20" (chat apps) | "Incomplete link" | Opens normally |
| Report links generated on a preview domain | Pointed at the preview site | Use the production URL when configured |
| Line breaks in name, institution or city | Accepted (could reach email subjects) | Rejected (multi-line notes and messages still allowed) |
| Form posted without the timing field | Skipped the anti-bot check | Rejected |

Each fix has a regression test in `tests/unit/edge-cases.test.ts`.

---

## 8. Release checklist

- [ ] `npm run typecheck`, `npm run lint` and `npm test` all pass
- [ ] `npm run test:e2e` passes
- [ ] `npm run build`, `npm start`, then `npm run smoke:prod`: all pass, every dev route 404
- [ ] `npm run test:rules` passes (Java)
- [ ] Walk the four flows in §5 on a real phone
- [ ] On the live site: `/api/health` reports `firestore`; submit and delete one real invite (`npm run waitlist -- delete`)
