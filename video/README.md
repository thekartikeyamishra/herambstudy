# Heramb.study launch video (Remotion)

A 40-second launch video in three aspect ratios, built from original graphics and clearly labelled concept UI with fictional data. It is fully isolated from the website — its own `package.json`, its own `node_modules`.

| Composition | Size | Use |
|---|---|---|
| `LaunchVideo` | 1920×1080 (16:9) | Website, YouTube, LinkedIn |
| `LaunchVideoVertical` | 1080×1920 (9:16) | Reels, Shorts, Stories |
| `LaunchVideoSquare` | 1080×1080 (1:1) | Feed posts |

## Storyboard (30 fps)

| Time | Scene | On screen |
|---|---|---|
| 0–7 s | Problem | 28 student dots → question marks. "Test finished. Now what?" |
| 7–14 s | Insight | Two fictional students, both 58%, split into different mistake causes |
| 14–24 s | Workflow | Assess → Diagnose → Practise → Verify → Improve |
| 24–34 s | Product | **Concept UI · fictional data** — topic bars move from before to after |
| 34–40 s | Invitation | Logo, "Progress, made visible.", invite-only early access |

Burned-in captions run throughout, so the video is fully understandable with sound off. `captions.srt` contains the same text for platforms that support caption files.

## Commands (Windows PowerShell or any shell)

```powershell
cd video
npm install
npm run studio            # live preview / editing in the browser
npm run render            # out/heramb-launch-16x9.mp4  (silent version)
npm run render:vertical   # out/heramb-launch-9x16.mp4
npm run render:square     # out/heramb-launch-1x1.mp4
npm run still             # out/poster.png (frame 900) for a video thumbnail
```

The first render downloads a headless Chrome build automatically. If your network blocks that, pass an existing Chrome/Chromium: `npx remotion render src/index.ts LaunchVideo out/x.mp4 --browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"`.

## Voiceover (optional)

The default renders are **silent** (the required no-audio version). To add narration:

1. Record or license a voiceover of `voiceover-script.md` (about 35 seconds).
2. Save it as `video/public/voiceover.mp3`.
3. Run `npm run render:with-voiceover`.

If you use a synthetic (AI) voice, say so where you publish the video — don't present it as a recorded human. Check pronunciation: **Heramb** is "heh-RUMB" (Hindi: हेरम्ब).

## Asset attribution

- All graphics, the logo and the concept UI are original to this project.
- Fonts: **Inter** (© The Inter Project Authors) and **Fraunces** (© The Fraunces Project Authors), both under the SIL Open Font License 1.1 — licence texts in `public/fonts/`. They are self-hosted so renders work offline.
- No music, stock footage or sound effects are included. If you add any, use only assets you have a licence for and list them here.

## Claims check

The video makes no claims about learning outcomes, marks, institute growth or availability dates. All student data shown is fictional and labelled as such on screen.

## Remotion licence

Remotion is free for individuals and companies of up to 3 people; larger organisations need a company licence. Check the current terms at remotion.dev/license before commercial use.
