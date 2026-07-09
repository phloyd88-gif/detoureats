const CACHE_NAME = "detoureats-v2-0-4-road-ahead-rows";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=2.0.4",
  "./data.js?v=2.0.4",
  "./engine.js?v=2.0.4",
  "./review-evidence.js?v=2.0.4",
  "./place-status.js?v=2.0.4",
  "./live-route.js?v=2.0.4",
  "./address-search.js?v=2.0.4",
  "./restaurant-intelligence.js?v=2.0.4",
  "./app.js?v=2.0.4",
  "./manifest.webmanifest?v=2.0.4",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./assets/detoureats-mark.png",
  "./assets/detoureats-wordmark.png",
  "./assets/detoureats-logo-horizontal.png",
  "./assets/detoureats-logo-stacked.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = request.mode === "navigate";
  const isAppAsset =
    isSameOrigin &&
    (isNavigation || /\.(?:css|js|webmanifest|png|svg)$/.test(url.pathname));

  if (isAppAsset) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;
          if (isNavigation) return caches.match("./index.html");
          throw new Error("Offline asset unavailable");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      const existing = clients.find(client => "focus" in client);
      if (existing) return existing.focus();
      return self.clients.openWindow("./");
    })
  );
});
