/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

const BUILD_ID = (sw as any).BUILD_ID || "0";
const CACHE_NAME = `KLP_v${BUILD_ID}-periodic-cache-v1`;

const ASSETS = [
  "/apps/weather.js",
  "/feeds",
  "/about",
  "/projects",
  "/projects.json",
  "/apps",
  "/apps/weather",
  "/apps/terminal",
  "/apps/checkers",
  "/offline.html",
  "/offline.css",
  "/offline.js",
  "/manifest.webmanifest",
];

async function prefetchAssets(): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    ASSETS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-cache" });
        if (response.ok) {
          await cache.put(url, response.clone());
        }
      } catch {
        // Ignore individual failures
      }
    }),
  );
}

async function cleanupOldCaches(): Promise<void> {
  const keys = await caches.keys();
  const appCaches = keys.filter((name) => name.startsWith("KLP_v"));
  const old = appCaches.sort().slice(0, -2);
  await Promise.all(old.map((name) => caches.delete(name)));
}

sw.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(prefetchAssets());
});

sw.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await cleanupOldCaches();
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener("periodicsync", (event: any) => {
  if (event.tag === "content-sync") {
    event.waitUntil(prefetchAssets());
  }
});

sw.addEventListener("message", (event: any) => {
  if (event.data && event.data.type === "refresh") {
    event.waitUntil(prefetchAssets());
  }
});

sw.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/apps/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return (await cache.match(request)) || Response.error();
        }
      })(),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html") as Promise<Response>),
    );
    return;
  }

  event.respondWith(
    (async () => (await caches.match(request)) || fetch(request))(),
  );
});
