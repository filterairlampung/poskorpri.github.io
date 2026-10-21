const CACHE_NAME = "pos-alkautsar-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  const reqUrl = new URL(event.request.url);

  // Jangan pernah melakukan cache untuk request API ke Google Apps Script
  if (reqUrl.hostname.includes("script.google.com") || reqUrl.hostname.includes("googleusercontent.com")) {
    return;
  }

  // Strategi Network-First dengan Fallback ke Cache untuk file aplikasi
  event.respondWith(
    fetch(event.request)
      .then(function (networkResponse) {
        if (event.request.method === "GET" && networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});