# Founding Institute Programme (v0.7)

This guide is for the owner. It explains how Heramb shows real users and usage without student accounts, how institutes stay regular, and how marks get in without retyping.

## 1. The idea in one paragraph

Each coaching institute gets a free **institute code** such as `HRB-7KQ4-M2XA` in about 30 seconds at `/founding`. No accounts, passwords or payment are involved.

Teachers connect once by opening an invite link (`…/class-test-analyser#connect=CODE`). After that, three things count toward that institute:

- every real test they analyse;
- every report link they share;
- every student who opens, saves or rates a report.

Only **counts** are sent: no marks, names, roll numbers or topic names. The first `FOUNDING_CAP` institutes (50 by default) get a numbered **founding seat**, which carries a founding discount on any future paid plan. Nothing is ever charged automatically.

## 2. Meeting-day flow (10 minutes, on the head's phone)

1. Hand over the visiting card. Its QR code should point to `https://herambstudy.vercel.app/founding?source=meeting`.
2. The head fills in the form and gets the code and seat (for example "Founding institute #07 of 50"). Their phone is now connected.
3. Analyse one real test together. Use whatever they already have:
   - **Excel or CSV:** their own sheet or a test-platform/ERP export. Title rows, names, phone numbers, totals and ranks are removed automatically. The file never leaves the phone.
   - **Google Sheet:** paste the link (shared as "Anyone with the link — Viewer"). Tick **Remember** so that after the next test it is one tap: **Refresh from linked sheet**.
   - **Photo or PDF of the marksheet:** AI reads it into the box, and the teacher checks it before analysing. This only works when `AI_PROVIDER` is configured. Anthropic reads both photos and PDFs; OpenAI-compatible providers read photos only.
   - **Paste** from any spreadsheet.
4. Tap **Create student report links**, then **Copy all**, and send the links to students in personal chats.
5. From the success screen, tap **Invite teachers on WhatsApp**. Each teacher's analyser is then connected automatically.
6. Before leaving, put a **Next follow-up** date (about 7 days out) on the owner dashboard.

## 2b. v0.8 additions to use in every meeting

- **Ask the test day** ("Which day is your weekly test?") and pick it on the form. The first follow-up is then scheduled automatically for the day after their next test, and `/admin` shows whether each week's test was analysed.
- **Ask how marks are recorded.**
  - *Chapter-wise:* paste or import as usual.
  - *Question-wise, OMR or online test (C/W):* paste the sheet, then type the paper map once ("1-10: Kinematics"). Heramb adds the questions up per chapter, with +4/−1 marking if needed.
  - *Totals only:* chapter analysis needs either question-wise answers or chapter-wise marks. Offer to set up the paper map for their next test.
- **Big batches:** use **Print report slips (QR)**, 8 per A4 page, to hand out in class. Or add roll → WhatsApp numbers once on the teacher's phone, so each student's WhatsApp button opens their chat directly.
- **Hindi-medium:** choose **हिंदी** as the report language. Students can switch on the report page, and the parent note has a Hindi copy button.
- **Weekly summary on WhatsApp:** in `/admin`, choose the nudge **Weekly summary** for heads who don't read email.

## 3. The seven programme goals and how each is measured

Each institute sees all seven on `/institute#CODE`. You see them for every institute on `/admin`. All are computed from the anonymous daily counts by `computeMetrics` in `src/lib/institute/metrics.ts`.

| Goal | Counts as "yes" when | Source events |
|---|---|---|
| Institute activation | first real (non-fictional) test analysed | `analysis_real` |
| Teacher adoption | teacher activity on 2 or more different days | any teacher event |
| Student distribution | at least one report link shared (copy all, copy one, or CSV) | `links_shared` |
| Student engagement | a student saved a report, tapped "useful" or added a revision reminder | `report_saved`, `student_helpful_yes`, `reminder_added` (opens also shown) |
| Repeat usage | another real test at least 3 days after the first, or a follow-up check | `analysis_real`, `followup_run` |
| Retention after 30 days | any activity 30 or more days after activation (pending before day 30) | all |
| Value | the institute answered "what did it help with?" with anything except "not yet" | value feedback form |

**Health:** "not activated", "active", "at risk" (no activity for 10+ days) or "dormant" (30+ days). The dashboard also shows an 8-week rhythm, a weekly streak and one **next step**.

## 4. The consistency loop (no payment pressure)

| When | What happens | Who does it |
|---|---|---|
| Every test | Teacher refreshes the linked sheet, analyses and sends links (about 2 minutes) | Teacher |
| Every report | Students tap "useful?" and "Add to calendar" (a revision slot at 6 pm the day before the next test) | Student |
| Monday 08:30 IST | Weekly digest email: last week's numbers, streak, checklist and next step (only if the institute opted in) | Automatic (Vercel Cron) |
| Daily, 2 minutes | `/admin` → filter **Follow-up due** or **At risk** → **Open WhatsApp** with the suggested nudge | You |
| Day 7–14 | Ask the value question (nudge "Ask for value"), which links to their dashboard | You |
| Month 1 | Retention shows "yes" for institutes still active. Ask the active ones for a referral | You |

The nudge messages (`src/lib/institute/share.ts`) are short and specific, with no hype, guilt or false urgency.

## 5. Showing traction honestly

- `/api/stats/public` and the homepage band show **real totals only**: institutes, founding seats taken, tests analysed, report links shared and reports opened.
- These stay hidden until at least `PUBLIC_STATS_MIN` institutes (default 3) have joined.
- For investors, use `/admin` → **Export CSV**. It gives per-institute goals, devices and dates.
- **Never** quote numbers you can't show from this export.

## 6. Configuration

| Variable | Default | Notes |
|---|---|---|
| `FOUNDING_CAP` | 50 | number of founding seats |
| `PUBLIC_STATS_MIN` | 3 | threshold for the public counter |
| `OWNER_DASHBOARD_PASSWORD` | unset (dashboard returns 404) | 12+ characters; server-only |
| `CRON_SECRET` | unset (no digests) | 16+ characters; Vercel sends it automatically to the cron route |
| `IMPORT_PHOTO_DAILY_LIMIT` | 10 | photo/PDF imports per network per day |
| `AI_PROVIDER`, `AI_API_KEY` | none | needed for photo/PDF import |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TOKEN_SECRET` | unset | needed for the welcome and digest emails |

Storage (Firestore) must be configured in production. Without it, `/founding` honestly says nothing was saved.

## 7. Data model (Firestore, server-only)

- `institutes/{code}`: the institute record (contact details visible only on `/admin`).
- `institutes/{code}/days/{YYYY-MM-DD}`: counters, using India dates.
- `institutes/{code}/devices/{sha256}`: hashed random device ids, used for distinct teacher and student device counts.
- `institutes/{code}/feedback/{auto}`: value feedback.
- `meta/founding`: seats taken.
- `meta/totals`: the public totals.

The rules deny all browser access (`firestore.rules`). Deleting an institute from `/admin` removes the record and every subcollection.

## 8. Limits to be honest about

- Counts can be inflated by anyone who has an institute's code. They are good evidence of activity, not an audit. Treat obvious spikes with caution.
- A teacher who clears browser data must reconnect (one tap on the invite link again).
- Student counts appear only for links created **after** the teacher connected, because the code travels inside the report link.
- Photo reading can misread handwriting. That is why imported marks are always shown for checking first.
- Google Sheets must be shared "Anyone with the link — Viewer". Private sheets are not supported, by design, because there is no Google sign-in.
