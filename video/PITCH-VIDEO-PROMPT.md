# Prompt for Claude: Heramb.study pitch video — v2 (English + Hindi)

> **How to use:** paste everything below the line into Claude Code opened in the `heramb-study/video` folder, so it can edit the Remotion project directly. The QR code is already in `video/public/heramb-qr.svg` and `heramb-qr.png`, and both decode to `https://herambstudy.vercel.app/`. If you have them, also drop in voice-over recordings (`public/vo/en.wav`, `public/vo/hi.wav`) and 10–20 s screen recordings of the live site (see "Footage to capture" at the end).

---

## 0. Your role and working order

You are one person doing six jobs: product-video director, motion designer, editor, colourist, sound designer and conversion copywriter. You will **write, build, edit, audit and fix** a pitch video for **Heramb.study**. Use the existing **Remotion 4.0.535** project in this folder: `video/`, React 19, TypeScript, 30 fps, brand tokens in `src/theme.ts`, fonts in `public/fonts`. Extend it rather than starting a new project, and touch nothing outside `video/`.

Work in this order and never skip a step:

1. Brief check: list anything in this prompt you cannot do and say why.
2. Script lock: use §5 and §6 word for word, or improve them and show a diff.
3. Storyboard: one line per scene with layout, motion and sound.
4. Build.
5. Render.
6. Audit every rendered file against §13.
7. Fix every failure.
8. Re-render.
9. Report.

Repeat steps 6–8 until every audit item passes. Do not tell me it is done while any item fails.

## 1. Goal

The video must get one action from each viewer:

- **Coaching owners, school principals and college HODs:** open **https://herambstudy.vercel.app/** and try the free test analyser on one real test.
- **Investors:** book a 20-minute call with the founder.

Every second must earn the next one. The metrics are: 3-second hold, 50% completion, full completion, QR scans or link clicks, and analyser sessions.

**Honesty about the target.** No video can guarantee a "99%" conversion rate, and you must not promise one. Your job is to remove every reason to say no and make trying it free feel obvious. You must also give me variants to A/B test (§14), because retention is earned by testing. Never fake anything (§2): one invented number spotted by a principal or an investor kills trust in the whole product.

## 2. Truth rules (non-negotiable)

Show only what exists. The source of truth is `src/config/plans.ts` in the website repo, as of October 2026.

**Available now, free, with no sign-up:**
- **Class test analyser.** Paste or upload one test's marks from Excel or Google Sheets: roll numbers, chapter-wise marks and a "MAX" row. It shows which chapters the whole class needs re-taught, which need a small group, and which students need attention. There is a "Load a fictional class" demo button.
- **Follow-up check.** Compares a re-test with the first test and shows improvement in numbers.
- **Class progress tracker.** Save every test and see topic trends, gaps that repeat, and what changed since last time. Data is stored in the user's browser and can be exported any time.
- **Teaching summaries.** An instant rule-based summary, plus an AI-written teaching summary and parent note. The free plan allows 5 AI summaries a day, and the AI sees only aggregate numbers.
- **Student reports.** Term reports across all tests, and a personal report link for every student carrying the institute's name.
- **Student tools.** Readiness diagnostic, learning-gap analysis, repeated-mistakes guide, and comparing assessments.
- **Privacy and access.** Data export any time. Works in any browser, on phone or laptop. Roll numbers are enough, so no student names are needed, and individual marks are never uploaded to our servers.

**Pilot (only with pilot partners):**
- Targeted practice assigned to students.
- Onboarding and priority support.

**Planned (say "coming"; never show or imply they work today):**
- Cloud history across years and devices.
- Reports on institute letterhead.
- Sending reports to parents on WhatsApp or email.
- All teachers in one workspace.
- Principal or owner dashboard.
- Topic-tagged question bank.
- Multi-branch reporting.

**Pricing:** what is free stays free, and paid plans only ever add new things. Paid prices are not published ("founding price on request"), so show no prices.

**Never show:**
- User counts, "trusted by…", testimonials, star ratings or partner logos.
- Selection or results claims, or market sizes.
- Any percentage that is not computed on screen from labelled sample data.

