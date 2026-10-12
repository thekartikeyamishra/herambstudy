import { ImageResponse } from "next/og";

export const alt = "Heramb.study — Progress, made visible.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Original social-sharing image, generated at build time. */
export default function OpengraphImage() {
  const bars = [
    { label: "Assess", h: 120 },
    { label: "Diagnose", h: 170 },
    { label: "Practise", h: 220 },
    { label: "Verify", h: 270 },
    { label: "Improve", h: 320 },
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0C1121", color: "#fff", padding: 72, fontFamily: "serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#4A3CCE", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, paddingBottom: 12 }}>
              <div style={{ width: 8, height: 14, borderRadius: 4, background: "rgba(255,255,255,0.55)" }} />
              <div style={{ width: 8, height: 24, borderRadius: 4, background: "rgba(255,255,255,0.8)" }} />
              <div style={{ width: 8, height: 20, borderRadius: 4, background: "#fff" }} />
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, display: "flex" }}>
              Heramb<span style={{ color: "rgba(255,255,255,0.5)" }}>.study</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, lineHeight: 1.05, fontWeight: 700, letterSpacing: -2 }}>Progress,</div>
            <div style={{ fontSize: 76, lineHeight: 1.05, fontWeight: 700, letterSpacing: -2, color: "#B7B0F7" }}>made visible.</div>
            <div style={{ marginTop: 24, fontSize: 28, color: "rgba(255,255,255,0.7)", fontFamily: "sans-serif" }}>
              Understand every learner. Make every next step count.
            </div>
          </div>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", fontFamily: "sans-serif" }}>Invite-only early access</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, paddingLeft: 40 }}>
          {bars.map((b, i) => (
            <div key={b.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: 54, height: b.h, borderRadius: 14, background: i === 4 ? "#0D7A68" : `rgba(143,134,242,${0.35 + i * 0.15})` }} />
              <div style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", fontFamily: "sans-serif" }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
