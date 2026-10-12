/* Heramb.study service worker.
 * Purpose: fast repeat visits and offline reading of pages already visited.
 * - Never caches API responses, form submissions or cross-origin requests.
 * - Navigations: network first, falling back to the cached page, then /offline.
 * - Hashed build assets (/_next/static) and icons: cache first (immutable).
 * Bump VERSION to invalidate all caches on the next deploy.
 */
const VERSION = "v1";
const STATIC_CACHE = `heramb-static-${VERSION}`;
const PAGE_CACHE = `heramb-pages-${VERSION}`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon.svg"];
const MAX_PAGES = 40;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("heramb-") && k !== STATIC_CACHE && k !== PAGE_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  // React Server Component payloads are tied to a specific build — let the network handle them.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok && response.type === "basic") {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(request, response.clone()).then(() => trimCache(PAGE_CACHE, MAX_PAGES));
          }
          return response;
        } catch {
          const cached = await caches.match(request, { ignoreSearch: true });
          return cached || (await caches.match("/offline")) || Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(?:woff2?|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
  }
});
