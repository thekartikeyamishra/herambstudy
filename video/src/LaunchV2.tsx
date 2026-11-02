/**
 * Heramb.study launch film v2 (57 s). Adaptive: 16:9, 9:16 and 1:1 from one composition.
 * Every number on screen is fictional sample data and labelled as such; the voice is synthetic
 * (Kokoro-82M, Apache-2.0) and the README says to disclose that when publishing.
 */
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { colors as c, deva, display, sans } from "./theme";
import timings from "./vo-timings.json";

export type LaunchV2Props = { withVoice: boolean; withMusic: boolean; captions: boolean };

/* ── Timeline ─────────────────────────────────────────────────────────── */

type SceneId = "hook" | "problem" | "aha" | "report" | "builder" | "proof" | "head" | "cta";
const ORDER: Array<[SceneId, number]> = [
  ["hook", 180], ["problem", 150], ["aha", 300], ["report", 195], ["builder", 315], ["proof", 165], ["head", 135], ["cta", 270],
];
const VO_DELAY = 12; // frames into each scene before the line starts
export const SCENE_AT: Record<SceneId, { from: number; dur: number }> = (() => {
  let t = 0;
  const out = {} as Record<SceneId, { from: number; dur: number }>;
  for (const [id, dur] of ORDER) {
    out[id] = { from: t, dur };
    t += dur;
  }
  return out;
})();
export const V2_FRAMES = ORDER.reduce((s, [, d]) => s + d, 0); // 1710 = 57 s

const VO_TEXT: Record<SceneId, string> = {
  hook: "Every week, your batch takes a test. Marks go up on the board, and everyone moves on.",
  problem: "But which chapter lost the marks? And which students need help first?",
  aha: "With Heramb, paste the marks you already have. In under a minute, you get a teaching plan: what to reteach to the whole class, and who needs a small group.",
  report: "Every student gets a personal report, in English or Hindi, straight to WhatsApp.",
  builder: "Make the test itself on Heramb. Shuffled sets for every seat, online on any phone. It even catches a wrong answer key, before parents do.",
  proof: "Then, next test, see whether reteaching actually worked.",
  head: "And the head sees every batch, on one screen.",
  cta: "Heramb.study. Free. No login. Marks stay on your device. Start with your last test, today.",
};
const voSec = timings.seconds as Record<SceneId, number>;

/** Caption chunks timed by character share of each line's real duration. */
export const V2_CAPTIONS: Array<{ from: number; to: number; text: string }> = (() => {
  const out: Array<{ from: number; to: number; text: string }> = [];
  for (const [id] of ORDER) {
    const text = VO_TEXT[id];
    const chunks = text.match(/[^,.:?]+[,.:?]?/g)!.map((x) => x.trim()).filter(Boolean);
    const merged: string[] = [];
    for (const ch of chunks) {
      if (merged.length && (merged.at(-1)!.length < 14 || ch.length < 8)) merged[merged.length - 1] += ` ${ch}`;
      else merged.push(ch);
    }
    const total = merged.reduce((s, x) => s + x.length, 0);
    let t = SCENE_AT[id].from + VO_DELAY;
    const span = voSec[id] * 30;
    for (const m of merged) {
      const d = (m.length / total) * span;
      out.push({ from: Math.round(t), to: Math.round(t + d), text: m.replace(/[,:]$/, "") });
      t += d;
    }
  }
  return out;
})();

/* ── Layout + motion helpers ──────────────────────────────────────────── */

function useL() {
  const { width, height } = useVideoConfig();
  const portrait = height > width * 1.2;
  const square = !portrait && height > width * 0.8;
  const u = Math.min(width, height) / 1080;
  return { width, height, portrait, square, u };
}

function useIn(delay = 0, damping = 16, mass = 0.7) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass, stiffness: 140 } });
}

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const lerp = (f: number, a: number, b: number, from: number, to: number, e = ease) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

/** Wraps a scene: blur-rise in, lift-and-blur out. */
function SceneWrap({ dur, children }: { dur: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const { u } = useL();
  const inP = lerp(f, 0, 16, 0, 1);
  const outP = lerp(f, dur - 10, dur, 0, 1, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill
      style={{
        opacity: inP * (1 - outP),
        transform: `translateY(${(1 - inP) * 36 * u - outP * 24 * u}px) scale(${0.97 + 0.03 * inP + outP * 0.03})`,
        filter: `blur(${(1 - inP) * 10 + outP * 10}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/** Words rise in one by one. */
function Kinetic({ text, delay = 0, stagger = 3, size, color = c.paper, weight = 600, font = display, align = "center", italicWords = [] as string[], style }: {
  text: string; delay?: number; stagger?: number; size: number; color?: string; weight?: number; font?: string; align?: CSSProperties["textAlign"]; italicWords?: string[]; style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div style={{ fontFamily: font, fontSize: size, fontWeight: weight, color, lineHeight: 1.08, letterSpacing: "-0.02em", textAlign: align, ...style }}>
      {words.map((w, i) => {
        const p = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 15, mass: 0.6, stiffness: 150 } });
        const it = italicWords.includes(w.replace(/[^\w]/g, ""));
        return (
          <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * size * 0.45}px)`, filter: `blur(${(1 - p) * 6}px)`, marginRight: "0.24em", fontStyle: it ? "italic" : "normal", color: it ? c.brandSoft : color }}>
            {w}
          </span>
        );
      })}
    </div>
  );
}

