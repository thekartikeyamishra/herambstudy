# v0.7 test plan — founding programme, imports, dashboards

This plan takes about 45 minutes, by hand, on your own laptop and phone. It needs no AI tokens: only the photo import (§F) calls the AI provider, and only if you switch it on.

## 0. Set-up (once)

1. Add these lines to `.env.local`:

   ```
   DEV_MEMORY_STORE=true
   HERAMB_DEV_TOOLS=true
   OWNER_DASHBOARD_PASSWORD=local-owner-pass-123
   CRON_SECRET=local-cron-secret-123456
   PUBLIC_STATS_MIN=1
   ```

   - The memory store is wiped whenever the dev server restarts.
   - Leave `AI_PROVIDER=none` unless you are testing §F.
   - Emails appear in the **Dev inbox** at `/dev`; nothing is actually sent.

2. Run `npm run dev`.
3. Use **three separate browsers**, each with its own storage. The same browser in a normal window and a private window also works.
   - **A, the head:** Chrome.
   - **B, the teacher:** Chrome in a private window.
   - **C, the student:** another browser, or your phone on the same Wi-Fi at `http://<your-PC-IP>:3000`.

## A. Coaching head (browser A)

| # | Do | Expect |
|---|---|---|
| A1 | Open `/founding?source=meeting` and submit the form empty | Each field shows its own error. Phone **or** email is required |
| A2 | Tick the Monday summary with no email | The box is disabled |
| A3 | Fill in the form, wait 3 s, then submit | Shows code `HRB-XXXX-XXXX`, "Founding institute #01 of 50", and the WhatsApp invite and copy buttons |
| A4 | `/dev` → Dev inbox | Welcome email (only if you gave an email) and the owner alert, both with the code |
| A5 | Open `/institute` | The dashboard loads by itself (this browser is connected). Health is "Not activated", 0 of 7 |
| A6 | Submit the form 10 more times within 10 minutes | The 11th attempt is rate-limited (default `RATE_LIMIT_JOIN_PER_IP=10`) |

## B. Teacher (browser B)

| # | Do | Expect |
|---|---|---|
| B1 | Open the invite link from A3 (`…#connect=CODE`) | "Connected to <institute>" bar. The `#connect=` part disappears from the address |
| B2 | Open `#connect=HRB-0000-0000` (a fake code) | A clear "couldn't find" message; nothing is connected |
| B3 | **Load a fictional class** → Analyse | Results appear, but the dashboard (A5, refreshed) still says "Not activated". Demo runs never count |
| B4 | Paste a real-looking test (`docs/` test kit files 01–10) → Analyse | Within about 2 s, the A dashboard shows activation ✓ and "1 real test" |
| B5 | Click **Analyse** 5 more times on the same data | The count stays at 1 (de-duplicated per device) |
| B6 | Upload an `.xlsx` that has a title row, Name, Mobile, Total and Rank columns | Notes say what was removed; names and phone numbers are gone from the box |
| B7 | Upload a workbook with 3 sheets | A sheet chooser appears |
| B8 | Upload an old `.xls` file, then a `.pdf` on the Excel tab | Each gets a clear message pointing to the right option |
| B9 | Google Sheet tab: paste a **private** sheet link | "Isn't shared publicly…" with the exact steps to fix it |
| B10 | Paste a public sheet link → Import, with Remember ticked; reload the page | A "Refresh from linked sheet" button appears; one tap re-imports |
| B11 | Paste `https://evil.example/x` as the sheet link | Rejected before anything is fetched |
| B12 | Create student report links → **Copy all**, then **Copy all** again, then **Download CSV** | The dashboard's "links shared" equals the class size, not 3× it |
| B13 | Click **Preview** on a link | The report opens; the dashboard's "opened" count does **not** go up (teacher device) |
| B14 | Follow-up check with the fictional follow-up | The real follow-up counts "repeat usage"; the fictional one does not |
| B15 | Turn off "Share anonymous usage counts" on `/institute`, then analyse a new test | Nothing is counted |

