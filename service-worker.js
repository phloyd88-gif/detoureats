const CACHE_NAME = "detoureats-v1-8-2-route-repair";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./engine.js",
  "./live-route.js",
  "./address-search.js",
  "./restaurant-intelligence.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
