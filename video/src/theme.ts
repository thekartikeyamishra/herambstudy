import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Self-hosted variable fonts (SIL Open Font License 1.1 — see public/fonts/*-OFL.txt).
// Bundling them makes renders reproducible and independent of network access.
export const display = "Fraunces Variable";
export const sans = "Inter Variable";
loadFont({ family: display, url: staticFile("fonts/Fraunces-Variable-latin.woff2"), weight: "100 900", format: "woff2" });
loadFont({ family: sans, url: staticFile("fonts/Inter-Variable-latin.woff2"), weight: "100 900", format: "woff2" });

export const colors = {
  night: "#0C1121",
  nightRaised: "#181F36",
  paper: "#FAF8F4",
  ink: "#0E1528",
  inkSoft: "#2F3852",
  muted: "#586076",
  line: "#E4DFD4",
  brand: "#4A3CCE",
  brandSoft: "#B7B0F7",
  good: "#0D7A68",
  warn: "#A15406",
  gap: "#B42340",
};

export const FPS = 30;

/** Scene timing in frames (30 fps). Total 40 s. */
export const SCENES = {
  problem: { from: 0, duration: 210 },
  insight: { from: 210, duration: 210 },
  workflow: { from: 420, duration: 300 },
  product: { from: 720, duration: 300 },
  invite: { from: 1020, duration: 180 },
} as const;

export const TOTAL_FRAMES = 1200;

/** Burned-in captions: the video must be understandable with sound off. Also exported as captions.srt. */
export const CAPTIONS: Array<{ from: number; to: number; text: string }> = [
  { from: 15, to: 105, text: "A class can finish a test…" },
  { from: 105, to: 205, text: "…without anyone knowing what each student needs next." },
  { from: 220, to: 310, text: "Two students. The same 58%." },
  { from: 310, to: 415, text: "Marks alone don't explain the learning gap." },
  { from: 430, to: 715, text: "Assess. Diagnose. Practise. Verify. Improve." },
  { from: 730, to: 870, text: "See the gap by topic — and the kind of mistake behind it." },
  { from: 870, to: 1015, text: "Then check whether practice actually closed it." },
  { from: 1030, to: 1195, text: "Heramb.study — Progress, made visible. Request early access." },
];
