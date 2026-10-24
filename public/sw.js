const CACHE_PREFIX = "finlume-shell-";
const CACHE = "finlume-shell-v6";
const PREVIOUS_CACHE = "finlume-shell-v5";
const SHELL = ["/", "/index.html", "/manifest.json"];
const isHtml = (response) => response.headers.get("content-type")?.toLowerCase().includes("text/html");
const isPrivate = (response) => /(?:^|,|\s)(?:private|no-store|no-cache)(?:=|,|\s|$)/i.test(response.headers.get("cache-control") || "") || response.headers.has("set-cookie");

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE && key !== PREVIOUS_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

async function cachedResponse(request, isAsset) {
  const current = await caches.open(CACHE);
  const found = await current.match(request) || (isAsset ? await (await caches.open(PREVIOUS_CACHE)).match(request) : null);
  return found && !isPrivate(found) && !(isAsset && isHtml(found)) ? found : null;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin || event.request.headers.has("authorization")) return;
  const isShell = url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/manifest.json";
  const isAsset = url.pathname.startsWith("/assets/");
  if (!isShell && !isAsset) return;

  event.respondWith(fetch(event.request).then((response) => {
    if (isAsset && (isHtml(response) || !response.ok)) return cachedResponse(event.request, true).then((cached) => cached || (isHtml(response) ? new Response(null, { status: 404, statusText: "Asset unavailable" }) : response));
    if (response.ok && !isPrivate(response)) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
    }
    return response;
  }).catch(async () => {
    const cached = await cachedResponse(event.request, isAsset);
    if (cached) return cached;
    if (event.request.mode === "navigate") return (await cachedResponse("/index.html", false)) || Response.error();
    return Response.error();
  }));
});