Every sample dataset must carry a visible **"Sample data"** label.

For the investor cut, write traction, market and ask figures as `[FOUNDER TO FILL: …]`. Any frame containing one gets a red **VERIFY** tag so it cannot ship by accident.

## 3. Deliverables: two languages × three cuts

| Cut | Length | Formats | Audience | Ends with |
|---|---|---|---|---|
| **A. Institutions** (master) | 90–100 s | 16:9 and 1:1 | Coaching owners, school principals, college HODs | QR + URL: "Try it free on one test" |
| **B. Investor** | 120–140 s | 16:9 | Angels, seed funds | QR + URL + "Book a 20-minute call with Kartikeya Mishra" |
| **C. Social / WhatsApp** | 30–40 s | 9:16 | Teachers, forwarded on WhatsApp and Instagram | Big QR + URL |

Make each cut in **English (EN)** and **Hindi (HI)**, giving 6 masters. Build them as Compositions named `PitchInstitutions_EN`, `PitchInstitutions_HI`, `PitchInvestor_EN`, `PitchInvestor_HI`, `PitchSocial_EN` and `PitchSocial_HI`.

All six share one set of scene components. Pass the language as a prop (`lang: 'en' | 'hi'`) and keep all on-screen text in `src/i18n/en.ts` and `src/i18n/hi.ts`. A fix to one scene then fixes all six. On-screen text follows the VO language, but keep product terms as people actually say them: Test, Excel, Chapter, Report, QR.

## 4. Voice-over production

- **If `public/vo/en.wav` or `public/vo/hi.wav` exist:** align scenes to them. Transcribe, place each scene boundary on a line break, and stretch or compress animations to fit. Never speed up the voice.
- **If they don't exist:** build to the timings in §5 and §6, export a **VO recording sheet** per language (line, start, end, emotion note), and leave a silent audio track. You may make a scratch TTS track for timing only (an English and a hi-IN neural voice), clearly named `scratch-*.wav`. The final VO must be a human voice or a high-quality neural voice I approve.
- **Voice:** calm, warm, confident, conversational, like a respected senior teacher, never a salesman. English at about 140 words per minute in neutral Indian English. Hindi at about 120 words per minute in everyday spoken Hindi (हिंदुस्तानी), not Sanskritised. Commonly used English words stay in English: test, chapter, Excel, report.
- **Pronunciation:** Heramb = **heh-RUMB** (हेरम्ब). Say the URL as "herambstudy dot vercel dot app"; in Hindi, "हेरम्ब-स्टडी डॉट वर्सेल डॉट ऐप".
- **Mix:**
  - Loudness: −14 LUFS integrated for the social cut, −16 LUFS for presentation cuts, true peak ≤ −1 dBTP.
  - VO: high-pass at 80 Hz, gentle de-ess, light compression (3:1).
  - Music: ducked 10 dB under the VO.
  - SFX: −18 to −24 dB.

## 5. Cut A — Institutions: script (EN and HI)

Each scene names its *job*, the visual and both VO lines. Sentences stay short. Captions run on every line.

**1. Hook (0:00–0:05). Job: stop the scroll.**
Visual: a real-looking Excel mark sheet fills the frame, then the camera pushes in on rows of numbers that blur out of focus. The word "sit there" drops and lands with a soft low thud.
- EN: "Every week, your teachers check a test. Then the marks just… sit there."
- HI: "हर हफ़्ते आपके टीचर टेस्ट चेक करते हैं। फिर मार्क्स… बस पड़े रह जाते हैं।"

**2. Pain (0:05–0:15). Job: make every audience nod.**
Visual: three cards with a whip-pan between each, about 3 s per card. The cards are Coaching ("Is my child improving?"), School ("Gaps found after the board exam") and College ("Weak students found after the semester").
- EN: "Parents ask, 'Is my child improving?' Schools find the gaps after the board exam. Colleges, after the semester."
- HI: "पैरेंट्स पूछते हैं — 'क्या मेरा बच्चा सुधर रहा है?' स्कूलों को कमज़ोरी बोर्ड के बाद पता चलती है। कॉलेजों को, सेमेस्टर के बाद।"

