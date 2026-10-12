import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CAPTIONS, colors, display, sans, SCENES } from "./theme";

export type LaunchVideoProps = {
  /** Plays public/voiceover.mp3. Supply an owner-licensed recording; see video/README.md. */
  withAudio: boolean;
  siteLabel: string;
};

/** Layout helpers that adapt to 16:9, 9:16 and 1:1. */
function useLayout() {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  return { u, portrait: height > width * 1.2, width, height };
}

const ease = Easing.bezier(0.22, 1, 0.36, 1);

function fadeUp(frame: number, start: number, dur = 18): CSSProperties {
  const p = interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return { opacity: p, transform: `translateY(${(1 - p) * 24}px)` };
}

function SceneFade({ children, duration }: { children: ReactNode; duration: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, duration - 12, duration], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

/* ── Scene 1: the problem ─────────────────────────────────────────────── */
function Problem() {
  const frame = useCurrentFrame();
  const { u } = useLayout();
  const students = Array.from({ length: 28 });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 56 * u, padding: 80 * u }}>
      <div style={{ ...fadeUp(frame, 6), fontFamily: display, color: "#fff", fontSize: 76 * u, lineHeight: 1.1, textAlign: "center", maxWidth: 1400 * u }}>
        Test finished. <span style={{ color: colors.brandSoft }}>Now what?</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 22 * u }}>
        {students.map((_, i) => {
          const appear = interpolate(frame, [20 + i * 2, 32 + i * 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const q = interpolate(frame, [120 + (i % 7) * 4, 140 + (i % 7) * 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ width: 64 * u, height: 64 * u, borderRadius: 999, background: colors.nightRaised, border: `${2 * u}px solid rgba(255,255,255,0.18)`, opacity: appear, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontSize: 28 * u, color: colors.brandSoft }}>
              <span style={{ opacity: q }}>?</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 2: the insight ─────────────────────────────────────────────── */
function Insight() {
  const frame = useCurrentFrame();
  const { u, portrait } = useLayout();
  const split = interpolate(frame, [70, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const student = (name: string, parts: Array<{ label: string; color: string; w: number }>, delay: number) => (
    <div style={{ ...fadeUp(frame, delay), background: colors.nightRaised, borderRadius: 28 * u, padding: 36 * u, width: 640 * u, border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: sans, color: "#fff", fontSize: 30 * u }}>
        <span>{name}</span>
        <span style={{ fontWeight: 600 }}>58%</span>
      </div>
      <div style={{ marginTop: 24 * u, height: 22 * u, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", display: "flex" }}>
        <div style={{ width: "58%", background: colors.brandSoft, opacity: 1 - split * 0.6 }} />
      </div>
      <div style={{ marginTop: 22 * u, display: "flex", gap: 12 * u, opacity: split }}>
        {parts.map((p) => (
          <div key={p.label} style={{ flex: p.w, background: p.color, color: "#fff", borderRadius: 12 * u, padding: `${10 * u}px ${14 * u}px`, fontFamily: sans, fontSize: 22 * u }}>
            {p.label}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 48 * u, padding: 80 * u }}>
      <div style={{ ...fadeUp(frame, 0), fontFamily: display, color: "#fff", fontSize: 68 * u, textAlign: "center", lineHeight: 1.1 }}>
        Same score. <span style={{ color: colors.brandSoft }}>Different reasons.</span>
      </div>
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: 36 * u }}>
        {student("Student A (fictional)", [{ label: "Concept gap", color: colors.gap, w: 2 }, { label: "Careless", color: colors.warn, w: 1 }], 20)}
        {student("Student B (fictional)", [{ label: "Time pressure", color: colors.warn, w: 2 }, { label: "Misread", color: colors.inkSoft, w: 1 }], 32)}
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 3: the workflow ────────────────────────────────────────────── */
const STEPS = ["Assess", "Diagnose", "Practise", "Verify", "Improve"];
function Workflow() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u: base, portrait, width } = useLayout();
  // A horizontal row of five steps needs ~1800px; shrink it on square frames.
  const u = portrait ? base : base * Math.min(1, width / 1800);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 64 * u, padding: 80 * u }}>
      <div style={{ ...fadeUp(frame, 0), fontFamily: sans, color: colors.brandSoft, fontSize: 26 * u, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>
        One loop, every cycle
      </div>
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", gap: 20 * u }}>
        {STEPS.map((s, i) => {
          const start = 20 + i * 42;
          const sp = spring({ frame: frame - start, fps, config: { damping: 200 } });
          const active = frame >= start && frame < start + 42;
          return (
            <div key={s} style={{ display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", gap: 20 * u }}>
              <div style={{ opacity: sp, transform: `scale(${0.9 + sp * 0.1})`, background: active ? colors.brand : colors.nightRaised, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24 * u, padding: `${26 * u}px ${34 * u}px`, minWidth: 220 * u, textAlign: "center" }}>
                <div style={{ fontFamily: sans, fontSize: 20 * u, color: "rgba(255,255,255,0.55)", letterSpacing: "0.12em" }}>STEP {i + 1}</div>
                <div style={{ fontFamily: display, fontSize: 46 * u, color: "#fff", marginTop: 6 * u }}>{s}</div>
              </div>
              {i < STEPS.length - 1 ? (
                <div style={{ width: portrait ? 2 * u : 40 * u * sp, height: portrait ? 28 * u * sp : 2 * u, background: "rgba(255,255,255,0.3)" }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 4: the product (concept UI, clearly labelled) ──────────────── */
const TOPICS = [
  { t: "Kinematics", a: 82, b: 85 },
  { t: "Laws of motion", a: 68, b: 77 },
  { t: "Work, energy & power", a: 59, b: 71 },
  { t: "Rotational motion", a: 41, b: 63 },
  { t: "Gravitation", a: 74, b: 72 },
];
const tone = (v: number) => (v >= 75 ? colors.good : v >= 50 ? colors.warn : colors.gap);

function Product() {
  const frame = useCurrentFrame();
  const { u: base, portrait } = useLayout();
  // Larger type in the vertical cut, where the card is viewed on a phone.
  const u = portrait ? base * 1.3 : base;
  const progress = interpolate(frame, [150, 210], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const highlight = interpolate(frame, [60, 80, 140, 150], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70 * u, background: colors.paper }}>
      <div style={{ ...fadeUp(frame, 0, 22), width: portrait ? "100%" : Math.min(1100 * u, 980), maxWidth: "100%", background: "#fff", borderRadius: 32 * u, border: `1px solid ${colors.line}`, boxShadow: "0 40px 80px -40px rgba(14,21,40,0.35)", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${22 * u}px ${32 * u}px`, borderBottom: `1px solid ${colors.line}`, background: "#F3F0E9", fontFamily: sans }}>
          <span style={{ fontSize: 26 * u, fontWeight: 600, color: colors.ink }}>Aarav · Physics</span>
          <span style={{ fontSize: 20 * u, color: colors.warn, background: "#FCEFDC", borderRadius: 999, padding: `${6 * u}px ${14 * u}px` }}>Concept UI · fictional data</span>
        </div>
        <div style={{ padding: 32 * u, display: "flex", flexDirection: "column", gap: 22 * u }}>
          {TOPICS.map((x) => {
            const v = Math.round(x.a + (x.b - x.a) * progress);
            const hl = x.t === "Rotational motion" ? highlight : 0;
            return (
              <div key={x.t} style={{ fontFamily: sans, borderRadius: 14 * u, padding: 8 * u, background: `rgba(180,35,64,${0.1 * hl})` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 * u, color: colors.inkSoft }}>
                  <span>{x.t}</span>
                  <span style={{ fontWeight: 600, color: colors.ink }}>{v}%</span>
                </div>
                <div style={{ marginTop: 10 * u, height: 14 * u, borderRadius: 999, background: "#F3F0E9", overflow: "hidden" }}>
                  <div style={{ width: `${v}%`, height: "100%", borderRadius: 999, background: tone(v) }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 5: the invitation ──────────────────────────────────────────── */
function Invite({ siteLabel }: { siteLabel: string }) {
  const frame = useCurrentFrame();
  const { u } = useLayout();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36 * u, padding: 80 * u, textAlign: "center" }}>
      <svg width={120 * u} height={120 * u} viewBox="0 0 40 40" style={fadeUp(frame, 0)}>
        <rect width="40" height="40" rx="11" fill={colors.brand} />
        <rect x="9" y="21" width="5" height="10" rx="2.5" fill="#fff" fillOpacity="0.55" />
        <rect x="17.5" y="15" width="5" height="16" rx="2.5" fill="#fff" fillOpacity="0.8" />
        <rect x="26" y="17" width="5" height="14" rx="2.5" fill="#fff" />
        <circle cx="28.5" cy="10.5" r="3" fill="#fff" />
      </svg>
      <div style={{ ...fadeUp(frame, 10), fontFamily: display, color: "#fff", fontSize: 92 * u, lineHeight: 1.05 }}>
        Progress, <span style={{ color: colors.brandSoft }}>made visible.</span>
      </div>
      <div style={{ ...fadeUp(frame, 24), fontFamily: sans, color: "rgba(255,255,255,0.75)", fontSize: 34 * u }}>
        Invite-only early access · {siteLabel}
      </div>
    </AbsoluteFill>
  );
}

function Captions() {
  const frame = useCurrentFrame();
  const { u: base, portrait } = useLayout();
  const u = portrait ? base * 1.35 : base;
  const cue = CAPTIONS.find((c) => frame >= c.from && frame < c.to);
  if (!cue) return null;
  const opacity = interpolate(frame, [cue.from, cue.from + 6, cue.to - 6, cue.to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 64 * u }}>
      <div style={{ opacity, maxWidth: "86%", background: "rgba(8,11,22,0.82)", color: "#fff", fontFamily: sans, fontSize: 34 * u, lineHeight: 1.35, padding: `${14 * u}px ${26 * u}px`, borderRadius: 14 * u, textAlign: "center" }}>
        {cue.text}
      </div>
    </AbsoluteFill>
  );
}

export function LaunchVideo({ withAudio, siteLabel }: LaunchVideoProps) {
  return (
    <AbsoluteFill style={{ background: colors.night }}>
      <Sequence from={SCENES.problem.from} durationInFrames={SCENES.problem.duration}>
        <SceneFade duration={SCENES.problem.duration}><Problem /></SceneFade>
      </Sequence>
      <Sequence from={SCENES.insight.from} durationInFrames={SCENES.insight.duration}>
        <SceneFade duration={SCENES.insight.duration}><Insight /></SceneFade>
      </Sequence>
      <Sequence from={SCENES.workflow.from} durationInFrames={SCENES.workflow.duration}>
        <SceneFade duration={SCENES.workflow.duration}><Workflow /></SceneFade>
      </Sequence>
      <Sequence from={SCENES.product.from} durationInFrames={SCENES.product.duration}>
        <SceneFade duration={SCENES.product.duration}><Product /></SceneFade>
      </Sequence>
      <Sequence from={SCENES.invite.from} durationInFrames={SCENES.invite.duration}>
        <SceneFade duration={SCENES.invite.duration}><Invite siteLabel={siteLabel} /></SceneFade>
      </Sequence>
      <Captions />
      {withAudio ? <Audio src={staticFile("voiceover.mp3")} /> : null}
    </AbsoluteFill>
  );
}
