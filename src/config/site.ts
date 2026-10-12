/**
 * Public, build-time site configuration.
 * Every value here is safe to ship to the browser. NEXT_PUBLIC_* variables must be
 * referenced literally so Next.js can inline them at build time.
 */

function cleanUrl(value: string | undefined, fallback: string): string {
  const v = (value ?? "").trim().replace(/\/+$/, "");
  return v.length > 0 ? v : fallback;
}

function optionalHttpsUrl(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function optionalEmail(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Heramb.study",
  acronym: "HERAMB",
  acronymExpansion: "Holistic Education, Results, Assessment, Mentorship & Betterment",
  tagline: "Progress, made visible.",
  supportingLine: "Understand every learner. Make every next step count.",
  proposition:
    "Understand where students struggle. Help them practise what matters. Make learning progress visible.",
  description:
    "Heramb.study helps coaching institutes and teachers see where each student struggles, assign targeted practice, and track verified progress. Invite-only early access.",
  url: cleanUrl(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"),
  locale: "en_IN",
  operatorName: process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || null,
  contactEmail: optionalEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  social: {
    linkedin: optionalHttpsUrl(process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN),
    x: optionalHttpsUrl(process.env.NEXT_PUBLIC_SOCIAL_X),
    instagram: optionalHttpsUrl(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM),
  },
  stores: {
    googlePlay: optionalHttpsUrl(process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL),
    appStore: optionalHttpsUrl(process.env.NEXT_PUBLIC_APP_STORE_URL),
  },
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || null,
  /** Legal documents are drafts until reviewed by a qualified lawyer. */
  legalLastUpdated: "2026-10-12",
} as const;

export const mainNav = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-institutes", label: "For institutes" },
  { href: "/for-students", label: "For students" },
  { href: "/resources", label: "Free resources" },
  { href: "/trust", label: "Our approach" },
] as const;

export const footerNav = {
  product: [
    { href: "/how-it-works", label: "How it works" },
    { href: "/for-institutes", label: "For institutes" },
    { href: "/for-students", label: "For students" },
    { href: "/invite", label: "Request an invite" },
    { href: "/pilot", label: "Institute pilot" },
  ],
  resources: [
    { href: "/resources", label: "All resources" },
    { href: "/resources/class-test-analyser", label: "Class test analyser" },
    { href: "/resources/assessment-readiness-diagnostic", label: "Readiness diagnostic" },
    { href: "/resources/learning-gap-analysis", label: "Learning-gap analysis" },
    { href: "/resources/student-progress-report-template", label: "Progress report template" },
  ],
  company: [
    { href: "/about", label: "About" },
    { href: "/trust", label: "Our approach" },
    { href: "/contact", label: "Contact" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy policy" },
    { href: "/terms", label: "Terms of service" },
    { href: "/refund-policy", label: "Refund policy" },
  ],
} as const;

export function absoluteUrl(path = "/"): string {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
