/// <reference lib="webworker" />
export {};
declare const self: ServiceWorkerGlobalScope;

const BUILD_ID = (self as any).BUILD_ID || "0";
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

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(prefetchAssets());
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await cleanupOldCaches();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("periodicsync", (event: any) => {
  if (event.tag === "content-sync") {
    event.waitUntil(prefetchAssets());
  }
});

self.addEventListener("message", (event: any) => {
  if (event.data && event.data.type === "refresh") {
    event.waitUntil(prefetchAssets());
  }
});

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/apps/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await cache.match(request);
          return cached ?? new Response(undefined, { status: 504 });
        }
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match("/offline.html")) || new Response("Offline", { status: 503 }),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
