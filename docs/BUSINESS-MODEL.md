# Business model: retention, revenue and AI cost

_Last updated 14 Oct 2026 (v0.5). Owner: Kartikeya Mishra._

## The problem we're solving for ourselves
If an institution can get everything free and leave at no cost, it will leave the day we ask for money. The answer is **not** to trap data or make leaving painful — that breaks trust, invites regulatory trouble (DPDP Act) and kills word-of-mouth in a small, connected market. The answer is to make Heramb **more valuable every week it's used**, so staying is the rational choice and paying feels like protecting an asset.

## Five ethical retention levers (in build order)

| # | Lever | Why it holds them | Status |
|---|---|---|---|
| 1 | **Compounding history** — every saved test enriches trends, repeating-gap detection and term reports | Leaving means losing *future* insight built on their history (data itself stays exportable). A teacher with 10 tests saved won't restart elsewhere. | ✅ Tracker + term reports (local) · ⏳ cloud history (paid) |
| 2 | **Workflow habit** — reteach groups after each test, parent note, follow-up check | Becomes "how we run tests". Habits, not contracts, retain. | ✅ Analyser, follow-up, AI/rule summary |
| 3 | **Multi-sided usage inside the institution** — teachers + principal + students + parents | Each additional role raises the cost of switching for everyone. Students and parents start *expecting* the report after every test. | ✅ personal student report links + student "My progress" (v0.5) · ⏳ multi-teacher, head dashboard, parent delivery, student practice |
| 4 | **Institution-owned assets built in Heramb** — topic maps, tagged question bank, reteach libraries | Real work they'd have to redo elsewhere (they can export it, but rebuilding the workflow takes effort). | ⏳ question bank |
| 5 | **Outcome proof** — year-on-year verified progress used in admissions marketing | Breaking the data series breaks the story they tell parents. | ⏳ cloud history + year comparison |

**Never:** hide the export button, delete data on cancel without notice, auto-renew without reminders, make free tools worse to push upgrades, or show fake scarcity. Promises the product can honour today are encoded in `src/config/plans.ts → GUARANTEES` and shown on `/pricing` — they are a **sales asset** with sceptical principals.

## The student habit loop (why institutes send students to Heramb)

