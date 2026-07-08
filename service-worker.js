const CACHE_NAME = "detoureats-v1-8-9-hardened-closure-validation";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=1.8.9",
  "./data.js?v=1.8.9",
  "./engine.js?v=1.8.9",
  "./place-status.js?v=1.8.9",
  "./live-route.js?v=1.8.9",
  "./address-search.js?v=1.8.9",
  "./restaurant-intelligence.js?v=1.8.9",
  "./app.js?v=1.8.9",
  "./manifest.webmanifest?v=1.8.9",
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
