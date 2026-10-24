import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const origin = "https://finlume.test";

function worker(network, initialCache = {}, previousCache = {}) {
  const listeners = {};
  const entries = new Map(Object.entries(initialCache));
  const previousEntries = new Map(Object.entries(previousCache));
  const stores = new Map([["finlume-shell-v6", entries], ["finlume-shell-v5", previousEntries], ["finlume-shell-v4", new Map()], ["other-app-cache", new Map()]]);
  const deleted = [];
  const key = request => new URL(typeof request === "string" ? request : request.url, origin).href;
  const caches = {
    open: async name => ({
      addAll: async () => {},
      put: async (request, response) => stores.get(name).set(key(request), response),
      match: async request => stores.get(name).get(key(request)),
    }),
    keys: async () => [...stores.keys()],
    delete: async name => { deleted.push(name); return stores.delete(name); },
  };
  vm.runInNewContext(source, {
    self: { addEventListener: (type, handler) => { listeners[type] = handler; }, clients: { claim: async () => {} } },
    caches, fetch: network, location: { origin }, URL, Response,
  });
  return {
    entries, previousEntries, stores, deleted,
    async activate() {
      const waits = [];
      listeners.activate({ waitUntil: promise => waits.push(promise) });
      await Promise.all(waits);
    },
    async request(path, options) {
      const waits = [];
      let responsePromise;
      const request = new Request(new URL(path, origin), options?.mode === "navigate" ? { ...options, mode: "cors" } : options);
      if (options?.mode === "navigate") Object.defineProperty(request, "mode", { value: "navigate" });
      listeners.fetch({
        request,
        respondWith: promise => { responsePromise = promise; },
        waitUntil: promise => waits.push(promise),
      });
      assert.ok(responsePromise, "the service worker should handle this request");
      const response = await responsePromise;
      await Promise.all(waits);
      return response;
    },
    handles(path, options) {
      let handled = false;
      listeners.fetch({ request: new Request(new URL(path, origin), options), respondWith: () => { handled = true; } });
      return handled;
    },
  };
}

test("service worker rejects an HTML fallback for a missing JavaScript chunk", async () => {
  const sw = worker(async () => new Response("<html>fallback</html>", {
    status: 200, headers: { "content-type": "text/html; charset=utf-8" },
  }));
  const response = await sw.request("/assets/page-missing.js");
  assert.equal(response.status, 404);
  assert.equal(sw.entries.size, 0);
});

test("service worker rejects cached HTML at an asset URL when offline", async () => {
  const url = `${origin}/assets/page-old.js`;
  const sw = worker(async () => { throw new Error("offline"); }, {
    [url]: new Response("<html>old fallback</html>", { headers: { "content-type": "text/html" } }),
  });
  const response = await sw.request("/assets/page-old.js");
  assert.equal(response.type, "error");
});

test("service worker serves a cached JavaScript chunk when offline", async () => {
  const url = `${origin}/assets/page-cached.js`;
  const sw = worker(async () => { throw new Error("offline"); }, {
    [url]: new Response("export default 1", { headers: { "content-type": "text/javascript" } }),
  });
  const response = await sw.request("/assets/page-cached.js");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "export default 1");
});

test("service worker keeps the previous release's chunk after an upgrade", async () => {
  const url = `${origin}/assets/page-old.js`;
  const sw = worker(async () => new Response("<html>fallback</html>", {
    status: 200, headers: { "content-type": "text/html" },
  }), {}, {
    [url]: new Response("export default 2", { headers: { "content-type": "text/javascript" } }),
  });
  await sw.activate();
  const response = await sw.request("/assets/page-old.js");
  assert.equal(await response.text(), "export default 2");
  assert.equal(sw.previousEntries.size, 1);
  assert.equal(sw.deleted.includes("finlume-shell-v5"), false);
  assert.equal(sw.deleted.includes("finlume-shell-v4"), true);
  assert.equal(sw.deleted.includes("other-app-cache"), false);
});

test("service worker leaves authenticated and non-shell requests alone", () => {
  const sw = worker(async () => new Response("ok"));
  assert.equal(sw.handles("/rest/v1/ledgerly_data"), false);
  assert.equal(sw.handles("/assets/private.json", { headers: { Authorization: "Bearer test" } }), false);
});

test("service worker never caches or serves private asset responses", async () => {
  const url = `${origin}/assets/private.js`;
  const sw = worker(async () => new Response("private data", { headers: { "content-type": "text/javascript", "cache-control": "private, no-store" } }), {
    [url]: new Response("old private data", { headers: { "content-type": "text/javascript", "cache-control": "private" } }),
  });
  assert.equal((await sw.request("/assets/private.js")).status, 200);
  assert.equal((await sw.entries.get(url)).headers.get("cache-control"), "private");
  const offline = worker(async () => { throw new Error("offline"); }, { [url]: sw.entries.get(url) });
  assert.equal((await offline.request("/assets/private.js")).type, "error");
});

test("service worker uses a cached previous chunk when the server returns 404", async () => {
  const url = `${origin}/assets/page-old.js`;
  const sw = worker(async () => new Response(null, { status: 404 }), {}, {
    [url]: new Response("export default 3", { headers: { "content-type": "text/javascript" } }),
  });
  const response = await sw.request("/assets/page-old.js");
  assert.equal(await response.text(), "export default 3");
});

test("offline navigation uses the cached public shell and never intercepts writes", async () => {
  const shell = new Response("<html>FinLume</html>", { headers: { "content-type": "text/html" } });
  const sw = worker(async () => { throw new Error("offline"); }, { [`${origin}/index.html`]: shell });
  const response = await sw.request("/?fin=dashboard", { mode: "navigate" });
  assert.equal(await response.text(), "<html>FinLume</html>");
  assert.equal(sw.handles("/", { method: "POST" }), false);
  assert.equal(sw.handles("/rest/v1/profiles", { headers: { Authorization: "Bearer test" } }), false);
});
