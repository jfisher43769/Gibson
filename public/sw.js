// Bumping this string ships a byte-changed worker, so every browser detects a new SW,
// installs it, and runs activate() below to purge the previous cache. That is what
// unsticks a device that cached an older build (the "new domain shows the old page" bug).
const CACHE = "gibson-v3";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Page navigations (the HTML shell) must always come from the network, bypassing the
  // browser's HTTP cache — the shell is what points at the current hashed JS bundle, so a
  // stale shell strands the device on an old build even though assets are fresh. Fall back
  // to cache only when genuinely offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/")))
    );
    return;
  }

  // Everything else (hashed assets, images, API): network-first, cache as offline fallback.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