**3. Promise (0:15–0:21). Job: give the one-line answer.**
Visual: masked wipe to night navy, then the logo reveal in brand violet, then the line types on.
- EN: "Heramb turns one test into a teaching plan. In two minutes. Free."
- HI: "हेरम्ब एक टेस्ट को टीचिंग प्लान में बदल देता है। दो मिनट में। फ़्री।"

**4. Demo, the proof (0:21–0:43). Job: show it, don't tell it. Open the loop early: "…and one chapter will surprise you."**
Visual: a real screen recording or a pixel-faithful recreation of the live analyser.
- Paste, then bars grow chapter by chapter.
- The red bar pulses once: "Re-teach to the whole class — Coordination compounds: 18 of 28 below half" (Sample data).
- A small-group tag appears: "Electrochemistry — 3 students".
- A student row highlights.

The camera zooms and follows the cursor. Text is never smaller than 4% of frame height.
- EN: "Paste the marks from your Excel sheet. And one chapter will surprise you. Heramb shows, chapter by chapter, what the whole class needs re-taught… which small group needs help… and which student needs you today. Coordination compounds: eighteen of twenty-eight below half. That's one more class — not eighteen doubt sessions."
- HI: "अपनी Excel शीट से मार्क्स पेस्ट कीजिए। और एक चैप्टर आपको चौंका देगा। हेरम्ब चैप्टर-दर-चैप्टर दिखाता है — पूरी क्लास को क्या दोबारा पढ़ाना है… किस छोटे ग्रुप को मदद चाहिए… और किस बच्चे को आज आपकी ज़रूरत है। कोऑर्डिनेशन कंपाउंड्स: अट्ठाईस में से अठारह बच्चे आधे से कम। यानी एक और क्लास — अठारह अलग डाउट सेशन नहीं।"

**5. Over time and for parents (0:43–0:51). Job: show it becomes a habit.**
Visual: three tests stack into a trend line drawn with a stroke-dash. A repeating gap turns red, the follow-up check shows "+18 points" on the re-test (Sample data), and a phone opens a student's report link with "Your Institute" in the header.
- EN: "Save every test. See which gaps keep coming back. Re-test, and prove the improvement. Every student gets a progress link with your institute's name."
- HI: "हर टेस्ट सेव कीजिए। देखिए कौन-सी कमज़ोरी बार-बार लौट रही है। री-टेस्ट लीजिए, और सुधार साबित कीजिए। हर बच्चे को आपके इंस्टीट्यूट के नाम के साथ अपना प्रोग्रेस लिंक मिलता है।"

**6. "Why not just use AI?" (0:51–1:02). Job: answer the biggest doubt fairly.** Details are in §7.
- EN: "Why not just ask an AI chatbot? A chat forgets your last test. It can misread a table. And you'd be pasting children's marks into it. Heramb keeps individual marks on your device, gives the same answer every time, and remembers every test. It still uses AI — for summaries and parent notes — on top of numbers you can trust."
- HI: "AI चैटबॉट से क्यों न पूछें? चैट आपका पिछला टेस्ट भूल जाता है। टेबल गलत पढ़ सकता है। और आपको बच्चों के मार्क्स उसमें डालने पड़ते हैं। हेरम्ब में मार्क्स आपके डिवाइस पर रहते हैं, जवाब हर बार एक जैसा आता है, और हर टेस्ट याद रहता है। AI यहाँ भी है — समरी और पैरेंट नोट के लिए — पर भरोसेमंद नंबरों के ऊपर।"