const card = (u: number, extra: CSSProperties = {}): CSSProperties => ({
  background: c.paper, color: c.ink, borderRadius: 28 * u, boxShadow: `0 ${30 * u}px ${80 * u}px rgba(0,0,0,0.35), 0 ${2 * u}px ${6 * u}px rgba(0,0,0,0.2)`, fontFamily: sans, ...extra,
});

function Pill({ children, bg, fg, u, size = 22 }: { children: ReactNode; bg: string; fg: string; u: number; size?: number }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 8 * u, padding: `${6 * u}px ${16 * u}px`, borderRadius: 999, background: bg, color: fg, fontFamily: sans, fontWeight: 650, fontSize: size * u, whiteSpace: "nowrap" }}>{children}</span>;
}

function Fictional({ u, light = false }: { u: number; light?: boolean }) {
  return (
    <div style={{ position: "absolute", top: 34 * u, right: 38 * u, fontFamily: sans, fontSize: 18 * u, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: light ? c.muted : "rgba(250,248,244,0.55)", border: `1px solid ${light ? c.line : "rgba(250,248,244,0.25)"}`, borderRadius: 999, padding: `${6 * u}px ${14 * u}px` }}>
      Sample data · fictional
    </div>
  );
}

/* ── Background, transitions, captions ────────────────────────────────── */

function Background() {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const m = Math.max(width, height);
  const x1 = 30 + 10 * Math.sin(f / 90);
  const y1 = 25 + 8 * Math.cos(f / 110);
  const x2 = 75 + 8 * Math.cos(f / 100);
  const y2 = 80 + 6 * Math.sin(f / 80);
  return (
    <AbsoluteFill style={{ background: c.night }}>
      <AbsoluteFill style={{ background: `radial-gradient(${m * 0.55}px circle at ${x1}% ${y1}%, rgba(74,60,206,0.42), transparent 70%), radial-gradient(${m * 0.5}px circle at ${x2}% ${y2}%, rgba(13,122,104,0.22), transparent 70%)` }} />
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(250,248,244,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(250,248,244,0.035) 1px, transparent 1px)", backgroundSize: `${m / 24}px ${m / 24}px`, maskImage: "radial-gradient(circle at 50% 50%, black 30%, transparent 80%)" }} />
    </AbsoluteFill>
  );
}

/** A brand-coloured light sweep across each scene change. */
function Sweep() {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const boundaries = ORDER.slice(1).map(([id]) => SCENE_AT[id].from);
  const b = boundaries.find((x) => f >= x - 9 && f <= x + 9);
  if (b === undefined) return null;
  const p = (f - (b - 9)) / 18;
  const x = interpolate(p, [0, 1], [-0.4, 1.4], { easing: Easing.inOut(Easing.cubic) }) * width;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: x - width * 0.18, top: -height * 0.2, width: width * 0.36, height: height * 1.4, transform: "skewX(-18deg)", background: "linear-gradient(90deg, transparent, rgba(183,176,247,0.20), rgba(255,255,255,0.10), rgba(183,176,247,0.20), transparent)", filter: "blur(18px)" }} />
    </AbsoluteFill>
  );
}

