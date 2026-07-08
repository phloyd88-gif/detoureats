const CACHE_NAME = "detoureats-v1-9-4-route-timing-fallback";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=1.9.4",
  "./data.js?v=1.9.4",
  "./engine.js?v=1.9.4",
  "./review-evidence.js?v=1.9.4",
  "./place-status.js?v=1.9.4",
  "./live-route.js?v=1.9.4",
  "./address-search.js?v=1.9.4",
  "./restaurant-intelligence.js?v=1.9.4",
  "./app.js?v=1.9.4",
  "./manifest.webmanifest?v=1.9.4",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(ASSETS)
    )
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
  const isAppAsset =
    url.origin === self.location.origin &&
    (
      url.pathname.endsWith("/") ||
      url.pathname.endsWith("/index.html") ||
      /\.(?:css|js|webmanifest)$/.test(url.pathname)
    );

  if (isAppAsset) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put(request, copy)
          );
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match("./index.html")
          )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request)
    )
  );
});
