import type { Config } from "tailwindcss";

/**
 * Design tokens live as CSS custom properties in src/app/globals.css.
 * Tailwind maps semantic names onto them so components never hard-code hex values.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" } },
    screens: { xs: "400px", sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
    extend: {
      colors: {
        ink: { DEFAULT: "rgb(var(--ink) / <alpha-value>)", soft: "rgb(var(--ink-soft) / <alpha-value>)", muted: "rgb(var(--ink-muted) / <alpha-value>)" },
        paper: { DEFAULT: "rgb(var(--paper) / <alpha-value>)", raised: "rgb(var(--paper-raised) / <alpha-value>)", sunk: "rgb(var(--paper-sunk) / <alpha-value>)" },
        line: { DEFAULT: "rgb(var(--line) / <alpha-value>)", strong: "rgb(var(--line-strong) / <alpha-value>)" },
        brand: { DEFAULT: "rgb(var(--brand) / <alpha-value>)", strong: "rgb(var(--brand-strong) / <alpha-value>)", tint: "rgb(var(--brand-tint) / <alpha-value>)" },
        night: { DEFAULT: "rgb(var(--night) / <alpha-value>)", raised: "rgb(var(--night-raised) / <alpha-value>)" },
        good: { DEFAULT: "rgb(var(--good) / <alpha-value>)", tint: "rgb(var(--good-tint) / <alpha-value>)" },
        warn: { DEFAULT: "rgb(var(--warn) / <alpha-value>)", tint: "rgb(var(--warn-tint) / <alpha-value>)" },
        gap: { DEFAULT: "rgb(var(--gap) / <alpha-value>)", tint: "rgb(var(--gap-tint) / <alpha-value>)" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(2.35rem, 1.6rem + 3.6vw, 4.25rem)", { lineHeight: "1.04", letterSpacing: "-0.025em" }],
        "display-lg": ["clamp(1.9rem, 1.45rem + 2.2vw, 3rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(1.5rem, 1.25rem + 1.2vw, 2.125rem)", { lineHeight: "1.18", letterSpacing: "-0.015em" }],
      },
      borderRadius: { card: "1.25rem", control: "0.75rem" },
      boxShadow: {
        card: "0 1px 0 rgb(var(--ink) / 0.04), 0 1px 3px rgb(var(--ink) / 0.06), 0 12px 32px -16px rgb(var(--ink) / 0.18)",
        lift: "0 2px 0 rgb(var(--ink) / 0.04), 0 24px 48px -24px rgb(var(--ink) / 0.35)",
        focus: "0 0 0 3px rgb(var(--paper)), 0 0 0 5px rgb(var(--brand))",
      },
      maxWidth: { prose: "68ch" },
      transitionTimingFunction: { calm: "cubic-bezier(0.22, 1, 0.36, 1)" },
    },
  },
  plugins: [],
};

export default config;
