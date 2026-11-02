# Heramb.study launch videos (Remotion)

Isolated from the website: its own `package.json` and `node_modules`.

## Launch film v2 (57 s, voice, music and sound design): the one to publish

| Composition | Size | Use |
|---|---|---|
| `LaunchV2` | 1920×1080 (16:9) | Website hero, YouTube, LinkedIn, WhatsApp |
| `LaunchV2Vertical` | 1080×1920 (9:16) | Reels, Shorts, Stories, WhatsApp Status |
| `LaunchV2Square` | 1080×1080 (1:1) | Feed posts |

**Story:**
1. Hook: the weekly test, and everyone moves on.
2. Problem: which chapter, which students?
3. Aha: paste marks, get a teaching plan in under a minute.
4. A report for every student, English → हिंदी, on WhatsApp.
5. Test builder:
   - shuffled sets;
   - seating;
   - online on any phone;
   - **the answer-key alarm**.
6. Proof: Optics 41% → 68%.
7. The head's view of every batch.
8. Call to action: Free · No login · Marks stay on your device, with a QR to `herambstudy.com/founding?source=video`.

Full timed script: `voiceover-script-v2.md`. Caption file: `captions-v2.srt`. Captions are also burned in, so the film works with sound off.

```powershell
cd video
npm install
npm run render:v2            # out/heramb-launch-v2-16x9.mp4
npm run render:v2:vertical   # out/heramb-launch-v2-9x16.mp4
npm run render:v2:square     # out/heramb-launch-v2-1x1.mp4
npm run studio               # preview and edit live in the browser
```

Props: `withVoice`, `withMusic` and `captions` are all `true` by default. For a silent version: `--props="{\"withVoice\":false,\"withMusic\":false,\"captions\":true}"`.

If the automatic headless-Chrome download is blocked, add `--browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"`.

### Voiceover
- **Generated, synthetic voice:** Kokoro-82M, voice `af_heart` (Apache-2.0 model; commercial use allowed). It is generated fully offline by `scripts/make-voiceover.py`, and the header of that file explains the one-time setup.
- **Disclose that the voice is AI-generated** wherever you publish. The end card already says "Voiceover is AI-generated"; keep that line if you edit the video.
- **To use a human voice:** record each line from `voiceover-script-v2.md` as `public/vo/<scene>.wav` (hook, problem, aha, report, builder, proof, head, cta), update the seconds in `src/vo-timings.json`, and re-render. Captions and music ducking follow the timings automatically.
- **Pronunciation:** "Heramb" is **HAY-ramb** (हेरम्ब). The script passes exact phonemes for it.

### Music and sound effects
All of them are **synthesised from scratch** by `scripts/make-audio.py` (numpy/scipy). There are no samples, stock or third-party audio, so there's nothing to license. Re-run it to regenerate `public/audio/*.wav`.

The music ducks under every voice line and fades out at the end.

## Launch video v1 (40 s, silent concept cut)
`LaunchVideo`, `LaunchVideoVertical` and `LaunchVideoSquare`, rendered with `npm run render`, `npm run render:vertical` and `npm run render:square`. These are kept for reference; v2 replaces them.

## Asset attribution
- All graphics, UI mock-ups and the logo treatment are original to this project.
- Fonts (SIL Open Font License 1.1; licence texts in `public/fonts/`):
  - **Inter** © The Inter Project Authors;
  - **Fraunces** © The Fraunces Project Authors;
  - **Noto Sans Devanagari** © The Noto Project Authors.
- Voice model: Kokoro-82M by hexgrad (Apache-2.0).
- Music and SFX: original, synthesised in code.

## Claims check
- All student data on screen is fictional, labelled "Sample data · fictional", and stated as such on the end card.
- No promises about marks, results or growth. "Under a minute" is the analysis step itself; the analyser runs in the browser in under a second.
- "Founding seats for the first 50 institutes" matches the founding programme's real 50-seat limit. If that changes, edit the end card in `src/LaunchV2.tsx`.

## Remotion licence
Remotion is free for individuals and companies of up to 3 people; larger organisations need a company licence. Check the current terms at remotion.dev/license before commercial use.
