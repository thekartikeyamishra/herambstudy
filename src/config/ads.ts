/**
 * Advertising configuration — DISABLED BY DEFAULT.
 *
 * Ads only become active when ALL of these are true:
 *  - NEXT_PUBLIC_ADSENSE_ENABLED === "true"
 *  - a syntactically valid publisher ID (ca-pub-…) is supplied
 * A slot ID is additionally required for manual in-article units.
 * We never fabricate IDs; invalid values keep ads off.
 */
export type AdsConfig = {
  enabled: boolean;
  clientId: string | null;
  resourceSlot: string | null;
  autoAds: boolean;
};

type AdsEnv = {
  NEXT_PUBLIC_ADSENSE_ENABLED?: string;
  NEXT_PUBLIC_ADSENSE_CLIENT_ID?: string;
  NEXT_PUBLIC_ADSENSE_SLOT_RESOURCE?: string;
  NEXT_PUBLIC_ADSENSE_AUTO_ADS_ENABLED?: string;
};

export function resolveAdsConfig(env: AdsEnv): AdsConfig {
  const clientRaw = (env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "").trim();
  const slotRaw = (env.NEXT_PUBLIC_ADSENSE_SLOT_RESOURCE ?? "").trim();
  const clientId = /^ca-pub-\d{10,20}$/.test(clientRaw) ? clientRaw : null;
  const resourceSlot = /^\d{6,20}$/.test(slotRaw) ? slotRaw : null;
  const enabled = env.NEXT_PUBLIC_ADSENSE_ENABLED === "true" && clientId !== null;
  return {
    enabled,
    clientId: enabled ? clientId : null,
    resourceSlot: enabled ? resourceSlot : null,
    autoAds: enabled && env.NEXT_PUBLIC_ADSENSE_AUTO_ADS_ENABLED === "true",
  };
}

export const adsConfig: AdsConfig = resolveAdsConfig({
  NEXT_PUBLIC_ADSENSE_ENABLED: process.env.NEXT_PUBLIC_ADSENSE_ENABLED,
  NEXT_PUBLIC_ADSENSE_CLIENT_ID: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
  NEXT_PUBLIC_ADSENSE_SLOT_RESOURCE: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESOURCE,
  NEXT_PUBLIC_ADSENSE_AUTO_ADS_ENABLED: process.env.NEXT_PUBLIC_ADSENSE_AUTO_ADS_ENABLED,
});

/**
 * Route prefixes where ads must never render, regardless of configuration.
 * Ads are only ever considered on long-form public resource articles.
 */
export const AD_FORBIDDEN_PREFIXES = [
  "/invite",
  "/contact",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/offline",
  "/pilot",
  "/email",
  "/app",
  "/login",
  "/account",
] as const;

export function isAdAllowedOnPath(pathname: string): boolean {
  if (pathname === "/") return false;
  if (AD_FORBIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  return pathname.startsWith("/resources/");
}