**7. Doubts, answered on screen (1:02–1:16). Job: leave no reason to say no.**
Visual: rapid question-and-answer cards, about 2.5 s each. The question appears in grey and the answer in ink, with a soft tick SFX on every answer.
- EN: "Cost? Free — and what's free stays free. Student data? Roll numbers are enough. Teachers? If they can use Excel, they can use this. Your system? Keep it — paste from the same sheet. Boards? CBSE, ICSE, state boards, JEE, NEET, university."
- HI: "ख़र्चा? फ़्री — और जो फ़्री है, फ़्री ही रहेगा। बच्चों का डेटा? सिर्फ़ रोल नंबर काफ़ी हैं। टीचर्स? जो Excel चला लेते हैं, वो ये भी चला लेंगे। आपका सिस्टम? वही रखिए — उसी शीट से पेस्ट कीजिए। बोर्ड? CBSE, ICSE, स्टेट बोर्ड, JEE, NEET, यूनिवर्सिटी — सब।"

**8. Longevity (1:16–1:22). Job: show it is future-proof.** Details are in §8.
- EN: "Nothing to install. Export your data any time. And Heramb is built to switch to better, cheaper AI as it arrives."
- HI: "कुछ इंस्टॉल नहीं करना। अपना डेटा कभी भी एक्सपोर्ट कीजिए। और हेरम्ब ऐसे बना है कि बेहतर और सस्ता AI आते ही उसे अपना ले।"

**9. Leverage and subtle FOMO (1:22–1:28). Job: create urgency without fake scarcity. The only deadline is their next test.**
- EN: "The institutes that see gaps after the first test fix them before the result. Everyone else finds out in March."
- HI: "जो इंस्टीट्यूट पहले टेस्ट के बाद कमज़ोरी देख लेते हैं, वो रिज़ल्ट से पहले उसे ठीक कर लेते हैं। बाक़ी सबको मार्च में पता चलता है।"

**10. CTA and outro (1:28–1:38). Job: one action.** See §11.
- EN: "Try it free on one test. Scan the code, or visit herambstudy dot vercel dot app."
- HI: "एक टेस्ट पर फ़्री में आज़माइए। कोड स्कैन कीजिए, या जाइए हेरम्ब-स्टडी डॉट वर्सेल डॉट ऐप पर।"

## 6. Cut B (investor) and Cut C (social)

**Cut B (investor)** runs scenes 1 → 3 → 4 → 5, then the six investor beats below, then scenes 6 and 8, then a CTA with the call line. Keep investor beats to 8–12 s each, and show a simple, clean diagram on every one.

**B1. Problem**
- EN: "India runs on tests. [FOUNDER TO FILL: number of coaching institutes and schools, with source]. Almost none turn those marks into teaching decisions."
- HI: "भारत टेस्ट पर चलता है। [FOUNDER TO FILL]। लेकिन लगभग कोई भी इन मार्क्स को पढ़ाने के फ़ैसलों में नहीं बदलता।"

**B2. Why now**
- EN: "Every institute already lives in Excel and WhatsApp. AI has become cheap. And India's DPDP Act makes student-data privacy a reason to buy."
- HI: "हर इंस्टीट्यूट पहले से Excel और WhatsApp पर है। AI सस्ता हो गया है। और DPDP क़ानून की वजह से बच्चों के डेटा की प्राइवेसी अब ख़रीदने की वजह है।"

**B3. Business model.** Diagram: a free funnel feeding paid layers, with the paid layers labelled "coming".
- EN: "Free tools bring institutes in. Paid plans add what costs us to run: cloud history, letterhead reports, parent delivery, multi-teacher workspaces, owner dashboards, multi-branch."
- HI: "फ़्री टूल्स इंस्टीट्यूट्स को लाते हैं। पेड प्लान वो जोड़ते हैं जिन्हें चलाने में ख़र्च आता है: क्लाउड हिस्ट्री, लेटरहेड रिपोर्ट, पैरेंट्स तक रिपोर्ट, कई टीचर्स का वर्कस्पेस, ओनर डैशबोर्ड, मल्टी-ब्रांच।"

**B4. Distribution and habit**
- EN: "Every test is a weekly habit. Institutes bring their teachers, and their students. We start founder-led, institute by institute, in Prayagraj. [FOUNDER TO FILL: institutes contacted and piloting]."
- HI: "हर टेस्ट एक हफ़्तेवार आदत है। इंस्टीट्यूट अपने टीचर्स और बच्चों को साथ लाते हैं। हम प्रयागराज से, एक-एक इंस्टीट्यूट करके, ख़ुद शुरू कर रहे हैं। [FOUNDER TO FILL]।"

