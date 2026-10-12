/**
 * Content Security Policy builder.
 *
 * Third-party origins are only added when the corresponding integration is
 * configured, so the default launch build ships the tightest policy.
 *
 * Note: script-src keeps 'unsafe-inline' because Next.js App Router emits inline
 * bootstrap scripts and we render JSON-LD inline. Moving to nonces would force
 * every page to render dynamically (no static caching), which hurts performance
 * on low-end devices. This trade-off is documented in docs/SECURITY.md.
 */
export type CspOptions = {
  isDev: boolean;
  analyticsEnabled: boolean;
  adsEnabled: boolean;
};

export function buildCsp({ isDev, analyticsEnabled, adsEnabled }: CspOptions): string {
  const script = ["'self'", "'unsafe-inline'"];
  const img = ["'self'", "data:", "blob:"];
  const connect = ["'self'"];
  const frame: string[] = [];

  if (isDev) script.push("'unsafe-eval'");

  if (analyticsEnabled) {
    script.push("https://www.googletagmanager.com");
    img.push("https://*.google-analytics.com", "https://*.googletagmanager.com");
    connect.push(
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.googletagmanager.com",
    );
  }

  if (adsEnabled) {
    script.push(
      "https://pagead2.googlesyndication.com",
      "https://*.googlesyndication.com",
      "https://*.adtrafficquality.google",
      "https://www.googletagservices.com",
    );
    img.push("https:");
    connect.push("https://*.googlesyndication.com", "https://*.adtrafficquality.google");
    frame.push(
      "https://googleads.g.doubleclick.net",
      "https://tpc.googlesyndication.com",
      "https://*.googlesyndication.com",
      "https://www.google.com",
    );
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": script,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": img,
    "font-src": ["'self'", "data:"],
    "connect-src": connect,
    "frame-src": frame.length ? frame : ["'none'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'"],
  };

  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}