## C. Student (browser C)

| # | Do | Expect |
|---|---|---|
| C1 | Open one copied link | Report shows "Shared by <institute>"; the dashboard's opened count +1 |
| C2 | Reload 5 times | Still +1 in total (once per report per device) |
| C3 | **Yes, it helped**, then reload | The question is replaced by "Thanks"; it can't be voted twice |
| C4 | **Add to calendar** with no date, then with a date | Downloads an `.ics` file; the event is at 6 pm the day before, with the focus topics |
| C5 | **Save to my progress** → `/me` | Saved. The usage switch is at the bottom of `/me` |
| C6 | Open a link with the last 10 characters cut off | "This report link is incomplete" |

## D. Owner (you)

| # | Do | Expect |
|---|---|---|
| D1 | `/admin` with the wrong password 6 times | Rate-limited after 5 |
| D2 | Correct password | Totals, the "institutes meeting each goal" strip, and one card per institute |
| D3 | Filters: Not activated / At risk / Dormant / Follow-up due | Lists change. Set a follow-up for today → it appears under "Follow-up due" |
| D4 | WhatsApp nudge → Open WhatsApp | `wa.me/91…` with the suggested message, editable before sending |
| D5 | Export CSV and open it in Excel | One row per institute. Notes starting with `=` show as text, not a formula |
| D6 | Delete the institute you made **last** | Its seat is released; the next sign-up gets the same seat number |
| D7 | Remove `OWNER_DASHBOARD_PASSWORD` and restart | `/admin` shows "switched off"; `/api/admin/*` return 404 |
| D8 | `curl -H "Authorization: Bearer local-cron-secret-123456" http://localhost:3000/api/cron/digest` | A digest appears in the Dev inbox for institutes that opted in. Without the header: 404 (the route hides itself) |
| D9 | Open the digest's "Stop weekly emails" link | Confirmation, and no digest on the next run |

## E. Abuse and loopholes (should all fail safely)

| # | Do | Expect |
|---|---|---|
| E1 | `curl -X POST localhost:3000/api/events -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{"code":"<CODE>","device":"aaaaaaaaaaaaaaaa","role":"teacher","events":[{"type":"analysis_real","n":500}]}'` | Counted as **1**, not 500 |
| E2 | The same with `"role":"student","events":[{"type":"links_shared","n":400}]` | Ignored (students can't send teacher events) |
| E3 | The same with no `code` | Nothing is stored; public totals don't change |
| E4 | The same with `Origin: https://evil.example` | 403 |
| E5 | `POST /api/institutes/stats` with someone's code | Name, city and metrics only — **never** phone or email |
| E6 | The browser console: `fetch('/api/admin/institutes')` with no cookie | 401 (or 404 when the dashboard is off) |
| E7 | `npm run build` | Ends with `OK — no developer routes` |

## F. Photo/PDF import (optional; uses AI tokens)

1. Set `AI_PROVIDER=anthropic`, `AI_API_KEY=…` and `IMPORT_PHOTO_DAILY_LIMIT=3`.
2. Upload one clear photo and one handwritten photo.
3. **Expect:**
   - The marks fill the box with a yellow "check against the marksheet" banner, and are **not** analysed until you press Analyse.
   - Unreadable cells are blank.
   - The 4th upload that day is refused politely.

## G. Schools, colleges and tutors (same flows, different words)

- Join as **School**, **College** and **Tutoring centre**. The dashboard, nudges and emails use neutral words ("institute", "students", "test"), with nothing coaching-specific.
- A college with semester exams: use topic or CO names as columns. It works, but there is **no CO-PO attainment** (a known limitation).
- A tutor with one batch of 8: everything works. "Whole-class reteach" just means everyone.

## What "pass" means

- Every row matches its **Expect** column.
- After A–D, the dashboard shows activation, distribution and engagement ✓, with repeat and value still open. That is correct for day 1.
- Repeat needs a second real test 3+ days later, or a follow-up check.
- Retention needs teacher activity 30+ days after activation. Students opening old reports doesn't count.