**B5. Moat and longevity**
- EN: "The moat is the record: test after test, year after year, in the institute's own name. We let them export it any time — and earn the stay."
- HI: "असली ताक़त है रिकॉर्ड — टेस्ट-दर-टेस्ट, साल-दर-साल, इंस्टीट्यूट के अपने नाम से। हम डेटा कभी भी एक्सपोर्ट करने देते हैं — और भरोसे से टिकते हैं।"

**B6. Team and ask**
- EN: "I'm Kartikeya Mishra, founder and full-stack builder. [FOUNDER TO FILL: the ask]. Let's talk for twenty minutes."
- HI: "मैं कार्तिकेय मिश्रा, फ़ाउंडर और फ़ुल-स्टैक बिल्डर। [FOUNDER TO FILL]। आइए, बीस मिनट बात करें।"

**Cut C (social, 9:16)** runs scene 1 → scene 3 → a short scene 4 (only the "18 of 28 below half" reveal) → two doubt cards (cost, data) → scene 10. Use the same VO lines, trimmed. The hook must be readable with the sound off.

## 7. "Why not just use ChatGPT or AI?" (visual spec)

Use a split screen: "General AI chat" on the left, "Heramb" on the right. Five rows appear one by one, each with a small icon:

| Topic | General AI chat | Heramb |
|---|---|---|
| Privacy | Paste minors' marks into a chat | Individual marks stay on your device |
| Correct maths | Can misread or miscount a table | Fixed rules: same marks, same answer, every time |
| Memory | Forgets the last test | Tracker builds the picture test after test |
| Something for parents | A chat reply | A report link per student, in your institute's name |
| Skill needed | Writing and rewriting prompts | Paste and read |

End on: "Heramb uses AI where it helps — on top of numbers you can trust." Be fair: don't mock AI or show competitor logos.

## 8. Longevity and future-proofing (on-screen points)

- Works in any browser, with nothing to install, on phone or laptop.
- Your data exports any time, so there is no lock-in.
- The AI layer is provider-independent and falls back to rule-based summaries, so it keeps working as models change and costs fall.
- Free stays free, and paid plans only add.
- Roadmap, labelled "coming": cloud history, parent delivery, owner dashboard, multi-branch.

## 9. Visual system, format, padding and spacing

- **Colours, matching the website:**
  - Ink `#0E1528`, paper `#FAF8F4`, sunk `#F3F0E9`, line `#E4DFD4`, night `#0C1121`.
  - Brand violet `#4A3CCE`, pressed `#382BB0`, tint `#EDEBFC`.
  - Status colours only, never decoration: teal `#0D7A68` = secure, amber `#A15406` = small group, red `#B42340` = re-teach.
- **Type:**
  - English: the site's sans for UI and captions, its display face for headlines.
  - Hindi: **Noto Sans Devanagari** (or Mukta) for body and captions, and the same family at weight 700 for headlines. Load it with `@remotion/fonts` and confirm the conjuncts render correctly (क्ष, त्र, ज्ञ, श्र, द्ध).
  - Headlines −2% tracking in English, 0% in Hindi. At most two weights per frame.
  - Hindi line-height 1.5; English 1.25 for headlines and 1.4 for body.
- **Grid and spacing:**
  - 8-pt grid, spacing tokens 8/16/24/32/48/64/96.
  - Cards: 32 px inner padding, 24 px corner radius on 1080p.
  - Gap of at least 24 px between any two elements.
  - Headline-to-body gap 24 px; card-to-caption gap of at least 48 px.
- **Safe areas:**
  - 16:9: 6% padding on all sides.
  - 1:1: 8% padding.
  - 9:16: keep text out of the top 14% and bottom 20% (platform UI).
