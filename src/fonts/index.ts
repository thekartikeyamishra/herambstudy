import localFont from "next/font/local";

/**
 * Self-hosted variable fonts (SIL Open Font License 1.1 — see *-OFL.txt).
 * next/font preloads them and generates size-adjusted fallbacks, which prevents
 * layout shift when the web font replaces the fallback.
 */
export const fontSans = localFont({
  src: "./Inter-Variable-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-sans",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

export const fontDisplay = localFont({
  src: "./Fraunces-Variable-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  fallback: ["Georgia", "Times New Roman", "serif"],
});