1. Teacher analyses a test → presses **Create student report links** → copies all links into WhatsApp (one personal link per student, institute's name on top).
2. Student opens `/r#…` → sees their topics, class averages, focus topics and next steps → presses **Save to my progress**.
3. Next test, a new link → saved again → `/me` shows every topic's history. The student now *expects* a report after each test and asks for it if it doesn't come.
4. The institute looks organised and caring to students and parents — so it keeps sending, and recommends the free student tools (readiness check, weak-topic finder).

Why it's ethical and cheap: the report lives inside the link (URL fragment), so marks never touch our servers; history lives on the student's device. Cost to us: zero. What it builds: hundreds of students per institute who know Heramb — the base for the student practice app, parent channel and a future B2C plan.

**Monetisation path:** free links show the institute's name as text. Paid plans add letterhead/logo, automatic WhatsApp/email delivery to students and parents, cloud history that follows the student across devices and years, and the principal's view across batches.

## What's free vs paid (and why it's sustainable)

Rule: **free = everything that costs us ~nothing to run** (browser-only tools, local tracker, rule-based summaries, a small AI allowance). **Paid = real running cost or institutional value** (cloud storage, AI at scale, many users, parent delivery, support).

Because free features run on the user's device, 10,000 free teachers cost almost nothing. The free tier is a **distribution channel** (SEO, teacher word-of-mouth, institute demos), not a cost centre. Payment arrives with *new* value — nothing is taken away — so the "they leave when we charge" scenario doesn't apply.

The conversion moment is natural and honest: *"Your 3 classes and 14 tests live only in this browser. Keep them safe and share them with your HOD → Institute plan."*

## Pricing approach (decide after pilots)

- **Unit:** per student per month for institutions (scales with their revenue), billed **per term or annually** aligned to the academic year (April–March). Annual commitment is the strongest retention tool that is fully ethical.
- **Founding partners:** pilot institutions get a founding price locked for 2 years if they convert. *(Only promise this once you decide it — it isn't on the site yet.)*
- **Evidence first:** use the optional ₹/student/month answers from `/pilot` (`npm run waitlist -- pilots`) to set the first price. Set prices in `src/config/plans.ts → priceInr`; the pricing page updates automatically.
- **Teacher Pro** exists mainly as a bridge: individual teachers who love it bring it into their institution.

## Metrics that predict revenue (track monthly)

| Metric | Source today | Healthy signal |
|---|---|---|
| Analyses completed | GA4 `resource_tool_completed` (tool=class_test_analyser) | Growing week on week |
| Tests saved to tracker | GA4 `tracker_test_saved` | Repeat savers = future payers |
| Teachers with ≥ 3 tests in a class | Ask in pilot calls (no accounts yet) | The best leading indicator |
| Pilot applications by institution type | `npm run waitlist -- pilots` | Tells you which segment to sell to |
| Pilot → paid conversion | Manual | ≥ 40% after a full cycle |
| Net revenue retention (later) | Billing | ≥ 100% (more students/teachers next year) |

## AI strategy: keep up with models without burning money

1. **Deterministic core, AI at the edges.** Every number (gaps, groups, trends, closure) is computed in code. Models only turn numbers into words (summaries, parent notes; later question variants). Results stay consistent and auditable, and a model change can't change the analysis.
2. **Aggregates only.** The model receives topic names and class averages — never names, roll numbers or marks. Fewer tokens, lower cost, no student-data processing by third parties.
3. **Always a free fallback.** `ruleBasedSummary()` produces the same shape instantly. AI off, over quota, slow (12 s timeout) or wrong (strict JSON parsing) → users still get value.
4. **Swap models with an env change.** `AI_PROVIDER=anthropic | openai_compatible | none`, `AI_MODEL=…`. As better or cheaper models ship, change the env, run the tests, done. `PROMPT_VERSION` is part of the cache key so prompt changes never serve stale answers.
5. **Hard cost ceilings.** Per-visitor daily allowance (plan-based; `AI_FREE_DAILY_LIMIT` can only lower it), a global daily cap (`AI_GLOBAL_DAILY_LIMIT`, default 300), 450 max output tokens, and a cache so identical requests make one call.
6. **Small model by default.** The small tier (`claude-haiku-5-5`) is the default. Use a larger model only where a measurable quality gain matters (e.g. future question generation, reviewed by humans).

**Cost estimate per summary:** input ≈ 300–700 tokens, output ≤ 450 tokens (logged per call as `[ai] summary {in, out}`).
`monthly cost ≈ calls × (avg_in × input_price + avg_out × output_price)`. With the default global cap of 300/day, the worst case is 9,000 calls/month — check your provider's current per-token prices and set the cap to your budget.

## Vertical roadmap (each step builds on the data and trust above)

1. **Now — free tools + pilots** (this repo).
2. **Institute plan** — accounts, cloud history, multi-teacher, principal dashboard, branded parent reports (first revenue).
3. **Student practice app** — targeted practice from each student's gaps; institutions assign, students use daily (habit + student-side retention).
4. **Parent channel** — reports via WhatsApp/email; parents expect them every test.
5. **Question bank and content** — institution-owned banks; later a reviewed marketplace.
6. **Benchmarks** (consented, anonymised, aggregated) — "how does my batch compare?" — only with explicit agreements and DPDP review.
7. **B2C for students** — the free student tools grow into a paid personal plan; institutions that recommend Heramb can earn referral credit.

## Decisions you still need to make
- First prices (after ≥ 5 pilot conversations).
- Whether to offer the founding-partner 2-year price lock.
- **Proposed commitments (not shown publicly yet):** renewal reminders 30 and 7 days before any charge, and 12 months of read-only access after cancelling. Both are strong trust builders; add them to `GUARANTEES` once you decide and billing can honour them.
- Which AI provider/model to enable, and the monthly AI budget (sets `AI_GLOBAL_DAILY_LIMIT`).

## Revenue lines (v0.10) — free stays free, paid adds new value

**Why free users don't cost money:** the analyser, paper map, imports from Excel, report links (data inside the link), QR slips, tracker and Hindi all run in the user's browser. Server cost per free user is a few Firestore counter writes a week, a fraction of a rupee a month on Vercel and Firestore free tiers. The only metered costs are AI (photo import, AI summaries), which are capped per network per day and globally (`AI_GLOBAL_DAILY_LIMIT`). Free users are near-zero-cost acquisition, not a loss.

| # | Revenue line | Who pays | Status | Gross margin |
|---|---|---|---|---|
| 1 | **Institute plan**: full-year batch history and CSV export (live), with cloud tracker, multi-teacher workspace and branded reports to follow | Coaching heads | History and export **live**, gated by "Pro until" on `/admin`; others planned | ~95%: data is small aggregates |
| 2 | **Prayagraj Open Test** (monthly common paper, city rank by chapter) | ₹20–30 per student, collected by the institute or paid by parents | Process only; runs on the existing analyser and benchmark | ~85–90%: paper by Circle teachers, printing by the institute |
| 3 | **Photo/OMR reading credits** beyond the free daily cap | Institutes without OMR software | Import is live; credits need billing | 70–80%: AI vision is roughly ₹1–3 per page |
| 4 | **WhatsApp auto-delivery** of reports to parents (Business API) | Institutes with 200+ students | Planned | 40–60%: Meta charges per conversation, pass through plus margin |
| 5 | **Teacher workshops and certification** (Teachers' Circle "Reteach Lab", most-improved-chapter certificates) | Institutes per teacher, or sponsors | Process only | ~90% |
| 6 | **Branded parent reports and PTM kit** (letterhead slips, term report book) | Institutes before parent meetings | Branded reports planned | ~90% |

**Collecting money today without building billing:** send a Razorpay payment link, then set **Pro until** on `/admin`. Pro features turn on for that institute's code at once and switch off by themselves after the date. No card data ever touches Heramb.

**Pricing (owner to decide; keep it under the founding price lock):** a starting point to validate is ₹999–1,999 a month for the Institute plan, or yearly at 10× monthly. Set `FOUNDING_PRICE_CAP_INR` to the founding promise before asking anyone to pay.