- **Layout:**
  - One idea per frame, with at most about 8 words of on-screen text besides captions.
  - Left-align body text; centre only hero lines.
  - Re-lay out each aspect ratio instead of cropping it.
  - No widows: break headlines by meaning.
- **Look:** clean, calm, premium education product. Warm paper backgrounds with night-navy scenes for contrast. No stock clichés, confetti, neon or lens flares.
- **Depth, light and shadow:**
  - Three depth planes (background, card, cursor) with subtle parallax of 2–6 px of travel.
  - UI card shadows in two layers, always lit from the top-left: `0 1px 2px rgba(14,21,40,.06)` and `0 12px 32px rgba(14,21,40,.10)`.
  - A very soft top-left key-light gradient.
  - A vignette of ≤8% on night scenes only.
- **Colour correction for any real footage or screen capture:**
  - Normalise to Rec.709, with the white point matched to paper `#FAF8F4`.
  - Gentle contrast S-curve; lift blacks to ink, never pure black.
  - Saturation −5% except brand violet; light sharpening on UI text.
  - All clips must match one another, and skin tones must stay natural if the founder appears.

## 10. Motion, transitions, SFX, music and captions

- **Retention pacing:**
  - A visual change every 2–4 s.
  - A pattern interrupt at least every 6 s: a scale punch, a cut to night navy, or a question card.
  - Open the loop in scene 4 and close it on the red-bar reveal.
  - Put the strongest visual (the bars animating) before 0:30.
- **Easing:** springs for UI (damping 18–22, stiffness 120–180) and ease-out cubic for text. Only progress bars move linearly.
- **Procedural animation:**
  - Bars grow with a 4-frame stagger; numbers count up.
  - The trend line draws on with stroke-dash; the gap bar pulses once.
  - The QR builds module by module from the centre, then stays **fully static for at least 3 s** so it scans.
  - Everything is deterministic: no unseeded `Math.random()`.
- **Transitions:** at most three types in the whole video: a whip-pan with motion blur, a match-cut (mark sheet to analyser), and a masked wipe in brand violet.
- **SFX:** subtle and tasteful. A soft paste click, an airy whoosh on whips, a tiny tick on each answered doubt, a low warm thud on the hook word, and a gentle chime when the QR completes. No cartoon sounds.
- **Music:** royalty-free with a licence file saved in `public/music/LICENSE.txt`. Warm, minimal piano or plucks with light percussion at 95–110 BPM. Cuts land on beats, and the music swells only in the promise and the CTA.
- **Captions:**
  - Burned in, word-highlight style with the current word in brand violet.
  - At most 2 lines and 32 characters per line in English, 28 in Hindi.
  - Size: 4.5% of frame height on 16:9, 5.5% on 9:16.
  - Placed on a paper-coloured pill at 85% opacity, with 16 px horizontal and 8 px vertical padding, above the bottom safe area.
  - Export `.srt` files: `en.srt` and `hi.srt` (Devanagari, UTF-8).

## 11. Outro and CTA (last 10 s)

- **Headline:** EN "Try it free on one test." / HI "एक टेस्ट पर फ़्री में आज़माइए।"
- **Sub-line:** EN "No sign-up · 2 minutes" / HI "बिना साइन-अप · 2 मिनट"
- **URL:** the link is exactly `https://herambstudy.vercel.app/`. Display it as **herambstudy.vercel.app** in ink on paper, at least 5% of frame height.
- **QR:** use `public/heramb-qr.svg`, which encodes `https://herambstudy.vercel.app/`.
  - Black modules on pure white, with a quiet zone of at least 4 modules.
  - Size: at least 22% of frame height on 16:9, at least 40% of frame width on 9:16.
  - No colour, glow, blur, rounded modules, logo overlay or perspective tilt.
  - Static for the final 3 s or more, and never covered by captions or platform UI.
  - Label it "Scan to try it now" / "स्कैन करें, अभी आज़माएँ".
- **Investor cut:** add "Book a 20-minute call with Kartikeya Mishra, founder" and `[FOUNDER TO FILL: email / WhatsApp]`.
- **End frame:** hold it 2 s after the VO ends. The last frame must also work as a thumbnail.

