/* Battle Legions offline service worker */
const CACHE = "battle-legions-v6-pkg";
const PRECACHE = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = req.url;

  // Never cache/intercept package downloads
  if (
    url.includes("/pkg/") ||
    url.includes("/downloads/") ||
    url.includes("get-apk") ||
    url.includes(".apk") ||
    url.includes("BattleLegions")
  ) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            void caches.open(CACHE).then((c) => c.put("./", clone));
          }
          return res;
        })
        .catch(() => caches.match("./").then((c) => c || Response.error())),
    );
    return;
  }

  if (url.includes("/assets/") || url.endsWith(".css") || url.endsWith(".js")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            void caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.ok && req.url.includes("/cards/")) {
            const clone = res.clone();
            void caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});
