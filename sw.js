// FinLume service worker — minimal app-shell cache so the app can
// install to homescreen and reload without a network round-trip.
// It does NOT cache API/Supabase calls — those always go to the network,
// so data stays live. Bump CACHE_NAME whenever index.html changes
// significantly to force clients to pick up the new shell.
const CACHE_NAME = "finlume-shell-v1";
const SHELL_FILES = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for the shell itself.
  // Everything else (Supabase, CDN scripts, APIs) goes straight to network
  // untouched, so auth/session/data are always fresh.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }
  if (!SHELL_FILES.some((f) => url.pathname.endsWith(f.replace("./", "")))) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
