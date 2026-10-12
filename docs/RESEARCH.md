# Research report — Heramb.study launch

Retrieved: 12 October 2026. Method: desk research (public web pages and official documentation) plus product reasoning. **No keyword tool, Google Trends export, Reddit/Quora scrape, or user interview was run for this report.** Every item is labelled:

- **[Verified]** — confirmed from a primary or official source on the retrieval date
- **[Vendor claim]** — stated by a company about itself; not independently verified
- **[Hypothesis]** — our reasoning; must be tested before it drives major decisions
- **[Unverified]** — a candidate (e.g. keyword) with no measured data yet

---

## 1. Core pain points (all [Hypothesis] until interviews)

| Who | Pain | Why we believe it | Confidence |
|---|---|---|---|
| Coaching teachers | Frequent tests, but no time to turn answer sheets into "who needs what" | Test frequency in JEE/NEET coaching is high; analysis is manual | Medium |
| Institute owners | Parents see marks and ranks, not specific progress; hard to show value | Reporting is usually total/rank based | Medium |
| Students | Practise whole chapters or random question banks rather than their actual gaps | Common study behaviour; retrieval/spacing research suggests better methods | Medium |
| Everyone | No check whether a gap closed before moving on | Syllabus pressure pushes forward | Medium |

**Next step:** 10–15 structured interviews (5 institute owners, 5 teachers, 5 students) using the pilot conversation outlined on `/for-institutes`. Record verbatim quotes, not summaries.

## 2. Public discussion evidence

Not collected in this build (no scraping was performed). **To do:** manually review r/JEENEETards, r/Indian_Academia, Quora "coaching institute" topics and teacher WhatsApp/Telegram communities you belong to. Log each quote with URL, date and a tag (pain / workaround / willingness to pay). Do not paraphrase into stronger claims than the source.

## 3. Competitor landscape

| Product | What it is | Source | Label |
|---|---|---|---|
| SATHEE mock-test engine (sathee.iitk.ac.in) | JEE/NEET mock tests with topic-level strengths/weaknesses, time-per-question analysis, error review, comparisons with national averages and peers, study-plan recommendations | Page content | [Vendor claim] |
| Testpress | Coaching LMS: exam engine (sectional, timed, "adaptive"), analytics on progress, accuracy, rankings, strengths/weak areas | Testpress blog | [Vendor claim] |
| Classplus | Widely used coaching app/LMS platform in India | Market presence; Testpress positions itself as an alternative | [Verified: exists] |
| Embibe | AI-led learning/test platform for JEE/NEET and school | Investor/portfolio pages | [Verified: exists] |
| Teachmint, institute ERPs | School/coaching management (attendance, fees, classes) | Market presence | [Verified: exists] |

### Key finding — this changes positioning
**Topic-level test analytics is already commoditised**, including a free government-backed option (SATHEE) and LMS vendors. "We show strengths and weaknesses by topic" is **not** a differentiator. [Hypothesis, high confidence]

Defensible angles that the public material above does not emphasise:

1. **Verified closure of gaps** — a scheduled follow-up check on the same skills, reported as improved / no clear change / declined with an honest margin.
2. **Mistake-type diagnosis that changes the action** — concept vs method vs careless vs misread vs time pressure, driving different interventions and teacher groupings.
3. **Bring-your-own tests** — works on top of an institute's existing test series and LMS, instead of replacing them.
4. **Parent-ready, specific progress reports** — the institute's retention and trust story.

The website copy already leans on these four. Pricing and features of competitors must be checked live before any comparison page is published — **never publish comparative claims from this table without re-verification.**

## 4. Search-intent clusters (all keywords [Unverified])

| Market | Intent | Candidate keywords |
|---|---|---|
| India | Problem | how to find weak topics in JEE, student performance analysis coaching, why marks not improving |
| India | Utility | student progress report format, test analysis template, learning gap analysis |
| India | Commercial | coaching institute student analytics software, test analysis software for coaching |
| UK | Utility | progress report template tutor, assessment analysis spreadsheet |
| US / Canada | Utility | learning gap analysis template, how to analyze test results by standard |
| Germany | Utility | Lernfortschritt Schüler dokumentieren, Lernstandsanalyse Vorlage |

Search volume, difficulty and CPC: **not measured.** Get them from Google Keyword Planner (free with a Google Ads account) and Search Console once the site is live.

## 5. Google Trends

Not run. Note: Trends returns a normalised 0–100 index per query/geo/time window, not absolute volumes ([Verified] — Google Trends help). Use it only to compare relative interest, e.g. "progress report template" India vs UK over 5 years.

## 6–7. Keyword Planner / difficulty

Not available in this environment. Procedure:
1. Keyword Planner → "Get search volume and forecasts" → paste section 4 lists, geo by market.
2. Keep keywords with clear informational/utility intent and monthly volume in the range you can realistically rank for in 6–12 months.
3. Only create a page when it can be **substantially more useful** than what currently ranks — never one page per keyword variant.

## 8. Content gaps and underserved use cases [Hypothesis]

- Fair comparison of two tests (margin for noise) — rarely explained for teachers. → `/resources/comparing-assessments`
- Mistake-type taxonomy with matched interventions. → `/resources/interpreting-repeated-mistakes`
- Printable, topic-level progress reports for parents. → `/resources/student-progress-report-template`

## 9. Initial ICP

**Small-to-mid JEE/NEET coaching institutes (50–1,000 students) in Tier-2/3 Indian cities, owner-operated, already running weekly tests.**

Reasons: frequent tests generate data; owners feel parent-reporting pressure directly; decisions are fast (one decision-maker); existing LMS tools focus on content delivery and generic analytics. [Hypothesis]

## 10. Experiments to validate willingness to pay (prioritised)

| # | Experiment | Success signal |
|---|---|---|
| 1 | 10 institute-owner interviews; end with "would you pay ₹X/student/month for a 6-week pilot outcome report?" | ≥ 3 say yes with a specific budget |
| 2 | Manual "concierge" pilot: you run the gap analysis on one batch's real test using the free tools + a spreadsheet | Teacher changes a lesson plan based on it; owner asks to continue |
| 3 | Invite form segmentation: share of `institute_owner` + `evaluate_for_institute` | ≥ 20% of requests after 100 total |
| 4 | Paid pilot offer (refundable deposit) to 5 interested institutes | ≥ 2 pay |
| 4b | `/pilot` price-comfort answers (optional field, ₹/student/month) | A clear modal range among applicants who would start within 3 months |
| 5 | Resource → invite conversion by page (GA4 events) | Identify which resource attracts the ICP |

Record outcomes in this file with dates.