function Captions() {
  const f = useCurrentFrame();
  const { u, portrait } = useL();
  const cap = V2_CAPTIONS.find((x) => f >= x.from && f < x.to);
  if (!cap) return null;
  const p = lerp(f, cap.from, cap.from + 6, 0, 1);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: (portrait ? 150 : 46) * u, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ maxWidth: portrait ? 900 * u : 1500 * u, padding: `${10 * u}px ${22 * u}px`, borderRadius: 14 * u, background: "rgba(12,17,33,0.72)", color: c.paper, fontFamily: sans, fontWeight: 560, fontSize: (portrait ? 34 : 30) * u, lineHeight: 1.3, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 8 * u}px)` }}>
        {cap.text}
      </div>
    </div>
  );
}

/* ── Scene 1: hook ────────────────────────────────────────────────────── */

function Hook() {
  const f = useCurrentFrame();
  const { u, portrait } = useL();
  const cardIn = useIn(22);
  const score = Math.round(lerp(f, 30, 75, 0, 142));
  const away = lerp(f, 112, 150, 0, 1, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 56 * u, padding: 80 * u }}>
      <Fictional u={u} />
      <Kinetic text="Every week, your batch takes a test." size={(portrait ? 84 : 92) * u} delay={4} style={{ maxWidth: portrait ? 900 * u : 1500 * u }} />
      <div style={{ position: "relative", height: 300 * u, width: portrait ? 860 * u : 900 * u }}>
        <div style={{ ...card(u, { position: "absolute", inset: 0, padding: `${34 * u}px ${48 * u}px`, display: "flex", alignItems: "center", justifyContent: "space-between" }), opacity: cardIn * (1 - away), transform: `translateX(${-away * 700 * u}px) rotate(${-away * 8}deg) scale(${0.9 + 0.1 * cardIn})`, filter: `blur(${away * 14}px)` }}>
          <div>
            <div style={{ fontSize: 26 * u, color: c.muted, fontWeight: 600 }}>Weekly test 7 · 11 JEE A</div>
            <div style={{ fontFamily: display, fontSize: 150 * u, fontWeight: 650, lineHeight: 1, marginTop: 8 * u, fontVariantNumeric: "tabular-nums" }}>{score}<span style={{ fontSize: 64 * u, color: c.muted }}> / 300</span></div>
          </div>
          <div style={{ fontSize: 90 * u }}>📋</div>
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: lerp(f, 118, 135, 0, 1) }}>
          <Kinetic text="…and everyone moves on." size={70 * u} delay={116} color={c.brandSoft} font={display} weight={500} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 2: problem ─────────────────────────────────────────────────── */

const CH5 = ["Kinematics", "Laws of motion", "Waves", "Optics", "Thermo"];
function Problem() {
  const f = useCurrentFrame();
  const { u, portrait } = useL();
  const hidden = [62, 48, 71, 35, 55];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 60 * u, padding: 80 * u }}>
      <Kinetic text="Which chapter lost the marks?" size={(portrait ? 84 : 96) * u} delay={2} italicWords={["chapter"]} style={{ maxWidth: portrait ? 900 * u : 1600 * u }} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: (portrait ? 26 : 46) * u, height: 360 * u }}>
        {CH5.map((ch, i) => {
          const p = spring({ frame: f - 14 - i * 4, fps: 30, config: { damping: 13, mass: 0.6 } });
          const wobble = Math.sin((f + i * 11) / 7) * 6 * u;
          return (
            <div key={ch} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * u }}>
              <div style={{ position: "relative", width: (portrait ? 128 : 150) * u, height: (hidden[i]! * 4 + 60) * u * p + wobble }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 18 * u, background: "linear-gradient(180deg, rgba(183,176,247,0.55), rgba(74,60,206,0.35))", filter: "blur(5px)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display, fontSize: 72 * u, color: c.paper, opacity: p }}>?</div>
              </div>
              <div style={{ fontFamily: sans, fontSize: (portrait ? 22 : 26) * u, color: "rgba(250,248,244,0.7)", fontWeight: 560 }}>{ch}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14 * u, opacity: lerp(f, 60, 80, 0, 1), flexWrap: "wrap", justifyContent: "center" }}>
        {["R03", "R11", "R17", "R24", "R31"].map((r, i) => (
          <Pill key={r} u={u} bg="rgba(250,248,244,0.08)" fg="rgba(250,248,244,0.6)" size={26}>{r} <span style={{ opacity: lerp(f, 70 + i * 4, 80 + i * 4, 0, 1) }}>?</span></Pill>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 3: the aha (paste → plan) ──────────────────────────────────── */

const MARKS = [
  ["R01", 6, 15, 17], ["R02", 8, 9, 18], ["R03", 14, 7, 16], ["R04", 5, 16, 19], ["R05", 9, 14, 15], ["R06", 7, 12, 17],
] as const;

function Aha() {
  const f = useCurrentFrame();
  const { u, portrait } = useL();
  const press = f >= 92 && f < 100;
  const analysed = f >= 100;
  const table = (
    <div style={{ ...card(u, { padding: 30 * u, width: (portrait ? 860 : 700) * u }) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 * u }}>
        <div style={{ fontWeight: 700, fontSize: 28 * u }}>Paste marks</div>
        <Pill u={u} bg="#EEF0F6" fg={c.muted} size={18}>from Excel · OMR · Google Sheet</Pill>
      </div>
      <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 26 * u, lineHeight: 1.6, color: c.inkSoft }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.3fr", color: c.muted, fontWeight: 700 }}><span>Roll</span><span>Optics</span><span>Waves</span><span>Kinematics</span></div>
        {MARKS.map((r, i) => {
          const t = lerp(f, 8 + i * 9, 14 + i * 9, 0, 1, Easing.linear);
          return (
            <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.3fr", opacity: t, transform: `translateX(${(1 - t) * -12 * u}px)` }}>
              {r.map((x, j) => <span key={j}>{x}</span>)}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 20 * u, display: "flex", alignItems: "center", gap: 18 * u }}>
        <div style={{ background: analysed ? c.good : c.brand, color: "white", borderRadius: 999, padding: `${12 * u}px ${30 * u}px`, fontWeight: 700, fontSize: 26 * u, transform: `scale(${press ? 0.93 : 1})`, boxShadow: press ? "none" : `0 ${8 * u}px ${20 * u}px rgba(74,60,206,0.4)` }}>
          {analysed ? "Analysed ✓" : "Analyse class"}
        </div>
        <div style={{ fontSize: 22 * u, color: c.muted }}>{analysed ? "in 0.4 s" : ""}</div>
      </div>
    </div>
  );
  const plans: Array<[string, string, string, string, string]> = [
    ["Reteach whole class", "Optics", "class average 41%", c.gap, "#FDE8EC"],
    ["Small-group recap", "Waves", "R02 · R03 (below 50%)", c.warn, "#FEF1E1"],
    ["Maintain", "Kinematics", "class average 85%", c.good, "#E0F3EE"],
  ];
  const cards = (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 * u, width: (portrait ? 860 : 720) * u }}>
      {plans.map(([label, ch, sub, fg, bg], i) => {
        const p = spring({ frame: f - 110 - i * 14, fps: 30, config: { damping: 12, mass: 0.6, stiffness: 160 } });
        return (
          <div key={label} style={{ ...card(u, { padding: `${24 * u}px ${30 * u}px`, display: "flex", alignItems: "center", gap: 24 * u, borderLeft: `${10 * u}px solid ${fg}` }), opacity: p, transform: `translateY(${(1 - p) * 60 * u}px) scale(${0.85 + 0.15 * p})` }}>
            <div style={{ flex: 1 }}>
              <Pill u={u} bg={bg} fg={fg} size={20}>{label}</Pill>
              <div style={{ fontFamily: display, fontSize: 52 * u, fontWeight: 650, marginTop: 8 * u }}>{ch}</div>
              <div style={{ fontSize: 24 * u, color: c.muted, marginTop: 2 * u }}>{sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: (portrait ? 40 : 46) * u, padding: 60 * u }}>
      <Fictional u={u} />
      <Kinetic text="Paste marks. Get a teaching plan." size={(portrait ? 70 : 76) * u} delay={2} italicWords={["teaching", "plan."]} />
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: 44 * u, alignItems: portrait ? "center" : "flex-start" }}>
        {table}
        {portrait && f < 105 ? null : cards}
      </div>
      <div style={{ position: "absolute", top: portrait ? 260 * u : 70 * u, left: portrait ? undefined : 70 * u, opacity: lerp(f, 150, 166, 0, 1), transform: `rotate(-4deg) scale(${lerp(f, 150, 166, 0.6, 1)})` }}>
        <Pill u={u} bg={c.brand} fg="white" size={26}>⏱ under a minute</Pill>
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 4: student report, English → Hindi ─────────────────────────── */

function Phone({ u, children, scale = 1 }: { u: number; children: ReactNode; scale?: number }) {
  const w = 430 * u * scale;
  return (
    <div style={{ width: w, height: w * 2.05, borderRadius: 64 * u * scale, background: "#05070E", padding: 14 * u * scale, boxShadow: `0 ${40 * u}px ${100 * u}px rgba(0,0,0,0.5)` }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 52 * u * scale, background: c.paper, overflow: "hidden", position: "relative" }}>{children}</div>
    </div>
  );
}

function Report() {
  const f = useCurrentFrame();
  const { u, portrait } = useL();
  const hi = f >= 96;
  const flip = lerp(f, 90, 102, 0, 1);
  const phoneIn = useIn(6);
  const rows: Array<[string, number]> = [["Kinematics", 80], ["Optics", 70], ["Waves", 35]];
  const t = (en: string, h: string) => (hi ? <span style={{ fontFamily: deva }}>{h}</span> : en);
  const phone = (
    <div style={{ transform: `translateY(${(1 - phoneIn) * 200 * u}px) rotate(${(1 - phoneIn) * 6}deg)`, opacity: phoneIn }}>
      <Phone u={u} scale={portrait ? 1.15 : 0.95}>
        <div style={{ background: c.brand, color: "white", padding: `${60 * u}px ${30 * u}px ${24 * u}px` }}>
          <div style={{ fontSize: 18 * u, opacity: 0.8, fontWeight: 600 }}>Prayagraj Science Classes</div>
          <div style={{ fontFamily: hi ? deva : display, fontSize: 38 * u, fontWeight: 650, marginTop: 6 * u }}>{t("Progress report", "प्रगति रिपोर्ट")}</div>
          <div style={{ fontSize: 20 * u, opacity: 0.85, marginTop: 4 * u }}>Roll R03 · Weekly test 7</div>
        </div>
        <div style={{ padding: `${26 * u}px ${30 * u}px`, display: "flex", flexDirection: "column", gap: 20 * u, opacity: 1 - 0.6 * Math.sin(flip * Math.PI) }}>
          {rows.map(([ch, v], i) => {
            const grow = lerp(f, 20 + i * 8, 50 + i * 8, 0, v);
            const col = v < 50 ? c.gap : v < 75 ? c.warn : c.good;
            return (
              <div key={ch}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22 * u, fontWeight: 600 }}><span>{ch}</span><span style={{ color: col }}>{Math.round(grow)}%</span></div>
                <div style={{ height: 14 * u, borderRadius: 99, background: "#ECE8DF", marginTop: 6 * u }}><div style={{ width: `${grow}%`, height: "100%", borderRadius: 99, background: col }} /></div>
              </div>
            );
          })}
          <div style={{ marginTop: 6 * u, padding: 18 * u, borderRadius: 18 * u, background: "#FEF1E1", fontSize: 21 * u, lineHeight: 1.4, color: c.ink }}>
            <b>{t("Next step:", "अगला कदम:")}</b>{" "}
            {t("revise Waves in Thursday's small group.", "गुरुवार के छोटे समूह में Waves दोहराएँ।")}
          </div>
        </div>
      </Phone>
    </div>
  );
  const toggleP = lerp(f, 88, 100, 0, 1);
  const side = (
    <div style={{ display: "flex", flexDirection: "column", gap: 34 * u, alignItems: portrait ? "center" : "flex-start", maxWidth: 760 * u }}>
      <Kinetic text="A report for every student." size={(portrait ? 70 : 82) * u} delay={4} align={portrait ? "center" : "left"} italicWords={["every"]} />
      <div style={{ display: "flex", alignItems: "center", gap: 18 * u, fontFamily: sans, fontSize: 32 * u, fontWeight: 650, color: c.paper, opacity: lerp(f, 30, 45, 0, 1) }}>
        <span style={{ opacity: 1 - 0.6 * toggleP }}>English</span>
        <div style={{ width: 96 * u, height: 52 * u, borderRadius: 99, background: toggleP > 0.5 ? c.brand : "rgba(250,248,244,0.25)", position: "relative" }}>
          <div style={{ position: "absolute", top: 6 * u, left: (6 + 44 * toggleP) * u, width: 40 * u, height: 40 * u, borderRadius: 99, background: "white" }} />
        </div>
        <span style={{ fontFamily: deva, opacity: 0.4 + 0.6 * toggleP }}>हिंदी</span>
      </div>
      <div style={{ opacity: lerp(f, 132, 145, 0, 1), transform: `scale(${spring({ frame: f - 132, fps: 30, config: { damping: 10 } })})` }}>
        <Pill u={u} bg="#25D366" fg="#06270F" size={30}>✓ Sent on WhatsApp</Pill>
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: portrait ? "column" : "row", gap: (portrait ? 50 : 120) * u, padding: 70 * u }}>
      <Fictional u={u} />
      {portrait ? <>{side}{phone}</> : <>{side}{phone}</>}
    </AbsoluteFill>
  );
}

/* ── Scene 5: test builder (sets → seating → online → key alarm) ──────── */

function Builder() {
  const f = useCurrentFrame();
  const { u, portrait } = useL();
  const beat = f < 85 ? 0 : f < 165 ? 1 : f < 235 ? 2 : 3;
  const local = [0, 85, 165, 235][beat]!;
  const inP = lerp(f, local, local + 12, 0, 1);
  const labels = ["Shuffled sets A · B · C", "Every seat, a different set", "Online, on any phone", "Catches a wrong answer key"];
  let body: ReactNode = null;
  if (beat === 0) {
    body = (
      <div style={{ position: "relative", width: 900 * u, height: 470 * u }}>
        {["A", "B", "C"].map((s, i) => {
          const p = spring({ frame: f - 14 - i * 8, fps: 30, config: { damping: 13, mass: 0.7 } });
          const x = (i - 1) * 290 * u * p;
          return (
            <div key={s} style={{ ...card(u, { position: "absolute", left: 450 * u - 130 * u + x, top: 30 * u, width: 260 * u, height: 360 * u, padding: 24 * u }), transform: `rotate(${(i - 1) * 7 * p}deg)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 22 * u }}><span>Weekly test 8</span><span style={{ color: c.brand }}>Set {s}</span></div>
              {[0, 1, 2, 3, 4, 5].map((k) => <div key={k} style={{ height: 12 * u, borderRadius: 6, background: "#E6E1D6", marginTop: 22 * u, width: `${60 + (((k + i) * 37) % 35)}%` }} />)}
            </div>
          );
        })}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", fontFamily: sans, fontSize: 26 * u, color: "rgba(250,248,244,0.7)", opacity: lerp(f, 40, 55, 0, 1) }}>from your own question bank · by chapter and difficulty</div>
      </div>
    );
  } else if (beat === 1) {
    const sets = ["A", "B", "C"];
    const colsN = 4;
    body = (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${colsN}, ${150 * u}px)`, gap: 22 * u }}>
        {Array.from({ length: 12 }, (_, i) => {
          const p = spring({ frame: f - 92 - i * 3, fps: 30, config: { damping: 12, mass: 0.5 } });
          const s = sets[i % 3]!;
          const col = s === "A" ? c.brand : s === "B" ? c.good : c.warn;
          return (
            <div key={i} style={{ ...card(u, { height: 110 * u, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderTop: `${8 * u}px solid ${col}` }), opacity: p, transform: `scale(${0.6 + 0.4 * p})` }}>
              <div style={{ fontSize: 20 * u, color: c.muted, fontWeight: 600 }}>R{String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: display, fontSize: 44 * u, fontWeight: 700, color: col }}>{s}</div>
            </div>
          );
        })}
      </div>
    );
  } else if (beat === 2) {
    const mm = Math.max(0, 14 - Math.floor((f - 165) / 30));
    const code = f > 205;
    body = (
      <div style={{ display: "flex", alignItems: "center", gap: 60 * u, flexDirection: portrait ? "column" : "row" }}>
        <Phone u={u} scale={portrait ? 0.9 : 0.78}>
          <div style={{ padding: `${56 * u}px ${26 * u}px`, fontFamily: sans }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20 * u, color: c.muted, fontWeight: 600 }}><span>Set B · Roll R07</span><span style={{ color: c.ink }}>{mm}:{String(59 - ((f - 165) % 60)).padStart(2, "0")}</span></div>
            <div style={{ fontSize: 24 * u, fontWeight: 650, marginTop: 20 * u, lineHeight: 1.35 }}>4. A convex lens forms a real image when the object is…</div>
            {["inside the focal length", "beyond the focal point", "at the optical centre", "at infinity only"].map((o, k) => (
              <div key={o} style={{ marginTop: 14 * u, padding: `${12 * u}px ${16 * u}px`, borderRadius: 14 * u, border: `2px solid ${k === 1 && f > 182 ? c.brand : "#DDD8CC"}`, background: k === 1 && f > 182 ? "#ECEAFD" : "white", fontSize: 20 * u }}>({"abcd"[k]}) {o}</div>
            ))}
          </div>
        </Phone>
        <div style={{ opacity: code ? 1 : 0, transform: `translateX(${code ? 0 : -40 * u}px)`, display: "flex", flexDirection: "column", gap: 18 * u, maxWidth: 520 * u }}>
          <Pill u={u} bg="#25D366" fg="#06270F" size={26}>Code sent on WhatsApp</Pill>
          <div style={{ fontFamily: "ui-monospace, Menlo, monospace", color: c.brandSoft, fontSize: 28 * u }}>HR1.eyJwIjoiN2Ji…k3f2</div>
          <div style={{ fontFamily: sans, color: "rgba(250,248,244,0.7)", fontSize: 24 * u }}>No app. No login. The answer key never leaves the teacher's phone.</div>
        </div>
      </div>
    );
  } else {
    const pulse = 0.5 + 0.5 * Math.sin((f - 235) / 4);
    body = (
      <div style={{ ...card(u, { width: (portrait ? 880 : 1100) * u, padding: 40 * u, border: `${4 * u}px solid ${c.gap}`, boxShadow: `0 0 ${(30 + 30 * pulse) * u}px rgba(180,35,64,${0.35 + 0.25 * pulse}), 0 ${30 * u}px ${80 * u}px rgba(0,0,0,0.4)` }) }}>
        <Pill u={u} bg="#FDE8EC" fg={c.gap} size={24}>⚠ Check the answer key</Pill>
        <div style={{ fontFamily: display, fontSize: 64 * u, fontWeight: 650, marginTop: 16 * u }}>Q7: 31 of 40 chose (c)</div>
        <div style={{ fontSize: 30 * u, color: c.muted, marginTop: 8 * u }}>Your key says (b). Fix it before marks reach parents.</div>
        <div style={{ display: "flex", gap: 14 * u, marginTop: 26 * u, alignItems: "flex-end", height: 120 * u }}>
          {[["a", 3], ["b", 6], ["c", 31], ["d", 0]].map(([l, n]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * u }}>
              <div style={{ width: 90 * u, height: (Number(n) / 31) * 100 * u * lerp(f, 240, 262, 0, 1) + 4 * u, borderRadius: 10 * u, background: l === "c" ? c.gap : l === "b" ? c.brand : "#D9D3C6" }} />
              <div style={{ fontSize: 22 * u, fontWeight: 700 }}>({l}) {n}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 44 * u, padding: 60 * u }}>
      <Fictional u={u} />
      <Kinetic text="Make the test on Heramb too." size={(portrait ? 66 : 74) * u} delay={2} italicWords={["test"]} />
      <div style={{ fontFamily: sans, fontSize: 34 * u, fontWeight: 650, color: c.brandSoft, opacity: inP, transform: `translateY(${(1 - inP) * 14 * u}px)` }}>
        {beat + 1}/4 · {labels[beat]}
      </div>
      <div style={{ opacity: inP, transform: `scale(${0.94 + 0.06 * inP})`, filter: `blur(${(1 - inP) * 8}px)` }}>{body}</div>
    </AbsoluteFill>
  );
}

/* ── Scene 6: proof ───────────────────────────────────────────────────── */

function Proof() {
  const f = useCurrentFrame();
  const { u, portrait } = useL();
  const after = lerp(f, 50, 100, 41, 68);
  const W = (portrait ? 820 : 1100) * u;
  const badge = spring({ frame: f - 102, fps: 30, config: { damping: 9, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 54 * u, padding: 80 * u }}>
      <Fictional u={u} />
      <Kinetic text="Did the reteaching work?" size={(portrait ? 80 : 92) * u} delay={2} italicWords={["work?"]} />
      <div style={{ ...card(u, { width: W + 80 * u, padding: 40 * u }) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontFamily: display, fontSize: 54 * u, fontWeight: 650 }}>Optics · 11 JEE A</div>
          <div style={{ opacity: badge, transform: `scale(${badge})` }}><Pill u={u} bg="#E0F3EE" fg={c.good} size={30}>▲ +27 points</Pill></div>
        </div>
        {[["Test 7 (before)", 41, "#B9B2A3"], ["Test 8 (after reteach)", after, c.good]].map(([label, v, col], i) => (
          <div key={String(label)} style={{ marginTop: 28 * u, opacity: i === 0 ? lerp(f, 14, 26, 0, 1) : lerp(f, 44, 54, 0, 1) }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28 * u, fontWeight: 600, color: c.inkSoft }}><span>{label}</span><span style={{ fontVariantNumeric: "tabular-nums", color: String(col) }}>{Math.round(Number(v))}%</span></div>
            <div style={{ height: 30 * u, borderRadius: 99, background: "#ECE8DF", marginTop: 10 * u }}>
              <div style={{ width: `${i === 0 ? lerp(f, 14, 40, 0, 41) : after}%`, height: "100%", borderRadius: 99, background: String(col) }} />
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 7: head dashboard ──────────────────────────────────────────── */

function Head() {
  const { u, portrait } = useL();
  const f = useCurrentFrame();
  const batches: Array<[string, string, string, string]> = [
    ["11 JEE A", "Optics", "41% → 68% ▲", c.good],
    ["11 JEE B", "Waves", "52% · reteach planned", c.warn],
    ["12 NEET", "Human physiology", "47% · reteach planned", c.gap],
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 50 * u, padding: 70 * u }}>
      <Fictional u={u} />
      <Kinetic text="Every batch. One screen." size={(portrait ? 80 : 92) * u} delay={2} italicWords={["One"]} />
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: 28 * u }}>
        {batches.map(([b, ch, s, col], i) => {
          const p = spring({ frame: f - 12 - i * 7, fps: 30, config: { damping: 12, mass: 0.6 } });
          return (
            <div key={b} style={{ ...card(u, { width: (portrait ? 820 : 520) * u, padding: 32 * u, borderTop: `${10 * u}px solid ${col}` }), opacity: p, transform: `translateY(${(1 - p) * 80 * u}px)` }}>
              <div style={{ fontSize: 26 * u, color: c.muted, fontWeight: 650 }}>{b}</div>
              <div style={{ fontSize: 22 * u, color: c.muted, marginTop: 14 * u }}>Weakest chapter</div>
              <div style={{ fontFamily: display, fontSize: 46 * u, fontWeight: 650 }}>{ch}</div>
              <div style={{ fontSize: 26 * u, fontWeight: 650, color: col, marginTop: 8 * u }}>{s}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 8: call to action ──────────────────────────────────────────── */

function Cta() {
  const f = useCurrentFrame();
  const { u, portrait } = useL();
  const logo = useIn(4, 12, 0.8);
  const shine = lerp(f, 10, 50, -30, 130);
  const pills = ["Free", "No login", "Marks stay on your device"];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 * u, padding: 70 * u }}>
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: (portrait ? 130 : 150) * u, letterSpacing: "-0.03em", transform: `scale(${0.8 + 0.2 * logo})`, opacity: logo, background: `linear-gradient(100deg, ${c.paper} ${shine - 20}%, ${c.brandSoft} ${shine}%, ${c.paper} ${shine + 20}%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
        Heramb<span style={{ color: "transparent" }}>.study</span>
      </div>
      <Kinetic text="Progress, made visible." size={(portrait ? 54 : 58) * u} delay={22} weight={450} italicWords={["visible."]} />
      <div style={{ display: "flex", gap: 16 * u, flexWrap: "wrap", justifyContent: "center" }}>
        {pills.map((p, i) => {
          const s = spring({ frame: f - 60 - i * 8, fps: 30, config: { damping: 11, mass: 0.5 } });
          return <span key={p} style={{ opacity: s, transform: `scale(${s})`, display: "inline-block" }}><Pill u={u} bg="rgba(250,248,244,0.1)" fg={c.paper} size={30}>{p}</Pill></span>;
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 40 * u, marginTop: 10 * u, opacity: lerp(f, 110, 130, 0, 1), transform: `translateY(${lerp(f, 110, 130, 30, 0) * u}px)`, flexDirection: portrait ? "column" : "row" }}>
        <div style={{ background: "white", padding: 14 * u, borderRadius: 22 * u }}>
          <Img src={staticFile("heramb-qr.png")} style={{ width: 200 * u, height: 200 * u, display: "block" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 * u, alignItems: portrait ? "center" : "flex-start" }}>
          <div style={{ fontFamily: sans, fontWeight: 750, fontSize: 60 * u, color: c.paper }}>herambstudy.com</div>
          <div style={{ fontFamily: sans, fontSize: 28 * u, color: c.brandSoft, fontWeight: 600 }}>Try it on your last test. Founding seats for the first 50 institutes.</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 34 * u, fontFamily: sans, fontSize: 18 * u, color: "rgba(250,248,244,0.45)", opacity: lerp(f, 140, 160, 0, 1) }}>
        Sample data in this video is fictional. Voiceover is AI-generated.
      </div>
    </AbsoluteFill>
  );
}

