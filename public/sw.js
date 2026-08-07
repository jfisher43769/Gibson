// Bumping this string ships a byte-changed worker, so every browser detects a new SW,
// installs it, and runs activate() below to purge the previous cache. That is what
// unsticks a device that cached an older build (the "new domain shows the old page" bug).
const CACHE = "gibson-v5";

// Filled in at build time by scripts/prerender.mjs with the shell and the hashed bundle,
// which is the only place their real filenames are known. Left empty here so the source
// file stays honest about containing no list of its own.
const PRECACHE = [];

// WHY PRECACHE AT ALL: a freshly registered worker does not control the navigation that
// registered it, so with cache-as-you-go alone the shell and the JS bundle were never
// cached on a first visit — only late subresources were. Anyone who visited once and lost
// signal got a blank page, while a returning visitor was fine. "Works offline" has to mean
// the first visit too, so the install step fetches the shell and bundle up front.
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // Individually, so one failed asset cannot reject the whole install and leave the
      // worker never activating.
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
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

  // /media/ is the download shelf — big one-off images and video meant to be SAVED, not
  // browsed. Leave those requests entirely alone: a service-worker-served response breaks
  // Chrome's download manager on Android (the download re-requests the URL and fails), and
  // cache.put() rejects outright on the 206 partial responses video playback issues. It
  // also has no business putting a 4MB file in the offline cache for an app that works
  // without it. Passing through means the browser handles them exactly as it would with no
  // worker installed.
  if (new URL(req.url).pathname.startsWith("/media/")) return;

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
