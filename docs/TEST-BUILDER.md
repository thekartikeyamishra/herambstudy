# Test builder: product, pricing and support playbook (v0.13)

## What it does (live)
1. **Question bank.** Paste questions from Word, PDF or notes in any common format:
   - options as (a)…(d) or A./B., inline or one per line;
   - answers as "Ans: b", or multi-correct "Ans: B, C";
   - tags for subject, chapter and difficulty, with defaults.

   Duplicates are skipped, and every problem is reported with its question number. The bank is stored in the browser, with JSON export and import.
2. **Paper.**
   - **Exam pattern presets:** JEE Main / NEET style +4/−1, CUET style +5/−1, CA Foundation MCQ style +1/−0.25, board +1/0. These set the marking and a suggested time. Question counts stay the teacher's choice, because exam bodies change them, and the page says so.
   - **Quick blueprint:** pick chapters, a total, and a mix:
     - balanced 30/50/20;
     - practice 50/40/10;
     - exam level 20/50/30;
     - challenge 10/40/50.

     A missing level is filled from the nearest level, and any shortfall is stated, never padded.
   - **Manual blueprint rows:** chapter × difficulty × count.
   - Questions used in the last 3 papers are avoided while fresh ones remain.
3. **Sets A–D** with shuffled questions and options, built from a stored seed so every device rebuilds the same paper.
4. **Batches and seating.** Enter "11 JEE A, 42" per batch. You get:
   - a set for every roll number, rotating so neighbours never share one, and each batch starting on a different set;
   - copies per set per batch, including 5% spare;
   - a printable seating chart.
5. **Print:** every set, a bubble answer sheet, a teacher key page with the chapter map, and the seating charts.
6. **Online test.** There is one link per set, with an optional batch label inside, and no key. Each student:
   - enters a roll number;
   - takes the timed test (answers survive reloads);
   - is auto-submitted at time-out;
   - sends a short response code on WhatsApp.
7. **Results: question check first.** Paste the codes, or an OMR/Excel table (Roll, Set, Batch, Q1…). For each question you see:
   - % correct;
   - the key;
   - the most-picked wrong option.

   Questions are flagged for:
   - **"Check the answer key"** (most students agree on another option);
   - too hard;
   - too easy;
   - often skipped.

   You can filter by batch, download a CSV, and **re-tag difficulty from real results**. Then "Open the chapter-wise plan" leads to the analyser, report links, QR slips and the follow-up check.
8. **Loop.**
   - The analyser's "Make a retest on these weak chapters" opens the builder with those chapters pre-selected in the quick blueprint.
   - The **doubt log** (`/doubts`) does the same from the chapters students asked most about.

**The "aha" in about 10 seconds:**
1. The teacher taps "Make a sample paper".
2. Two sets, keys, an OMR sheet and online links appear.
3. The teacher previews set B as a student, submits, pastes the code, and sees the question check and then a chapter-wise plan.

## Why it's the gold standard, not just another test maker
| What most test makers stop at | What Heramb adds | Why teachers stay |
|---|---|---|
| A printed paper | Sets per seat, copy counts, seating chart | Saves the head 20 minutes of photocopy maths every test day |
| A total score | Chapter-wise plan, student reports, follow-up proof | The test becomes teaching, not just marks |
| Trusting the key | **Answer-key alarm** | Catches the typo before 40 parents hear wrong marks |
| Fixed difficulty tags | Difficulty re-tagged from real results | The bank gets more accurate with every test, which is a moat no one can copy-paste |
| Tests only | Doubt log → test on the confusing chapters | A daily habit, not just weekly |

Every lap of the loop (doubts, test, check, plan, retest) adds questions and real difficulty data to *that institute's* bank. The bank is what makes them stay.

## Freemium
| Free forever (costs us about ₹0; runs in the browser) | Institute plan (paid) |
|---|---|
| Question bank up to 2,000 questions on one device | **Shared cloud bank** for all teachers and branches, with version history |
| Unlimited papers, sets A–D, presets, quick blueprint | **Branded papers** (logo, letterhead), watermark per batch |
| Seating and copy counts, printing, OMR sheet | **Auto-collected online results** (no code pasting), live submission tracker, re-attempt control |
| Online tests via link plus response codes, batch labels | **Question analytics over time:** each question's history across batches and years, and the "best discriminating" questions |
| Question check per test, difficulty re-tagging | **Parent progress digest** (monthly PDF per student), and the head's cross-batch doubt heatmap |
| Chapter-wise analysis, report links, retest, doubt log | **AI question drafting** from a chapter name, metered in credits, with teacher review required |

**Why it's profitable:**
- The free tier has no server cost, so there's no cost per free user to subsidise.
- Paid features use tiny storage (questions are text) plus AI credits priced above cost, so every paid action carries margin.
- The paid line sits exactly where an institute grows: more than one teacher, branding for parents, and the head wanting one view.

**Suggested starting price** (validate with the first 10 active institutes):
- one flat **per-institute monthly** plan, not per student, because coaching heads hate per-head billing;
- founding institutes keep their founding discount.

## Known limits (be honest with institutes)
- Questions are text only. No images or diagrams yet; LaTeX-style text works as typed.
- Question types: single and multi-correct MCQ. **Integer/numeric answers are coming** (needed for JEE Main section B).
- Online tests aren't proctored. Use them for practice; run important tests on paper.
- The bank lives on one device until the cloud bank exists. Remind teachers to use **Export backup**.
- Exam pattern presets set marking only. Always check the current year's official notice.

## World-class support as a one-person company
1. **Prevent questions:** every screen says what to do next, every error says how to fix it, and every tool has sample data.
2. **One WhatsApp Business number** with quick replies for the 10 most common questions (formats, sets, seating, online codes, the key alarm, backups), a greeting message, and away hours stated honestly.
3. **A 2-minute screen recording per feature,** linked from the page and from your quick replies.
4. **Proactive follow-ups from `/admin`:** test-day follow-ups, at-risk filter, weekly summary.
5. **Founding institutes get a named "champion teacher" you train once.** They become first-line support inside the institute.
6. **Every support question becomes a fix.** Keep a log (date, question, what changed in the product), and questions fall as the product explains itself.
7. **A response-time promise you can keep:** "within 4 working hours, 9 am – 8 pm IST". Never promise 24×7.

## The three features that make Heramb the default platform
1. **Doubt log → chapter heatmap.** *Live in v0.13* (free); the head's cross-batch view will be paid.
   - *Hook:* a daily habit; it feeds the test builder.
2. **Parent progress digest** (paid add-on, coming): a monthly one-page PDF per student combining every test, chapter trend and doubts, in Hindi or English, on WhatsApp or printed for PTMs.
   - *Why:* parents are who pay fees, so heads pay for this.
3. **Prayagraj Open Test** (community plus revenue, coming): a monthly common paper built from Circle teachers' questions. Students get a city rank by chapter.
   - *Revenue:* ₹20–30 per student.
   - *Moat:* local data and relationships.
