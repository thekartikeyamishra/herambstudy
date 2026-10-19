/**
 * DEVELOPER TOOLS ONLY. Imported exclusively by *.dev.ts(x) routes, which are not
 * compiled into production builds (see src/config/devtools.ts).
 */
import { adsConfig } from "@/config/ads";
import { devToolsEnabled } from "@/config/devtools";
import { siteConfig } from "@/config/site";
import { getProvider } from "@/lib/ai/providers";
import { getBackend } from "./backend";
import { clearDevOutbox, devOutbox, emailConfig } from "./email";
import type { MemoryContactStore, MemoryInviteStore, MemoryPilotStore, MemoryRateLimiter } from "./memoryBackend";

type MemoryBundle = { invites: MemoryInviteStore; contacts: MemoryContactStore; pilots: MemoryPilotStore; limiter: MemoryRateLimiter };
const g = globalThis as typeof globalThis & {
  __herambMemory?: MemoryBundle;
  __herambEdgeLimiter?: MemoryRateLimiter;
  __herambAiCache?: Map<string, unknown>;
};

export type EnvItem = { key: string; label: string; state: "on" | "off" | "dev"; detail: string; howToChange: string };

/** What is switched on in THIS environment — never returns secret values. */
export function environmentStatus(): EnvItem[] {
  const backend = getBackend();
  const email = emailConfig();
  const ai = getProvider();
  const ga = /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "");
  return [
    { key: "mode", label: "Build mode", state: process.env.NODE_ENV === "development" ? "dev" : "on", detail: `${process.env.NODE_ENV}${process.env.VERCEL_ENV ? ` · Vercel ${process.env.VERCEL_ENV}` : ""}`, howToChange: "`npm run dev` for development; `npm run build && npm start` to test the production build." },
    { key: "storage", label: "Form storage", state: backend.kind === "firestore" ? "on" : backend.kind === "memory" ? "dev" : "off", detail: backend.kind === "firestore" ? "Cloud Firestore" : backend.kind === "memory" ? "In memory (lost on restart)" : "None — forms answer 503 “nothing was saved”", howToChange: "DEV_MEMORY_STORE=true for local testing; Firebase variables for real storage." },
    { key: "email", label: "Email", state: email.sending ? "on" : email.devOutbox ? "dev" : "off", detail: email.sending ? `Sending via Resend from ${email.from}` : email.devOutbox ? "Captured in the dev inbox below (nothing is sent)" : "Off — no emails", howToChange: "RESEND_API_KEY + EMAIL_FROM to send for real." },
    { key: "links", label: "Confirm / unsubscribe links", state: email.tokens ? ((process.env.EMAIL_TOKEN_SECRET ?? "").length >= 32 ? "on" : "dev") : "off", detail: email.tokens ? ((process.env.EMAIL_TOKEN_SECRET ?? "").length >= 32 ? "Signed with EMAIL_TOKEN_SECRET" : "Signed with the dev-only secret") : "Off", howToChange: "EMAIL_TOKEN_SECRET (32+ random characters)." },
    { key: "owner", label: "Pilot alerts to owner", state: email.ownerAlerts ? "on" : email.devOutbox ? "dev" : "off", detail: email.ownerAlerts ?? (email.devOutbox ? "Captured as owner@dev.local" : "Off"), howToChange: "OWNER_NOTIFICATION_EMAIL." },
    { key: "ai", label: "AI teaching summary", state: ai ? "on" : "off", detail: ai ? `${ai.id} · ${ai.model}` : "Rule-based summary only (free, instant)", howToChange: "AI_PROVIDER + AI_API_KEY (+ AI_MODEL)." },
    { key: "ga", label: "Google Analytics + consent banner", state: ga ? "on" : "off", detail: ga ? "Loads after consent" : "Off — no banner, no scripts", howToChange: "NEXT_PUBLIC_GA_MEASUREMENT_ID=G-…" },
    { key: "ads", label: "AdSense", state: adsConfig.enabled ? "on" : "off", detail: adsConfig.enabled ? `Client ${adsConfig.clientId}` : "Off (correct until approved)", howToChange: "NEXT_PUBLIC_ADSENSE_* — only after approval." },
    { key: "stores", label: "App store badges", state: siteConfig.stores.googlePlay || siteConfig.stores.appStore ? "on" : "off", detail: siteConfig.stores.googlePlay || siteConfig.stores.appStore ? "Real links" : "“Coming soon” (not clickable)", howToChange: "NEXT_PUBLIC_GOOGLE_PLAY_URL / NEXT_PUBLIC_APP_STORE_URL." },
    { key: "operator", label: "Operator name on legal pages", state: siteConfig.operatorName ? "on" : "off", detail: siteConfig.operatorName ?? "Placeholder shown", howToChange: "NEXT_PUBLIC_OPERATOR_NAME." },
    { key: "contact", label: "Public contact email", state: siteConfig.contactEmail ? "on" : "off", detail: siteConfig.contactEmail ?? "Contact form only", howToChange: "NEXT_PUBLIC_CONTACT_EMAIL." },
    { key: "site", label: "Site URL", state: siteConfig.url.startsWith("https://") ? "on" : "dev", detail: `${siteConfig.url}${siteConfig.url.startsWith("https://") ? "" : " — robots.txt blocks indexing"}`, howToChange: "NEXT_PUBLIC_SITE_URL." },
  ];
}

export function devSnapshot() {
  if (!devToolsEnabled()) return null;
  const backend = getBackend();
  const mem = g.__herambMemory;
  return {
    storage: backend.kind,
    invites: mem ? [...mem.invites.records.values()] : [],
    contacts: mem ? mem.contacts.records : [],
    pilots: mem ? mem.pilots.records : [],
    outbox: devOutbox(),
    environment: environmentStatus(),
  };
}

/** Clears in-memory submissions, the dev inbox, rate limits and the AI cache. */
export function devReset(): boolean {
  if (!devToolsEnabled()) return false;
  g.__herambMemory = undefined;
  g.__herambEdgeLimiter = undefined;
  g.__herambAiCache = new Map();
  clearDevOutbox();
  return true;
}