/* ── Sound design ─────────────────────────────────────────────────────── */

const SFX: Array<[number, string, number]> = (() => {
  const at = (id: SceneId, f: number) => SCENE_AT[id].from + f;
  const out: Array<[number, string, number]> = [];
  for (const [id] of ORDER.slice(1)) out.push([SCENE_AT[id].from - 10, "whoosh", 0.35]);
  out.push([at("hook", 22), "pop", 0.35], [at("hook", 112), "whoosh", 0.25]);
  out.push([at("aha", 6), "typing", 0.4], [at("aha", 92), "click", 0.6], [at("aha", 110), "chime", 0.35], [at("aha", 124), "pop", 0.3], [at("aha", 138), "pop", 0.3]);
  out.push([at("report", 90), "click", 0.5], [at("report", 132), "pop", 0.4]);
  out.push([at("builder", 14), "pop", 0.3], [at("builder", 22), "pop", 0.3], [at("builder", 30), "pop", 0.3], [at("builder", 92), "typing", 0.3], [at("builder", 182), "click", 0.5], [at("builder", 205), "pop", 0.4], [at("builder", 236), "impact", 0.22]);
  out.push([at("proof", 100), "chime", 0.4]);
  out.push([at("head", 12), "pop", 0.3], [at("head", 19), "pop", 0.3], [at("head", 26), "pop", 0.3]);
  out.push([at("cta", -40), "riser", 0.35], [at("cta", 2), "impact", 0.55]);
  return out;
})();

