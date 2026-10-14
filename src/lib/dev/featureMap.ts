/**
 * Feature visibility map for the developer hub and docs/TESTING.md.
 * `status()` is evaluated on the server against the current environment, so the
 * hub shows exactly which features are visible right now and why.
 */
import { adsConfig } from "@/config/ads";
import { siteConfig } from "@/config/site";
import { getProvider } from "@/lib/ai/providers";
import { getBackend } from "@/lib/server/backend";
import { emailConfig } from "@/lib/server/email";

export type Status = "on" | "off" | "always" | "planned";

export type FeatureEntry = {
  name: string;
  where: string;
  /** Plain-language condition for when a user sees it. */
  showsWhen: string;
  status: Status;
  /** What this environment is missing, or how to turn it on locally. */
  enable?: string;
};

export type EnvSummary = {
  storage: "firestore" | "memory" | "unavailable";
  email: "resend" | "outbox" | "off";
  emailLinks: boolean;
  ownerAlerts: boolean;
  ai: string;
  analytics: boolean;
  ads: boolean;
  adsPreview: boolean;
  googlePlay: boolean;
  appStore: boolean;
  siteUrl: string;
};

export function envSummary(): EnvSummary {
  const e = emailConfig();
  const p = getProvider();
  return {
    storage: getBackend().kind,
    email: e.outbox ? "outbox" : e.sending ? "resend" : "off",
    emailLinks: e.tokens,
    ownerAlerts: Boolean(e.ownerAlerts) && e.sending,
    ai: p ? `${p.id} · ${p.model}` : "none (rule-based summaries)",
    analytics: /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ""),
    ads: adsConfig.enabled,
    adsPreview: process.env.NEXT_PUBLIC_ADS_PREVIEW === "true",
    googlePlay: Boolean(siteConfig.stores.googlePlay),
    appStore: Boolean(siteConfig.stores.appStore),
    siteUrl: siteConfig.url,
  };
}

const onOff = (on: boolean): Status => (on ? "on" : "off");

export function featureMap(env: EnvSummary = envSummary()): FeatureEntry[] {
  const storageOn = env.storage !== "unavailable";
  return [
    { name: "Class test analyser", where: "/resources/class-test-analyser", showsWhen: "Always.", status: "always" },
    { name: "Teaching plan, gap map, reteach CSV, printed student reports", where: "/resources/class-test-analyser", showsWhen: "After a successful “Analyse class”.", status: "always" },
    { name: "Follow-up check (gaps closed)", where: "/resources/class-test-analyser", showsWhen: "After analysing → “Compare with a follow-up test”.", status: "always" },
    { name: "Student report links", where: "/resources/class-test-analyser", showsWhen: "After analysing → “Create student report links” → fill institute, test, date.", status: "always" },
    { name: "Save to tracker", where: "/resources/class-test-analyser", showsWhen: "After analysing. Hidden in private browsing (no local storage).", status: "always" },
    {
      name: "Teaching summary + parent note",
      where: "/resources/class-test-analyser",
      showsWhen: "After analysing → “Write my summary”. Uses AI when a provider is configured, otherwise instant rule-based text.",
      status: env.ai.startsWith("none") ? "off" : "on",
      enable: "Rule-based summary always works. To test the AI path for free: AI_PROVIDER=mock (AI_MOCK_MODE=ok|fail|garbage|slow).",
    },
    { name: "Class progress tracker", where: "/tracker", showsWhen: "Always. Trends need 1 test; “repeating gaps” and “since previous test” need 2+ tests.", status: "always" },
    { name: "Student term reports", where: "/tracker", showsWhen: "Inside a class that has at least one test.", status: "always" },
    { name: "Student report page", where: "/r#…", showsWhen: "Only by opening a link a teacher created. Never in navigation or search.", status: "always" },
    { name: "My progress (student)", where: "/me", showsWhen: "Always reachable; shows data after a student saves a report.", status: "always" },
    { name: "Other free tools", where: "/resources", showsWhen: "Always.", status: "always" },
    { name: "Invite / pilot / contact forms (saving)", where: "/invite, /pilot, /contact", showsWhen: "Forms always show; submissions succeed only with storage.", status: onOff(storageOn), enable: "DEV_MEMORY_STORE=true (dev) or Firebase Admin credentials." },
    { name: "Invite acknowledgement email", where: "email", showsWhen: "First invite request from a new address, when email is configured.", status: onOff(env.email !== "off"), enable: "EMAIL_DEV_OUTBOX=true captures emails in this hub instead of sending." },
    { name: "Confirm / unsubscribe pages", where: "/email/confirm, /email/unsubscribe", showsWhen: "Opened from email links; work only when links are signed.", status: onOff(env.emailLinks), enable: "EMAIL_TOKEN_SECRET (32+ characters)." },
    { name: "Pilot alert to owner", where: "email", showsWhen: "Each pilot application, when email + OWNER_NOTIFICATION_EMAIL are set.", status: onOff(env.ownerAlerts), enable: "OWNER_NOTIFICATION_EMAIL plus email (outbox in dev)." },
    { name: "Analytics consent banner", where: "Every public page (not /r, /me, /dev)", showsWhen: "GA4 ID set and the visitor hasn't chosen yet.", status: onOff(env.analytics), enable: "NEXT_PUBLIC_GA_MEASUREMENT_ID=G-…; reset consent below to see it again." },
    { name: "Advertisement slot", where: "/resources/<article> only", showsWhen: "AdSense enabled with real IDs + visitor consent.", status: onOff(env.ads), enable: env.adsPreview ? "Preview is ON (dashed box, no Google script)." : "NEXT_PUBLIC_ADS_PREVIEW=true shows a placeholder in dev only." },
    { name: "Store badges as real links", where: "Footer, /for-students", showsWhen: "Store URLs configured; otherwise “Coming soon” buttons.", status: onOff(env.googlePlay || env.appStore), enable: "NEXT_PUBLIC_GOOGLE_PLAY_URL / NEXT_PUBLIC_APP_STORE_URL (https)." },
    { name: "“Install Web App” button", where: "Footer, /for-students, /r", showsWhen: "Production build only (service worker), in Chrome/Edge; iPhone shows “Add to Home Screen” help.", status: "off", enable: "Run `npm run build && npm start`, open in Chrome." },
    { name: "Offline page", where: "/offline", showsWhen: "Production build, after one visit, when offline on an uncached page.", status: "off", enable: "Production build + DevTools → Network → Offline." },
    { name: "Plans & pricing", where: "/pricing", showsWhen: "Always (footer link). AI line reflects provider status.", status: "always" },
    { name: "Error page", where: "any", showsWhen: "When a page crashes.", status: "always", enable: "Visit /dev/crash (dev only)." },
    { name: "404 page", where: "any unknown URL", showsWhen: "Unknown address.", status: "always" },
    { name: "Cloud history, multi-teacher, principal dashboard, parent delivery, question bank, multi-branch", where: "—", showsWhen: "Not built. Shown only as “Planned” on /pricing and /guide.", status: "planned" },
    { name: "Payments (Razorpay / PayPal)", where: "—", showsWhen: "Not implemented; adapter boundary only (src/config/payments.ts).", status: "planned" },
  ];
}