## 12. Build notes (Remotion)

- **File layout:**
  - Shared scenes in `src/scenes/`.
  - Text in `src/i18n/{en,hi}.ts`.
  - Captions in `src/captions/`.
  - Reuse the tokens in `src/theme.ts` rather than duplicating them.
- **Code:** use `<Series>` for scenes, `spring()` and `interpolate()` with `extrapolateRight: 'clamp'`, and `staticFile()` for assets.
- **Scripts:** add `render:pitch:en`, `render:pitch:hi`, `render:investor:en`, `render:investor:hi`, `render:social:en`, `render:social:hi`, `render:pitch:all` and `stills`.
- **Output:** H.264, CRF 18, yuv420p, AAC 320 kbps, plus a poster still for each master. The WhatsApp cut must be under 50 MB.
- **Before every render:** run `npm run typecheck`.

## 13. Audit checklist: run on every rendered file, fix everything, re-render

- **Truth**
  - Every claim maps to §2.
  - Planned features say "coming".
  - No invented numbers, testimonials or logos.
  - All sample data is labelled.
  - No `[FOUNDER TO FILL]` and no VERIFY tag remains in a file meant to ship.
- **Hook**
  - Motion and a stated pain within the first 3 s.
  - The first frame reads without sound.
- **Retention**
  - No static shot longer than 4 s, except the QR hold.
  - A pattern interrupt every 6 s or less.
  - The open loop is closed.
- **Doubts:** cost, data safety, teacher effort, system change, boards and exams, "why not AI" and longevity are each answered on screen.
- **Language**
  - Hindi reads naturally to a Prayagraj or Lucknow principal: no machine-translation phrasing, and the Devanagari spelling is checked.
  - English is simple, with no jargon.
  - "Heramb.study" and "Kartikeya Mishra" are spelled correctly everywhere.
- **Format and readability**
  - All text is at least 4% of frame height (labels at least 3.5%).
  - Contrast is at least 4.5:1, including the status colours on paper.
  - Nothing sits outside the safe areas, padding follows the 8-pt grid, and nothing overlaps the captions.
  - Each aspect ratio is properly re-laid out.
- **Motion:** no jitter, no element popping in without animation, at most 3 transition types, consistent easing.
- **Colour and light:** a consistent white point, no crushed blacks or clipped whites, consistent shadow direction, vignette only at night.
- **Audio:**
  - Loudness and true peak meet §4.
  - The VO is clear on a phone speaker.
  - SFX never louder than the VO; no clicks at cuts.
  - The Hindi and English mixes match in loudness.
- **Captions:** in sync within ±2 frames, at most 2 lines, and the `.srt` files validate.
- **QR and URL**
  - Extract the last frame of every file and decode it programmatically, for example `python -c "import cv2;print(cv2.QRCodeDetector().detectAndDecode(cv2.imread('last.png'))[0])"`. It must print exactly `https://herambstudy.vercel.app/`.
  - Also scan it with a phone from 1 m off a laptop screen.
  - The URL text is spelled exactly.

## 14. What to hand back

1. The six rendered videos, poster stills, `en.srt`, `hi.srt`, and the VO recording sheets if VO was not provided.
2. A report with three parts:
   - What each audit pass changed.
   - Anything you could not satisfy, and why.
   - Every remaining `[FOUNDER TO FILL]` placeholder.
3. A/B kit:
   - Three alternative hooks (first 3 s) per language.
   - Two thumbnails per cut.
   - A note on which to test first and how to read the results (3-second hold, completion and QR scans).

## Footage to capture (the founder does this first)

Record 1080p or higher screen captures of the live site at 100% zoom, in a clean browser profile with notifications off:

1. https://herambstudy.vercel.app/resources/class-test-analyser → "Load a fictional class" → "Analyse class" → scroll the result.
2. The same page with a sample CSV pasted. Use the sample CSVs from the outreach packs, for example the 28-student Chemistry test.
3. https://herambstudy.vercel.app/tracker with three tests saved.
4. One student report link opening on a phone.