/** Music volume: −3 dB under nothing, ducked under each voice line, faded at the end. */
function musicVolume(f: number): number {
  let v = 0.34;
  for (const [id] of ORDER) {
    const s = SCENE_AT[id].from + VO_DELAY;
    const e = s + voSec[id] * 30;
    const duck = interpolate(f, [s - 8, s, e, e + 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    v = Math.min(v, 0.34 - 0.2 * duck);
  }
  const fadeIn = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(f, [V2_FRAMES - 75, V2_FRAMES], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return v * fadeIn * fadeOut;
}

/* ── Composition ──────────────────────────────────────────────────────── */

const SCENE_COMPONENTS: Record<SceneId, () => ReactNode> = { hook: Hook, problem: Problem, aha: Aha, report: Report, builder: Builder, proof: Proof, head: Head, cta: Cta };

export const LaunchV2 = ({ withVoice, withMusic, captions }: LaunchV2Props) => (
  <AbsoluteFill style={{ background: c.night }}>
    <Background />
    {ORDER.map(([id, dur]) => {
      const S = SCENE_COMPONENTS[id];
      return (
        <Sequence key={id} from={SCENE_AT[id].from} durationInFrames={dur} name={id}>
          <SceneWrap dur={dur}><S /></SceneWrap>
          {withVoice ? <Sequence from={VO_DELAY} name={`vo-${id}`}><Audio src={staticFile(`vo/${id}.wav`)} volume={1} /></Sequence> : null}
        </Sequence>
      );
    })}
    <Sweep />
    {captions ? <Captions /> : null}
    {withMusic ? <Audio src={staticFile("audio/music.wav")} volume={(f) => musicVolume(f)} /> : null}
    {withMusic ? SFX.map(([at, name, vol], i) => (
      <Sequence key={i} from={Math.max(0, at)} durationInFrames={90} name={`sfx-${name}`}>
        <Audio src={staticFile(`audio/${name}.wav`)} volume={vol} />
      </Sequence>
    )) : null}
  </AbsoluteFill>
);
